(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const CHECK_INTERVAL_MS = 50;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeDateNow = Date.now.bind(Date);
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  const NativeXHR = window.XMLHttpRequest;
  const UNFREEZE_SESSION_KEY = "__chicken_date_now_unfrozen";
  const RAF_REFRESH_SESSION_KEY = "__chicken_raf_refresh_pending";

  let latestConfig = null;
  let rafRefreshPending = false;
  let touchStartY = null;
  let refreshCheckActive = false;
  let pendingRequests = 0;
  let lastActivityAt = 0;
  let domObserver = null;

  try {
    rafRefreshPending = sessionStorage.getItem(RAF_REFRESH_SESSION_KEY) === "1";
    if (rafRefreshPending) sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
  } catch (error) {}

  function postConfig(changes) {
    if (!latestConfig) return;
    latestConfig = Object.assign({}, latestConfig, changes);
    window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
  }

  function markActivity() {
    if (refreshCheckActive) lastActivityAt = nativeDateNow();
  }

  if (nativeFetch) {
    window.fetch = function () {
      pendingRequests++;
      markActivity();
      let request;
      try {
        request = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingRequests = Math.max(0, pendingRequests - 1);
        markActivity();
        throw error;
      }
      return request.finally(function () {
        pendingRequests = Math.max(0, pendingRequests - 1);
        markActivity();
      });
    };
  }

  if (NativeXHR && NativeXHR.prototype) {
    const originalOpen = NativeXHR.prototype.open;
    const originalSend = NativeXHR.prototype.send;
    NativeXHR.prototype.open = function () {
      this.__chickenTracked = false;
      return originalOpen.apply(this, arguments);
    };
    NativeXHR.prototype.send = function () {
      if (!this.__chickenTracked) {
        this.__chickenTracked = true;
        pendingRequests++;
        markActivity();
        const finish = () => {
          if (!this.__chickenTracked) return;
          this.__chickenTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        };
        this.addEventListener("loadend", finish, { once: true });
        this.addEventListener("error", finish, { once: true });
        this.addEventListener("abort", finish, { once: true });
      }
      try {
        return originalSend.apply(this, arguments);
      } catch (error) {
        if (this.__chickenTracked) {
          this.__chickenTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        }
        throw error;
      }
    };
  }

  function observePage() {
    if (domObserver || !document.documentElement) return;
    domObserver = new MutationObserver(markActivity);
    domObserver.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, characterData: true
    });
  }
  if (document.documentElement) observePage();
  else document.addEventListener("DOMContentLoaded", observePage, { once: true });

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = data.config;
      if (rafRefreshPending) postConfig({ cbRequestAnimationFrameChecked: true });
    }
  });

  window.addEventListener("touchstart", function (event) {
    touchStartY = event.touches && event.touches.length === 1
      ? event.touches[0].clientY
      : null;
  }, { capture: true, passive: true });

  // A qualifying upward swipe is the explicit unfreeze action.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }
    const distance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;
    if (distance < SWIPE_UP_THRESHOLD_PX || refreshCheckActive) return;

    try {
      sessionStorage.setItem(UNFREEZE_SESSION_KEY, "1");
      sessionStorage.setItem(RAF_REFRESH_SESSION_KEY, "1");
    } catch (error) {}

    // Unfreeze immediately on the gesture, before the page reload starts.
    postConfig({
      cbDateNowChecked: true,
      cbRequestAnimationFrameChecked: false
    });

    refreshCheckActive = true;
    lastActivityAt = nativeDateNow();
    nativeSetTimeout(function () {
      window.location.reload();
    }, 50);
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!refreshCheckActive) return;
    const quietLongEnough = nativeDateNow() - lastActivityAt >= 750;
    const loaded = document.readyState === "complete";
    if (loaded && pendingRequests === 0 && quietLongEnough) {
      // Leave Date.now enabled after the swipe; do not re-freeze it here.
      postConfig({ cbDateNowChecked: true, cbRequestAnimationFrameChecked: true });
      refreshCheckActive = false;
      rafRefreshPending = false;
      return;
    }
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }

  window.addEventListener("load", function () {
    if (rafRefreshPending) {
      postConfig({ cbRequestAnimationFrameChecked: true });
      refreshCheckActive = true;
      lastActivityAt = nativeDateNow();
      nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
    }
  }, { once: true });
})();