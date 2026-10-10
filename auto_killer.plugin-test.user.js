// ==UserScript==
// @name         AUTO_KILLER Plugin Migration Test
// @namespace    local.zeta.gpt.oneclick.plugin-test
// @version      3.0.0-alpha.12
// @description  production 2.25.5.9 로더 구조 기반 플러그인 3.0 테스트 로더. alpha.11 검증 게이트 제거 및 ZETA 복귀 코어를 고정 로드합니다.
// @downloadURL  https://cdn.jsdelivr.net/gh/ztcgh01/autokiller@plugin-migration-3.0/auto_killer.plugin-test.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/ztcgh01/autokiller@plugin-migration-3.0/auto_killer.plugin-test.user.js
// @match        https://*.zeta-ai.io/*
// @match        https://zeta-ai.io/*
// @match        https://chatgpt.com/*
// @match        https://*.chatgpt.com/*
// @run-at       document-start
// @inject-into  content
// @noframes
// @connect      github.io
// @connect      github.com
// @connect      raw.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @connect      *
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.xmlHttpRequest
// @grant        GM.info
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // 설치된 로더와 같은 온라인 폴더의 코어를 자동으로 찾습니다.
  // iPhone Userscripts처럼 설치 주소를 제공하지 않는 환경에서는 배포자가 지정한 주소를 사용합니다.
  const FALLBACK_CORE_URL = 'https://cdn.jsdelivr.net/gh/ztcgh01/autokiller@f4a27de9463b3ee3392550133a31d65e81b1b5a8/auto_killer.core.js';
  const CORE_URL = FALLBACK_CORE_URL;
  const LOADER_VERSION = '3.0.0-alpha.12';
  const pageWindow = typeof unsafeWindow === 'object' ? unsafeWindow : window;
  const legacyLoaderInfo = typeof GM_info === 'object' && GM_info ? GM_info : null;
  const modernLoaderInfo = typeof GM === 'object' && GM && typeof GM.info === 'object' ? GM.info : null;
  const LOADER_SCRIPT_HANDLER = legacyLoaderInfo?.scriptHandler || modernLoaderInfo?.scriptHandler || 'unknown';

  function publishLoaderMetadata() {
    try {
      pageWindow.__AUTO_KILLER_LOADER_VERSION__ = LOADER_VERSION;
      pageWindow.__AUTO_KILLER_CORE_URL__ = CORE_URL;
      pageWindow.__AUTO_KILLER_SCRIPT_HANDLER__ = LOADER_SCRIPT_HANDLER;
    } catch (error) {}

    try {
      const dataset = document.documentElement?.dataset;
      if (dataset) {
        dataset.autoKillerLoaderVersion = LOADER_VERSION;
        dataset.autoKillerCoreUrl = CORE_URL;
        dataset.autoKillerScriptHandler = LOADER_SCRIPT_HANDLER;
      }
    } catch (error) {}
  }

  publishLoaderMetadata();
  const ANDROID_DEVICE = /Android/i.test(navigator.userAgent);
  const IOS_DEVICE = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const STORAGE_REQUEST_EVENT = '__AUTO_KILLER_GM_REQUEST_V1__';
  const STORAGE_RESPONSE_EVENT = '__AUTO_KILLER_GM_RESPONSE_V1__';
  const DIAGNOSTIC_KEY = 'zk_diagnostic_state_v1';
  const DIAGNOSTIC_MAX_EVENTS = 220;
  let loaderDiagnosticState = null;
  let loaderDiagnosticQueue = Promise.resolve();

  function resolveCoreUrl() {
    const legacyInfo = typeof GM_info === 'object' && GM_info ? GM_info : null;
    const modernInfo = typeof GM === 'object' && GM && typeof GM.info === 'object' ? GM.info : null;
    const candidates = [
      legacyInfo?.script?.downloadURL,
      legacyInfo?.script?.updateURL,
      legacyInfo?.scriptDownloadURL,
      legacyInfo?.scriptUpdateURL,
      modernInfo?.script?.downloadURL,
      modernInfo?.script?.updateURL,
      modernInfo?.scriptDownloadURL,
      modernInfo?.scriptUpdateURL
    ];

    for (const candidate of candidates) {
      if (!/^https:\/\//i.test(String(candidate || ''))) continue;
      try {
        const url = new URL(candidate);

        // GitHub의 파일 보기 주소로 설치한 경우에도 raw 주소로 바꿉니다.
        if (url.hostname === 'github.com') {
          const parts = url.pathname.split('/').filter(Boolean);
          const blobIndex = parts.indexOf('blob');
          if (blobIndex === 2 && parts.length > 3) {
            url.hostname = 'raw.githubusercontent.com';
            url.pathname = '/' + [parts[0], parts[1], ...parts.slice(3, -1), 'auto_killer.core.js'].join('/');
          } else {
            continue;
          }
        } else {
          url.pathname = url.pathname.replace(/[^/]*$/, 'auto_killer.core.js');
        }

        url.search = '';
        url.hash = '';
        return url.href;
      } catch (error) {}
    }

    return FALLBACK_CORE_URL;
  }

  async function gmSet(key, value) {
    if (typeof GM === 'object' && typeof GM.setValue === 'function') return GM.setValue(key, value);
    if (typeof GM_setValue === 'function') return GM_setValue(key, value);
    throw new Error('GM 저장 기능을 찾지 못했습니다.');
  }

  async function gmGet(key, fallback = null) {
    if (typeof GM === 'object' && typeof GM.getValue === 'function') return GM.getValue(key, fallback);
    if (typeof GM_getValue === 'function') {
      const value = GM_getValue(key, fallback);
      return value === undefined ? fallback : value;
    }
    return fallback;
  }

  async function gmDelete(key) {
    if (typeof GM === 'object' && typeof GM.deleteValue === 'function') return GM.deleteValue(key);
    if (typeof GM_deleteValue === 'function') return GM_deleteValue(key);
  }

  function loaderPageKind() {
    const host = String(location.hostname || '').toLowerCase();
    const path = String(location.pathname || '');
    if (host === 'zeta-ai.io' || host.endsWith('.zeta-ai.io')) return 'zeta';
    if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) {
      if (path.includes('/g/')) return 'chatgpt-custom-gpt';
      if (path.includes('/c/')) return 'chatgpt-conversation';
      return 'chatgpt';
    }
    return 'other';
  }

  function loaderSanitize(value, maxLength = 220) {
    let text = String(value == null ? '' : value);
    text = text.replace(/[A-Za-z0-9_-]{48,}/g, '[long-id]');
    return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
  }

  function loaderSafeCoreSource() {
    try {
      const url = new URL(CORE_URL);
      url.search = '';
      url.hash = '';
      return url.origin + url.pathname;
    } catch (error) {
      return 'unknown';
    }
  }

  function loaderSafeError(error) {
    return {
      errorName: loaderSanitize(error?.name || 'Error', 80),
      errorMessage: loaderSanitize(error?.message || String(error || ''), 220)
    };
  }

  function loaderDiagnosticEnabled(state = loaderDiagnosticState) {
    return !!state?.enabled && (!state.expiresAt || Date.now() < Number(state.expiresAt));
  }

  function loaderEventId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  async function loaderDiagnosticInit() {
    try {
      const state = await gmGet(DIAGNOSTIC_KEY, null);
      loaderDiagnosticState = loaderDiagnosticEnabled(state) ? state : null;
    } catch (error) {
      loaderDiagnosticState = null;
    }
    return !!loaderDiagnosticState;
  }

  function loaderDiagnosticLog(stage, detail = {}) {
    if (!loaderDiagnosticEnabled()) return Promise.resolve();

    const event = {
      id: loaderEventId(),
      at: Date.now(),
      page: loaderPageKind(),
      stage: loaderSanitize(stage, 100),
      detail: detail && typeof detail === 'object' ? detail : { value: loaderSanitize(detail) }
    };

    loaderDiagnosticQueue = loaderDiagnosticQueue.catch(() => {}).then(async () => {
      const latest = await gmGet(DIAGNOSTIC_KEY, null);
      if (!loaderDiagnosticEnabled(latest) || latest.sessionId !== loaderDiagnosticState.sessionId) return;

      const events = Array.isArray(latest.events) ? latest.events.slice() : [];
      const seen = new Set(events.map(item => item?.id).filter(Boolean));
      if (!seen.has(event.id)) events.push(event);
      latest.events = events.slice(-DIAGNOSTIC_MAX_EVENTS);
      latest.lastStage = event.stage;
      latest.updatedAt = Date.now();
      await gmSet(DIAGNOSTIC_KEY, latest);
      loaderDiagnosticState = latest;
    }).catch(error => console.warn('[AUTO_KILLER Loader Diagnostic] 기록 실패', error));

    return loaderDiagnosticQueue;
  }

  async function loaderDiagnosticFlush() {
    try { await loaderDiagnosticQueue; } catch (error) {}
  }

  function loaderDiagnosticReportFromState(state = loaderDiagnosticState) {
    if (!state) {
      return 'AUTO_KILLER LOADER DIAGNOSTIC REPORT\nNo diagnostic session is stored.';
    }

    const lines = [
      'AUTO_KILLER LOADER DIAGNOSTIC REPORT',
      '======================================',
      'Loader version: ' + LOADER_VERSION,
      'Core source: ' + loaderSafeCoreSource(),
      'Page kind: ' + loaderPageKind(),
      'User agent: ' + loaderSanitize(navigator.userAgent, 260),
      'Session ID: ' + loaderSanitize(state.sessionId || '-', 80),
      'Last stage: ' + loaderSanitize(state.lastStage || '-', 100),
      '',
      'PRIVACY',
      '- ZETA chat text: NOT COLLECTED',
      '- Prompt text: NOT COLLECTED',
      '- GPT response text: NOT COLLECTED',
      '- Login/cookie/token data: NOT COLLECTED',
      '',
      'EVENT LOG'
    ];

    (Array.isArray(state.events) ? state.events : []).forEach((event, index) => {
      lines.push(
        '[' + String(index + 1).padStart(3, '0') + '] ' +
        new Date(Number(event.at || Date.now())).toISOString() + ' | ' +
        loaderSanitize(event.page || '-', 60) + ' | ' +
        loaderSanitize(event.stage || '-', 100) + ' | ' +
        JSON.stringify(event.detail || {})
      );
    });

    return lines.join('\n');
  }

  async function loaderDiagnosticReport() {
    await loaderDiagnosticFlush();
    let state = loaderDiagnosticState;
    try {
      const stored = await gmGet(DIAGNOSTIC_KEY, null);
      if (stored) state = stored;
    } catch (error) {}
    return loaderDiagnosticReportFromState(state);
  }

  async function loaderCopyDiagnosticReport() {
    const report = await loaderDiagnosticReport();

    try {
      await navigator.clipboard.writeText(report);
      return true;
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = report;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return !!ok;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  function loaderSaveDiagnosticTxt() {
    const report = loaderDiagnosticReportFromState(loaderDiagnosticState);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'AUTO_KILLER_LOADER_DIAG_' + stamp + '.txt';
    const file = new File([report], filename, { type: 'text/plain;charset=utf-8' });
    const iosLike = IOS_DEVICE;

    if (iosLike && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      try {
        if (navigator.canShare({ files: [file] })) {
          Promise.resolve(navigator.share({ files: [file], title: 'AUTO_KILLER 로더 진단 결과' }))
            .catch(error => {
              if (error?.name !== 'AbortError') console.warn('[AUTO_KILLER Loader Diagnostic] 공유 저장 실패', error);
            });
          return { ok: true, method: 'share-sheet' };
        }
      } catch (error) {}
    }

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      return { ok: true, method: 'download' };
    } catch (error) {
      try {
        const opened = window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return { ok: !!opened, method: opened ? 'open-fallback' : 'failed' };
      } catch (openError) {
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        return { ok: false, method: 'failed' };
      }
    }
  }

  async function showLoaderDiagnosticFallback(error) {
    if (!loaderDiagnosticEnabled()) return;

    while (!document.body) await new Promise(resolve => setTimeout(resolve, 50));
    if (document.getElementById('auto-killer-loader-diag-fallback')) return;

    const box = document.createElement('div');
    box.id = 'auto-killer-loader-diag-fallback';
    box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:min(330px,calc(100vw - 24px));box-sizing:border-box;padding:10px;border:1px solid #d9a6a6;border-radius:10px;background:#fff;color:#4b5563;box-shadow:0 10px 28px rgba(31,41,55,.25);font:600 11px/1.45 system-ui,sans-serif';

    const title = document.createElement('div');
    title.textContent = 'AUTO_KILLER 코어 로드 오류 · 진단 기록 있음';
    title.style.cssText = 'font-weight:800;color:#7a3333;margin-bottom:6px';

    const info = document.createElement('div');
    info.textContent = '진단 모드가 켜져 있어 로더 단계 기록을 보존했습니다. 아래에서 복사하거나 TXT로 저장해 전달해주세요.';
    info.style.cssText = 'margin-bottom:8px';

    const errorLine = document.createElement('div');
    errorLine.textContent = '오류: ' + loaderSanitize(error?.name || 'Error', 60) + ' / ' + loaderSanitize(error?.message || '', 140);
    errorLine.style.cssText = 'margin-bottom:8px;color:#777;overflow-wrap:anywhere';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';

    const make = label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = 'border:1px solid #d9dee4;border-radius:7px;padding:6px 8px;background:#fff;color:#4b5563;font:700 11px/1.2 system-ui,sans-serif';
      return button;
    };

    const copy = make('진단 결과 복사');
    const save = make('진단 TXT 저장');
    const close = make('닫기');

    copy.onclick = async () => {
      const ok = await loaderCopyDiagnosticReport();
      copy.textContent = ok ? '복사 완료' : '복사 실패';
    };

    save.onclick = () => {
      try {
        const saved = loaderSaveDiagnosticTxt();
        save.textContent = saved.method === 'share-sheet'
          ? '공유 창 열림'
          : saved.ok
            ? '저장 요청 완료'
            : '저장 실패';
      } catch (saveError) {
        save.textContent = '저장 실패';
      }
    };

    close.onclick = () => box.remove();

    actions.append(copy, save, close);
    box.append(title, info, errorLine, actions);
    document.body.append(box);
  }

  function installStorageBridge() {
    if (pageWindow.__AUTO_KILLER_STORAGE_BRIDGE_INSTALLED__ === true) return;
    pageWindow.__AUTO_KILLER_STORAGE_BRIDGE_INSTALLED__ = true;
    pageWindow.__AUTO_KILLER_STORAGE_BRIDGE__ = true;

    document.addEventListener(STORAGE_REQUEST_EVENT, async event => {
      let request = null;
      try { request = JSON.parse(String(event.detail || '')); } catch (error) {}
      if (!request?.id || !request.operation || !request.key) return;

      const response = { id: request.id, ok: true, value: null };
      try {
        if (request.operation === 'set') response.value = await gmSet(request.key, request.value);
        else if (request.operation === 'get') response.value = await gmGet(request.key, request.fallback);
        else if (request.operation === 'delete') response.value = await gmDelete(request.key);
        else throw new Error(`알 수 없는 저장소 작업: ${request.operation}`);
      } catch (error) {
        response.ok = false;
        response.error = error?.message || String(error);
      }

      document.dispatchEvent(new CustomEvent(STORAGE_RESPONSE_EVENT, {
        detail: JSON.stringify(response)
      }));
    });
  }

  function gmApiForCore() {
    return {
      setValue: gmSet,
      getValue: gmGet,
      deleteValue: gmDelete
    };
  }

  function executeCoreViaPrivilegedElement(source) {
    if (typeof GM_addElement !== 'function') return false;
    void loaderDiagnosticLog('CORE_EXEC_ATTEMPT', { method: 'GM_addElement-inline', sourceLength: String(source || '').length });
    const script = GM_addElement('script', {
      type: 'text/javascript',
      textContent: `${source}\n//# sourceURL=${CORE_URL}`
    });
    try { script?.remove?.(); } catch (error) {}
    const loaded = pageWindow.__AUTO_KILLER_REMOTE_CORE_LOADED__ === true;
    void loaderDiagnosticLog(loaded ? 'CORE_EXEC_SUCCESS' : 'CORE_EXEC_NO_SIGNAL', { method: 'GM_addElement-inline' });
    return loaded;
  }

  function executeCore(source) {
    if (!source || !source.trim()) throw new Error('GitHub 코어 응답이 비어 있습니다.');
    void loaderDiagnosticLog('CORE_EXEC_ATTEMPT', { method: 'new-Function', sourceLength: String(source || '').length });
    let directError = null;
    try {
      const run = new Function(
        'window',
        'globalThis',
        'document',
        'GM',
        'GM_info',
        `${source}\n//# sourceURL=${CORE_URL}`
      );
      run.call(
        pageWindow,
        pageWindow,
        pageWindow,
        pageWindow.document,
        gmApiForCore(),
        typeof GM_info === 'object' ? GM_info : null
      );
    } catch (error) {
      directError = error;
    }

    // 정상 종료한 경우에만 기존 실행 확인 신호를 신뢰한다.
    // 코어가 중간에 예외를 내기 전에 LOADED 플래그만 먼저 세운 경우를 성공으로 오판하지 않는다.
    if (!directError && pageWindow.__AUTO_KILLER_REMOTE_CORE_LOADED__ === true) {
      void loaderDiagnosticLog('CORE_EXEC_SUCCESS', { method: 'new-Function' });
      return;
    }
    if (directError) {
      void loaderDiagnosticLog('CORE_EXEC_FAILED', { method: 'new-Function', ...loaderSafeError(directError) });
      try { pageWindow.__AUTO_KILLER_REMOTE_CORE_LOADED__ = false; } catch (error) {}
    }

    // Edge/Chromium의 엄격한 CSP가 new Function 실행을 막는 경우,
    // Tampermonkey의 privileged element API로 같은 코어를 페이지 컨텍스트에 주입한다.
    try {
      if (executeCoreViaPrivilegedElement(source)) return;
    } catch (elementError) {
      if (!directError) directError = elementError;
    }

    if (directError) throw directError;
    throw new Error('코어는 받았지만 실행 확인 신호가 없습니다.');
  }

  function requestViaGm(requestUrl) {
    return new Promise((resolve, reject) => {
      const handleResponse = response => {
        try {
          const status = Number(response?.status || 0);
          const source = response?.responseText || response?.response || '';
          void loaderDiagnosticLog('CORE_FETCH_RESPONSE', { transport: 'gm-or-fetch', status, sourceLength: String(source || '').length });
          if (status < 200 || status >= 300) throw new Error(`GitHub 코어 응답 오류: HTTP ${status || '없음'}`);
          executeCore(String(source));
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      if (typeof GM_xmlhttpRequest === 'function') {
        void loaderDiagnosticLog('CORE_FETCH_TRANSPORT', { transport: 'GM_xmlhttpRequest' });
        GM_xmlhttpRequest({
          method: 'GET',
          url: requestUrl,
          timeout: 15000,
          onload: handleResponse,
          onerror: () => reject(new Error('GM 방식으로 GitHub 코어 연결에 실패했습니다.')),
          ontimeout: () => reject(new Error('GM 방식의 GitHub 코어 연결 시간이 초과됐습니다.'))
        });
        return;
      }

      if (typeof GM === 'object' && typeof GM.xmlHttpRequest === 'function') {
        void loaderDiagnosticLog('CORE_FETCH_TRANSPORT', { transport: 'GM.xmlHttpRequest' });
        Promise.resolve(GM.xmlHttpRequest({ method: 'GET', url: requestUrl, timeout: 15000 }))
          .then(handleResponse)
          .catch(reject);
        return;
      }

      void loaderDiagnosticLog('CORE_FETCH_TRANSPORT', { transport: 'fetch-no-store' });
      fetch(requestUrl, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`GitHub 코어 응답 오류: HTTP ${response.status}`);
          return response.text();
        })
        .then(source => {
          try { executeCore(source); resolve(); }
          catch (error) { reject(error); }
        })
        .catch(reject);
    });
  }

  function watchInjectedScript(script, resolve, reject, label) {
    if (!script) {
      reject(new Error(`${label} 방식으로 script 요소를 만들지 못했습니다.`));
      return;
    }
    let settled = false;
    const finish = (ok, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { script.remove(); } catch (removeError) {}
      if (ok && pageWindow.__AUTO_KILLER_REMOTE_CORE_LOADED__ === true) resolve();
      else reject(error || new Error('코어는 불러왔지만 실행 확인 신호가 없습니다.'));
    };
    script.addEventListener('load', () => {
      void loaderDiagnosticLog('CORE_SCRIPT_LOAD_EVENT', { label, ok: true });
      finish(true);
    }, { once: true });
    script.addEventListener('error', () => {
      void loaderDiagnosticLog('CORE_SCRIPT_LOAD_EVENT', { label, ok: false });
      finish(false, new Error(`${label} 방식으로 GitHub 코어를 불러오지 못했습니다.`));
    }, { once: true });
    const timeout = setTimeout(() => finish(false, new Error(`${label} 방식의 GitHub 코어 연결 시간이 초과됐습니다.`)), 15000);
    // 아주 빠른 캐시 적중으로 load 이벤트가 등록 전에 끝난 경우도 확인한다.
    if (pageWindow.__AUTO_KILLER_REMOTE_CORE_LOADED__ === true) finish(true);
  }

  function requestViaPrivilegedScript(requestUrl) {
    return new Promise((resolve, reject) => {
      if (typeof GM_addElement !== 'function') {
        reject(new Error('Tampermonkey의 CSP 호환 script 삽입 기능을 찾지 못했습니다.'));
        return;
      }
      try {
        const script = GM_addElement('script', {
          src: requestUrl,
          type: 'text/javascript',
          async: false
        });
        if (script) script.dataset.autoKillerRemoteCore = 'true';
        watchInjectedScript(script, resolve, reject, 'Tampermonkey CSP 호환');
      } catch (error) {
        reject(error);
      }
    });
  }

  function requestViaScript(requestUrl) {
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = requestUrl;
        script.async = false;
        script.dataset.autoKillerRemoteCore = 'true';
        (document.head || document.documentElement).appendChild(script);
        watchInjectedScript(script, resolve, reject, 'script');
      } catch (error) {
        reject(error);
      }
    });
  }

  async function boot() {
    publishLoaderMetadata();
    await loaderDiagnosticInit();
    await loaderDiagnosticLog('LOADER_START', {
      loaderVersion: LOADER_VERSION,
      pageKind: loaderPageKind(),
      android: ANDROID_DEVICE,
      ios: IOS_DEVICE,
      coreSource: loaderSafeCoreSource(),
      scriptHandler: loaderSanitize(LOADER_SCRIPT_HANDLER, 80),
      metadataDomBridge: document.documentElement?.dataset?.autoKillerLoaderVersion === LOADER_VERSION,
      metadataGlobalBridge: pageWindow.__AUTO_KILLER_LOADER_VERSION__ === LOADER_VERSION,
      userAgent: loaderSanitize(navigator.userAgent, 260)
    });

    if (!/^https:\/\//i.test(CORE_URL)) throw new Error('CORE_URL에는 HTTPS 주소를 넣어주세요.');
    installStorageBridge();
    await loaderDiagnosticLog('STORAGE_BRIDGE_READY', { bridgeInstalled: pageWindow.__AUTO_KILLER_STORAGE_BRIDGE__ === true });
    pageWindow.__AUTO_KILLER_ONECLICK_BRIDGE__ = true;
    pageWindow.__AUTO_KILLER_ONECLICK_IOS__ = IOS_DEVICE;

    const separator = CORE_URL.includes('?') ? '&' : '?';
    const requestUrl = `${CORE_URL}${separator}ak=${Date.now()}`;

    if (ANDROID_DEVICE) {
      try {
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT', { method: 'script-android' });
        await requestViaScript(requestUrl);
        await loaderDiagnosticLog('CORE_LOAD_SUCCESS', { method: 'script-android' });
      } catch (firstError) {
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT_FAILED', { method: 'script-android', ...loaderSafeError(firstError) });
        console.warn('[AUTO_KILLER Loader] Android script 방식 실패, GM 방식으로 재시도', firstError);
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT', { method: 'gm-android-fallback' });
        await requestViaGm(requestUrl);
        await loaderDiagnosticLog('CORE_LOAD_SUCCESS', { method: 'gm-android-fallback' });
      }
      await loaderDiagnosticFlush();
      return;
    }

    try {
      await loaderDiagnosticLog('CORE_LOAD_ATTEMPT', { method: 'gm-primary' });
      await requestViaGm(requestUrl);
      await loaderDiagnosticLog('CORE_LOAD_SUCCESS', { method: 'gm-primary' });
    } catch (firstError) {
      await loaderDiagnosticLog('CORE_LOAD_ATTEMPT_FAILED', { method: 'gm-primary', ...loaderSafeError(firstError) });
      console.warn('[AUTO_KILLER Loader] GM 방식 실패, Tampermonkey CSP 호환 방식으로 재시도', firstError);

      try {
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT', { method: 'privileged-script-fallback' });
        await requestViaPrivilegedScript(requestUrl);
        await loaderDiagnosticLog('CORE_LOAD_SUCCESS', { method: 'privileged-script-fallback' });
      } catch (secondError) {
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT_FAILED', { method: 'privileged-script-fallback', ...loaderSafeError(secondError) });
        console.warn('[AUTO_KILLER Loader] CSP 호환 방식 실패, 일반 script 방식으로 마지막 재시도', secondError);
        await loaderDiagnosticLog('CORE_LOAD_ATTEMPT', { method: 'script-final-fallback' });
        await requestViaScript(requestUrl);
        await loaderDiagnosticLog('CORE_LOAD_SUCCESS', { method: 'script-final-fallback' });
      }
    }

    await loaderDiagnosticFlush();
  }

  boot().catch(async error => {
    console.error('[AUTO_KILLER Loader] 통합 코어 로드 실패', error);
    await loaderDiagnosticLog('CORE_LOAD_FATAL', loaderSafeError(error));
    await loaderDiagnosticFlush();
    await showLoaderDiagnosticFallback(error);
    alert('AUTO_KILLER 통합 코어 로드 실패: ' + (error?.message || error));
  });
})();
