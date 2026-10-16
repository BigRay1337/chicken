// Let the game's existing upward-swipe handler trigger its in-page refresh
// first. Once the current touch event has finished dispatching, disable Date.now.
// This does not reload the browser tab or invoke a separate refresh.
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

  // Keep this in bubble phase so the game's earlier touch handlers can respond.
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

    // A zero-delay native timer runs after this touch event's handlers, giving
    // the game's refresh gesture first chance to execute.
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
