// Detect the game's existing upward-swipe refresh gesture.
// Let the game's touch handlers initiate its in-page refresh first.
// After the swipe event has finished, wait 10,101 ms before disabling Date.now.
// This does not reload the browser tab or prove that an asynchronous refresh
// has completed; it provides a fixed delay after the game's handler can run.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const DATE_NOW_DISABLE_DELAY_MS = 10101;
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

  // Bubble phase lets the game's earlier touch handlers process the swipe first.
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

    // The game's touchend handler can initiate the refresh before this timer
    // fires. Disable Date.now 10,101 ms later, not immediately on the swipe.
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
    }, DATE_NOW_DISABLE_DELAY_MS);
  }, { capture: false, passive: true });
})();
