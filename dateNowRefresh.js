// Detect the game's existing upward-swipe refresh gesture.
// Give the game's own handler first chance to start its in-page refresh.
// After at least 10,101 ms, wait for observable network/DOM activity to settle
// before disabling Date.now. Generic activity monitoring is best-effort: only
// the game's own completion signal can prove that every async task is finished.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const MIN_REFRESH_WAIT_MS = 10101;
  const QUIET_WINDOW_MS = 1000;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeFetch = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const NativeXHR = window.XMLHttpRequest;
  let latestConfig = null;
  let touchStartY = null;
  let disableScheduled = false;
  let pendingNetworkRequests = 0;
  let lastObservedActivity = Date.now();
  let mutationObserver = null;

  function markActivity() {
    lastObservedActivity = Date.now();
  }

  // Track fetch activity without changing the returned promise or response.
  if (nativeFetch) {
    window.fetch = function () {
      pendingNetworkRequests += 1;
      markActivity();
      let result;
      try {
        result = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
        markActivity();
        throw error;
      }
      return result.finally(function () {
        pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
        markActivity();
      });
    };
  }

  // Track XMLHttpRequests, another common way games load refresh data.
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
        pendingNetworkRequests += 1;
        markActivity();
        const finish = () => {
          if (!this.__dateNowRefreshTracked) return;
          this.__dateNowRefreshTracked = false;
          pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
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
          pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
          markActivity();
        }
        throw error;
      }
    };
  }

  function observeDom() {
    if (mutationObserver || !document.documentElement) return;
    mutationObserver = new MutationObserver(markActivity);
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.documentElement) {
    observeDom();
  } else {
    document.addEventListener("DOMContentLoaded", observeDom, { once: true });
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = data.config;
    }
  });

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
  }, { capture: true, passive: true });

  // Bubble phase allows the game's earlier touch handlers to process the swipe.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeUpDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (
      swipeUpDistance < SWIPE_UP_THRESHOLD_PX ||
      disableScheduled ||
      !latestConfig
    ) {
      return;
    }

    disableScheduled = true;
    const swipeEndedAt = Date.now();

    function checkRefreshSettled() {
      const minimumWaitPassed = Date.now() - swipeEndedAt >= MIN_REFRESH_WAIT_MS;
      const networkIdle = pendingNetworkRequests === 0;
      const domQuiet = Date.now() - lastObservedActivity >= QUIET_WINDOW_MS;

      if (minimumWaitPassed && networkIdle && domQuiet) {
        if (latestConfig) {
          const nextConfig = Object.assign({}, latestConfig, {
            cbDateNowChecked: false
          });
          latestConfig = nextConfig;
          window.postMessage(
            { command: "setSpeedConfig", config: nextConfig },
            "*"
          );
        }
        disableScheduled = false;
        return;
      }

      // Poll with the native timer so the extension's speed settings cannot
      // accelerate this verification loop.
      nativeSetTimeout(checkRefreshSettled, 100);
    }

    // Let the game's touchend handlers finish before starting the wait.
    nativeSetTimeout(checkRefreshSettled, MIN_REFRESH_WAIT_MS);
  }, { capture: false, passive: true });
})();
