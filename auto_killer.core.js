/*
 * AUTO_KILLER production rollback shim
 * Restores the exact stable 2.25.5.9 core from commit 6ecb46d67ca85f4060c47d5d6d29fa5c8c925520.
 */
(function () {
  'use strict';

  const STABLE_CORE_URL = 'https://cdn.jsdelivr.net/gh/ztcgh01/autokiller@6ecb46d67ca85f4060c47d5d6d29fa5c8c925520/auto_killer.core.js';

  // The installed loader already loads this shim as a privileged userscript resource.
  // Use the same proven script transport used by the stable Android loader path.
  window.__AUTO_KILLER_REMOTE_CORE_LOADED__ = true;
  window.__AUTO_KILLER_REMOTE_CORE_VERSION__ = '2.25.5.9';

  const script = document.createElement('script');
  script.src = STABLE_CORE_URL + '?rollback=' + Date.now();
  script.async = false;
  script.dataset.autoKillerRollbackCore = '2.25.5.9';
  script.addEventListener('load', () => {
    try { script.remove(); } catch (error) {}
  }, { once: true });
  script.addEventListener('error', () => {
    try { script.remove(); } catch (error) {}
    console.error('[AUTO_KILLER Rollback] 2.25.5.9 pinned core script load failed');
    alert('AUTO_KILLER 2.25.5.9 롤백 코어 로드 실패');
  }, { once: true });
  (document.head || document.documentElement).appendChild(script);
})();
