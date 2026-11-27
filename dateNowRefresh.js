(function () {
  "use strict";
  const SWIPE_UP_THRESHOLD_PX = 30;
  let touchStartY = null;
  let isUnfrozen = false;

  // The page is frozen after every refresh. A later upward swipe is the
  // only action that releases Date.now; it does not trigger another reload.
  window.addEventListener("touchstart", function (event) {
    touchStartY = event.touches && event.touches.length === 1
      ? event.touches[0].clientY
      : null;
  }, { capture: true, passive: true });

  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const swipeDistance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;

    if (swipeDistance < SWIPE_UP_THRESHOLD_PX || isUnfrozen) return;

    isUnfrozen = true;
    window.postMessage({ command: "chickenUnfreezeDateNow" }, "*");
  }, { capture: false, passive: true });
})();