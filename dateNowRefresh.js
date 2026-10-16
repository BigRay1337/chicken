// Detect an upward swipe of at least 30 CSS pixels.
// Let the game's swipe handlers run, then disable Date.now after two animation
// frames so the browser has an opportunity to process the game's internal refresh.
// This does not reload the webpage.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
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

    // Allow the game's touchend handler and a paint opportunity to run first.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.postMessage({ command: "disableDateNowAfterGameRefresh" }, "*");
        disableScheduled = false;
      });
    });
  }, { capture: false, passive: true });
})();
