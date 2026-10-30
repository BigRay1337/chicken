// 30-pixel upward swipe refresh + refresh-completion toggles.
(function () {
  "use strict";

  const SWIPE_UP_MIN_PX = 30;
  const COMPLETION_QUIET_MS = 500;
  const CHECK_INTERVAL_MS = 50;
  const PENDING_KEY = "__chicken_refresh_pending_v1";

  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeNow = Date.now.bind(Date);
  const defaultConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false
  };
  let latestConfig = Object.assign({}, defaultConfig);
  let touchStartY = null;
  let touchStartX = null;
  let finishing = false;
  let pendingRequests = 0;
  let lastActivityAt = nativeNow();

  function sendConfig(changes) {
    latestConfig = Object.assign({}, latestConfig, changes);
    window.postMessage({ command: "setSpeedConfig", config: latestConfig }, "*");
  }

  function markActivity() {
    lastActivityAt = nativeNow();
  }

  function safeGetPending() {
    try {
      return window.sessionStorage.getItem(PENDING_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function safeSetPending(value) {
    try {
      if (value) window.sessionStorage.setItem(PENDING_KEY, "1");
      else window.sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {
      // Without sessionStorage the refresh still works, but the completion
      // toggles cannot be carried across the page navigation.
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = Object.assign({}, latestConfig, data.config);
    }
  });

  window.postMessage({ command: "getSpeedConfig" }, "*");

  if (typeof window.fetch === "function") {
    const nativeFetch = window.fetch;
    window.fetch = function () {
      pendingRequests += 1;
      markActivity();
      let result;
      try {
        result = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingRequests = Math.max(0, pendingRequests - 1);
        markActivity();
        throw error;
      }
      return result.then(
        function (response) {
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
          return response;
        },
        function (error) {
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
          throw error;
        }
      );
    };
  }

  if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
    const xhrProto = window.XMLHttpRequest.prototype;
    const nativeSend = xhrProto.send;
    xhrProto.send = function () {
      if (!this.__chickenRefreshTracked) {
        this.__chickenRefreshTracked = true;
        pendingRequests += 1;
        markActivity();
        const finishRequest = () => {
          if (!this.__chickenRefreshTracked) return;
          this.__chickenRefreshTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        };
        this.addEventListener("loadend", finishRequest, { once: true });
        this.addEventListener("error", finishRequest, { once: true });
        this.addEventListener("abort", finishRequest, { once: true });
      }
      try {
        return nativeSend.apply(this, arguments);
      } catch (error) {
        if (this.__chickenRefreshTracked) {
          this.__chickenRefreshTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        }
        throw error;
      }
    };
  }

  let observer = null;
  function observeDom() {
    if (observer || !document.documentElement || !window.MutationObserver) return;
    observer = new MutationObserver(markActivity);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }
  if (document.documentElement) observeDom();
  else document.addEventListener("DOMContentLoaded", observeDom, { once: true });

  function finishRefreshWhenSettled() {
    if (finishing) return;
    finishing = true;

    const check = function () {
      const loaded = document.readyState === "complete";
      const quiet = nativeNow() - lastActivityAt >= COMPLETION_QUIET_MS;

      if (loaded && pendingRequests === 0 && quiet) {
        sendConfig({ cbDateNowChecked: false });
        sendConfig({ cbRequestAnimationFrameChecked: false });
        safeSetPending(false);
        finishing = false;
        return;
      }
      nativeSetTimeout(check, CHECK_INTERVAL_MS);
    };

    window.addEventListener("load", markActivity, { once: true });
    nativeSetTimeout(check, CHECK_INTERVAL_MS);
  }

  if (safeGetPending()) {
    sendConfig({ cbRequestAnimationFrameChecked: true });
    if (document.readyState === "complete") markActivity();
    finishRefreshWhenSettled();
  }

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      touchStartX = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  window.addEventListener("touchend", function (event) {
    if (
      touchStartY === null ||
      !event.changedTouches ||
      event.changedTouches.length !== 1
    ) {
      touchStartY = null;
      touchStartX = null;
      return;
    }

    const endY = event.changedTouches[0].clientY;
    const endX = event.changedTouches[0].clientX;
    const deltaY = touchStartY - endY;
    const deltaX = Math.abs(endX - touchStartX);
    touchStartY = null;
    touchStartX = null;

    if (deltaY < SWIPE_UP_MIN_PX || deltaY <= deltaX) return;
    if (safeGetPending()) return;

    sendConfig({ cbRequestAnimationFrameChecked: true });
    safeSetPending(true);
    nativeSetTimeout(function () {
      window.location.reload();
    }, 50);
  }, { passive: true });
})();
