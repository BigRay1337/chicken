// Detect the game's upward-swipe refresh gesture. Keep Date.now enabled while
// the refresh produces network/DOM activity, then disable it after requests
// finish and the page has been quiet. This does not reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const QUIET_WINDOW_MS = 750;
  const MIN_REFRESH_WINDOW_MS = 750;
  const CHECK_INTERVAL_MS = 50;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeDateNow = Date.now.bind(Date);
  const nativeFetch = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const NativeXHR = window.XMLHttpRequest;

  let latestConfig = null;
  let rafRefreshPending = false;
  let refreshPageLoaded = document.readyState === "complete";
  const RAF_REFRESH_SESSION_KEY = "__chicken_raf_refresh_pending";
  const SAVED_CONFIG_SESSION_KEY = "__chicken_saved_speed_config";
  let restoreConfigAfterRefresh = null;

  try {
    rafRefreshPending = sessionStorage.getItem(RAF_REFRESH_SESSION_KEY) === "1";
    const savedConfig = sessionStorage.getItem(SAVED_CONFIG_SESSION_KEY);
    if (savedConfig) restoreConfigAfterRefresh = JSON.parse(savedConfig);
    if (rafRefreshPending) sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
  } catch (error) {
    // Session storage may be unavailable in restricted browsing contexts.
  }

  function publishConfig(config) {
    if (!config) return;
    latestConfig = config;
    window.postMessage({ command: "setSpeedConfig", config: config }, "*");
  }

  function setAllSpeedHooksEnabled(enabled) {
    if (!latestConfig) return;
    const nextConfig = Object.assign({}, latestConfig, {
      cbSetIntervalChecked: enabled && !!latestConfig.cbSetIntervalChecked,
      cbSetTimeoutChecked: enabled && !!latestConfig.cbSetTimeoutChecked,
      cbPerformanceNowChecked: enabled && !!latestConfig.cbPerformanceNowChecked,
      cbDateNowChecked: enabled && !!latestConfig.cbDateNowChecked,
      cbRequestAnimationFrameChecked: enabled && !!latestConfig.cbRequestAnimationFrameChecked
    });
    publishConfig(nextConfig);
  }

  let touchStartY = null;
  let refreshCheckActive = rafRefreshPending;
  let refreshActivitySeen = rafRefreshPending;
  let pendingRequests = 0;
  let refreshStartedAt = rafRefreshPending ? nativeDateNow() : 0;
  let lastActivityAt = refreshStartedAt;
  let domObserver = null;
  let pageLoadSeen = document.readyState === "complete";

  function markActivity() {
    if (!refreshCheckActive) return;
    refreshActivitySeen = true;
    lastActivityAt = nativeDateNow();
  }

  window.addEventListener("load", function () {
    pageLoadSeen = true;
    markActivity();
  }, { once: true });

  document.addEventListener("readystatechange", function () {
    if (document.readyState === "complete") {
      pageLoadSeen = true;
      markActivity();
    }
  });

  if (nativeFetch) {
    window.fetch = function () {
      pendingRequests += 1;
      markActivity();
      let request;
      try {
        request = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingRequests = Math.max(0, pendingRequests - 1);
        markActivity();
        throw error;
      }
      return request.then(
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

  if (NativeXHR && NativeXHR.prototype) {
    const originalOpen = NativeXHR.prototype.open;
    const originalSend = NativeXHR.prototype.send;

    NativeXHR.prototype.open = function () {
      this.__dateNowRefreshTracked = false;
      return originalOpen.apply(this, arguments);
    };

    NativeXHR.prototype.send = function () {
      if (!this.__dateNowRefreshTracked) {
        this.__dateNowRefreshTracked = true;
        pendingRequests += 1;
        markActivity();

        const finish = () => {
          if (!this.__dateNowRefreshTracked) return;
          this.__dateNowRefreshTracked = false;
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
        if (this.__dateNowRefreshTracked) {
          this.__dateNowRefreshTracked = false;
          pendingRequests = Math.max(0, pendingRequests - 1);
          markActivity();
        }
        throw error;
      }
    };
  }

  function observePage() {
    if (domObserver || !document.documentElement) return;
    domObserver = new MutationObserver(function () {
      markActivity();
    });
    domObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.documentElement) {
    observePage();
  } else {
    document.addEventListener("DOMContentLoaded", observePage, { once: true });
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = data.config;
      if (rafRefreshPending) {
        // Keep all extension speed hooks suspended until refresh completion.
        setAllSpeedHooksEnabled(false);
      }
    }
  });

  window.addEventListener("load", function () {
    refreshPageLoaded = true;
    if (rafRefreshPending) {
      // Keep the extension's speed hooks suspended while the refreshed game
      // settles. They are restored only after the completion checks pass.
      // Begin checking on the refreshed document, not the document that
      // received the swipe (which is replaced by location.reload()).
      refreshCheckActive = true;
      refreshActivitySeen = true;
      refreshStartedAt = nativeDateNow();
      lastActivityAt = refreshStartedAt;
      nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
    }
  }, { once: true });

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
  }, { capture: true, passive: true });

  // Bubble phase lets the game's touchend handler initiate its refresh first.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeUpDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || refreshCheckActive) {
      return;
    }

    // Save the user's current settings, then suspend every speed hook for
    // the refresh. The saved settings survive the document reload.
    rafRefreshPending = true;
    refreshPageLoaded = false;
    try {
      sessionStorage.setItem(RAF_REFRESH_SESSION_KEY, "1");
      if (latestConfig) {
        restoreConfigAfterRefresh = Object.assign({}, latestConfig);
        sessionStorage.setItem(SAVED_CONFIG_SESSION_KEY, JSON.stringify(restoreConfigAfterRefresh));
      }
    } catch (error) {
      // The in-memory suspension still works if session storage is unavailable.
    }

    setAllSpeedHooksEnabled(false);

    // A swipe of at least 30 px refreshes the website after the config is set.
    refreshCheckActive = true;
    nativeSetTimeout(function () {
      window.location.reload();
    }, 50);

    refreshActivitySeen = false;
    refreshStartedAt = nativeDateNow();
    lastActivityAt = refreshStartedAt;

    // Let the current touch event dispatch finish before checking for refresh
    // activity. If the document is still loading, wait for its load event too.
    nativeSetTimeout(checkRefreshCompletion, 0);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!refreshCheckActive) return;

    const now = nativeDateNow();
    const minimumRefreshWindowPassed = now - refreshStartedAt >= MIN_REFRESH_WINDOW_MS;
    const quietLongEnough = now - lastActivityAt >= QUIET_WINDOW_MS;
    const documentLoaded = pageLoadSeen || document.readyState === "complete";

    if (
      minimumRefreshWindowPassed &&
      documentLoaded &&
      refreshActivitySeen &&
      pendingRequests === 0 &&
      quietLongEnough
    ) {
      // Restore the exact speed-hook settings that were active before the
      // swipe. This resumes the extension without changing pageScript.js.
      if (restoreConfigAfterRefresh) {
        publishConfig(Object.assign({}, restoreConfigAfterRefresh));
      }
      try {
        sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
        sessionStorage.removeItem(SAVED_CONFIG_SESSION_KEY);
      } catch (error) {
        // Ignore unavailable session storage.
      }
      rafRefreshPending = false;
      refreshCheckActive = false;
      return;
    }

    // Keep waiting while loading or while detectable refresh activity continues.
    // Canvas-only refreshes that produce no network/DOM signals cannot be
    // reliably distinguished from a swipe that did not refresh the game.
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }
})();
