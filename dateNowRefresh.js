// Let the game's existing upward-swipe handler initiate its in-page refresh
// first, then disable Date.now immediately after the touch event finishes.
// This does not call a refresh function or reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeSetTimeout = window.setTimeout.bind(window);

  let latestConfig = null;
  let touchStartY = null;
  let disableScheduled = false;

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

  // Bubble phase: allow the game's own touchend handler to run first.
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

    // A zero-delay native timer runs after the current touch event dispatch,
    // giving the game's synchronous swipe/refresh handler first opportunity.
    nativeSetTimeout(function () {
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
    }, 0);
  }, { capture: false, passive: true });
})();
