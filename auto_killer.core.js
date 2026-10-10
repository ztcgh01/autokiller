/*
 * AUTO_KILLER production rollback shim
 * Restores the exact stable 2.25.5.9 core from commit 6ecb46d67ca85f4060c47d5d6d29fa5c8c925520.
 */
(function () {
  'use strict';

  const STABLE_CORE_URL = 'https://raw.githubusercontent.com/ztcgh01/autokiller/6ecb46d67ca85f4060c47d5d6d29fa5c8c925520/auto_killer.core.js';

  // Satisfy the installed loader's synchronous load check while the stable core is restored.
  window.__AUTO_KILLER_REMOTE_CORE_LOADED__ = true;
  window.__AUTO_KILLER_REMOTE_CORE_VERSION__ = '2.25.5.9';

  fetch(STABLE_CORE_URL + '?rollback=' + Date.now(), { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Rollback core HTTP ' + response.status);
      return response.text();
    })
    .then(source => {
      const run = new Function(
        'window',
        'globalThis',
        'document',
        'GM',
        'GM_info',
        source + '\n//# sourceURL=' + STABLE_CORE_URL
      );
      run.call(
        window,
        window,
        window,
        document,
        typeof GM === 'object' ? GM : null,
        typeof GM_info === 'object' ? GM_info : null
      );
    })
    .catch(error => {
      console.error('[AUTO_KILLER Rollback] 2.25.5.9 core load failed', error);
      alert('AUTO_KILLER 2.25.5.9 롤백 코어 로드 실패: ' + (error?.message || error));
    });
})();
