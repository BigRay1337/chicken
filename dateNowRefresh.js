// Detect the game's existing upward-swipe refresh gesture and wait for
// observable asynchronous refresh activity to settle before disabling Date.now.
// This does not trigger a refresh or reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const QUIET_WINDOW_MS = 1000;
  const CHECK_INTERVAL_MS = 100;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeDateNow = Date.now.bind(Date);
  const nativeFetch = typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;
  const NativeXHR = window.XMLHttpRequest;

  let latestConfig = null;
  let touchStartY = null;
  let refreshCheckActive = false;
  let refreshActivitySeen = false;
  let pendingNetworkRequests = 0;
  let lastRefreshActivityAt = 0;
  let mutationObserver = null;

  function markRefreshActivity() {
    if (!refreshCheckActive) return;
    refreshActivitySeen = true;
    lastRefreshActivityAt = nativeDateNow();
  }

  // Track fetch requests so Date.now remains enabled until they settle.
  if (nativeFetch) {
    window.fetch = function () {
      pendingNetworkRequests += 1;
      markRefreshActivity();

      let request;
      try {
        request = nativeFetch.apply(this, arguments);
      } catch (error) {
        pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
        markRefreshActivity();
        throw error;
      }

      return request.then(
        function (response) {
          pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
          markRefreshActivity();
          return response;
        },
        function (error) {
          pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
          markRefreshActivity();
          throw error;
        }
      );
    };
  }

  // Track XMLHttpRequest activity as well.
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
        markRefreshActivity();

        const finish = () => {
          if (!this.__dateNowRefreshTracked) return;
          this.__dateNowRefreshTracked = false;
          pendingNetworkRequests = Math.max(0, pendingNetworkRequests - 1);
          markRefreshActivity();
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
          markRefreshActivity();
        }
        throw error;
      }
    };
  }

  function startDomObserver() {
    if (mutationObserver || !document.documentElement) return;
    mutationObserver = new MutationObserver(function () {
      markRefreshActivity();
    });
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
  }

  if (document.documentElement) {
    startDomObserver();
  } else {
    document.addEventListener("DOMContentLoaded", startDomObserver, { once: true });
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

  // Bubble phase lets the game's own touchend handler run first.
  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeUpDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (
      swipeUpDistance < SWIPE_UP_THRESHOLD_PX ||
      refreshCheckActive ||
      !latestConfig
    ) {
      return;
    }

    refreshCheckActive = true;
    refreshActivitySeen = false;
    lastRefreshActivityAt = nativeDateNow();

    // Start checking after the game's synchronous touch handlers have run.
    nativeSetTimeout(checkRefreshCompletion, 0);
  }, { capture: false, passive: true });

  function checkRefreshCompletion() {
    if (!refreshCheckActive) return;

    const quietLongEnough =
      nativeDateNow() - lastRefreshActivityAt >= QUIET_WINDOW_MS;

    // Do not disable Date.now until at least one observable refresh-related
    // signal occurred, all tracked requests finished, and activity went quiet.
    if (refreshActivitySeen && pendingNetworkRequests === 0 && quietLongEnough) {
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
      refreshCheckActive = false;
      return;
    }

    // If the game exposes no network or DOM activity (for example, a canvas-only
    // refresh), keep Date.now enabled rather than falsely claiming completion.
    nativeSetTimeout(checkRefreshCompletion, CHECK_INTERVAL_MS);
  }
})();
