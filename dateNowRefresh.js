// Detect the game's existing upward-swipe refresh gesture.
// After a swipe of at least 30 CSS pixels, let the game's touch handlers run,
// then disable Date.now on the next native animation frame. This does not
// reload the browser tab; the game handles its own in-page refresh.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
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

  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeUpDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || disableScheduled || !latestConfig) {
      return;
    }

    disableScheduled = true;

    // The game's own touch handler initiates its in-page refresh. Disable
    // Date.now one native frame afterward, without using the patched RAF.
    nativeRequestAnimationFrame(function () {
      const nextConfig = Object.assign({}, latestConfig, {
        cbDateNowChecked: false
      });
      latestConfig = nextConfig;
      window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
      disableScheduled = false;
    });
  }, { capture: false, passive: true });
})();
