// Detect the game's existing upward-swipe refresh gesture.
// A swipe up of at least 30 CSS pixels is left to the game's own touch
// handlers to trigger its in-page refresh. Turn Date.now off after 11 native
// animation frames; this does not reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const FRAMES_BEFORE_DISABLING_DATE_NOW = 11;
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

    if (
      swipeUpDistance < SWIPE_UP_THRESHOLD_PX ||
      disableScheduled ||
      !latestConfig
    ) {
      return;
    }

    // Let the game's existing touch handling initiate the in-page refresh.
    // Count frames using the native scheduler, not the extension's RAF override.
    disableScheduled = true;
    let framesRemaining = FRAMES_BEFORE_DISABLING_DATE_NOW;

    function waitForNextFrame() {
      nativeRequestAnimationFrame(function () {
        framesRemaining -= 1;
        if (framesRemaining > 0) {
          waitForNextFrame();
          return;
        }

        const nextConfig = Object.assign({}, latestConfig, {
          cbDateNowChecked: false
        });
        latestConfig = nextConfig;
        window.postMessage({ command: "setSpeedConfig", config: nextConfig }, "*");
        disableScheduled = false;
      });
    }

    waitForNextFrame();
  }, { capture: false, passive: true });
})();