// Let the game handle its own in-page refresh from an upward swipe.
// One native animation frame after a qualifying swipe, disable Date.now.
// Never reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  let touchStartY = null;
  let latestConfig = null;
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

    const endY = event.changedTouches[0].clientY;
    const swipeUpDistance = touchStartY - endY;
    touchStartY = null;

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || disableScheduled || !latestConfig) {
      return;
    }

    disableScheduled = true;

    // The swipe itself is left to the game. After one native frame, send
    // the updated config so pageScript turns Date.now off.
    nativeRequestAnimationFrame(function () {
      const updatedConfig = Object.assign({}, latestConfig, {
        cbDateNowChecked: false
      });
      latestConfig = updatedConfig;
      window.postMessage({
        command: "setSpeedConfig",
        config: updatedConfig
      }, "*");
      disableScheduled = false;
    });
  }, { capture: false, passive: true });
})();