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
  const RAF_REFRESH_CONFIG_KEY = "__chicken_raf_saved_config";
  let savedRefreshConfig = null;

  try {
    const saved = sessionStorage.getItem(RAF_REFRESH_CONFIG_KEY);
    if (saved) savedRefreshConfig = JSON.parse(saved);
  } catch (error) {
    savedRefreshConfig = null;
  }

  try {
    rafRefreshPending = sessionStorage.getItem(RAF_REFRESH_SESSION_KEY) === "1";
    if (rafRefreshPending) sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
  } catch (error) {
    // Session storage may be unavailable in restricted browsing contexts.
  }

  function setRequestAnimationFrameEnabled(enabled) {
    if (!latestConfig) return;
    const nextConfig = Object.assign({}, latestConfig, {
      cbRequestAnimationFrameChecked: enabled
    });
    latestConfig = nextConfig;
    window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
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
        // Use the exact pre-refresh settings when the refreshed document
        // receives its initial configuration. Keep all hooks disabled while
        // the page initializes; RAF is the one exception after load so the
        // game can finish rendering.
        if (savedRefreshConfig) {
          latestConfig = Object.assign({}, savedRefreshConfig);
        }
        setRequestAnimationFrameEnabled(refreshPageLoaded);
      }
    }
  });

  window.addEventListener("load", function () {
    refreshPageLoaded = true;
    if (rafRefreshPending) {
      setRequestAnimationFrameEnabled(true);
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

    // Record the 30 px swipe. RAF stays unfrozen during document loading,
    // is enabled after the refreshed document's load event and stays enabled
    // when refresh activity has settled.
    rafRefreshPending = true;
    refreshPageLoaded = false;
    try {
      sessionStorage.setItem(RAF_REFRESH_SESSION_KEY, "1");
    } catch (error) {
      // The current-page enable still works if session storage is unavailable.
    }

    if (latestConfig) {
      // Save the user's exact settings so the simulated disable/enable cycle
      // does not overwrite their chosen speed or checkbox preferences.
      savedRefreshConfig = Object.assign({}, latestConfig);
      try {
        sessionStorage.setItem(
          RAF_REFRESH_CONFIG_KEY,
          JSON.stringify(savedRefreshConfig)
        );
      } catch (error) {
        // Continue with the in-memory copy if storage is unavailable.
      }

      // Spoof extension-disabled state: turn off every game hook during the
      // refresh. RAF is enabled again only after the new document has loaded.
      const disabledConfig = Object.assign({}, latestConfig, {
        cbSetIntervalChecked: false,
        cbSetTimeoutChecked: false,
        cbPerformanceNowChecked: false,
        cbDateNowChecked: false,
        cbRequestAnimationFrameChecked: false
      });
      latestConfig = disabledConfig;
      window.postMessage({ command: "setSpeedConfig", config: disabledConfig }, "*");
    }

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
      // Spoof extension re-enabled after the refreshed game is fully settled.
      // Restore the complete pre-swipe configuration, not hard-coded defaults.
      if (savedRefreshConfig) {
        latestConfig = Object.assign({}, savedRefreshConfig);
        window.postMessage({
          command: "setSpeedConfig",
          config: latestConfig
        }, "*");
      }
      rafRefreshPending = false;
      try {
        sessionStorage.removeItem(RAF_REFRESH_SESSION_KEY);
        sessionStorage.removeItem(RAF_REFRESH_CONFIG_KEY);
      } catch (error) {
        // Storage cleanup is best-effort.
      }
      savedRefreshConfig = null;
      refreshCheckActive = false;
      return;
    }

    // Keep waiting while loading or while detectable refresh activity continues.
    // Canvas-only refreshes that produce no network/DOM signals cannot be
    // reliably distinguished from a swipe that did not refresh the game.
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }
})();
