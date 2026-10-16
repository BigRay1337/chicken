// Detect an upward swipe of at least 30 CSS pixels.
// Let the game's own touch handlers receive the swipe and perform its in-page
// refresh. After touchend propagation, disable Date.now on the next native frame.
// This does not reload the browser tab or synthesize a separate refresh action.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  let touchStartY = null;
  let disableScheduled = false;

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

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || disableScheduled) {
      return;
    }

    disableScheduled = true;

    // One native animation frame after the game's touchend handlers.
    nativeRequestAnimationFrame(function () {
      window.postMessage({ command: "disableDateNowAfterGameRefresh" }, "*");
      disableScheduled = false;
    });
  }, { capture: false, passive: true });
})();
