// Detect the game's existing upward-swipe refresh gesture.
// Let the game's touch handlers run first and initiate its in-page refresh.
// Only after that event dispatch has finished and a short render window has
// passed do we disable Date.now. This does not reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const REFRESH_FIRST_DELAY_MS = 1500;
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

  // Bubble phase lets earlier game touch handlers process the swipe first.
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

    // The game's own touchend handler gets to run before this timer fires.
    // This gives its in-page refresh a head start; it is not a guaranteed
    // completion signal if the game takes longer than the delay.
    disableScheduled = true;
    nativeSetTimeout(function () {
      if (!latestConfig) {
        disableScheduled = false;
        return;
      }

      const nextConfig = Object.assign({}, latestConfig, {
        cbDateNowChecked: false
      });
      latestConfig = nextConfig;
      window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
      disableScheduled = false;
    }, REFRESH_FIRST_DELAY_MS);
  }, { capture: false, passive: true });
})();
