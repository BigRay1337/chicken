// Detect an upward swipe of at least 30 CSS pixels.
// Use the browser's native animation-frame scheduler so the extension's
// Date.now/requestAnimationFrame overrides cannot delay this sequence.
// Disable Date.now only for this swipe, after the game's touch handlers have
// run and two native frames have passed. The browser tab is not reloaded.
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

    // Run after touchend propagation, then allow two native frames for the
    // game's in-page refresh/render to process before switching Date.now off.
    nativeRequestAnimationFrame(function () {
      nativeRequestAnimationFrame(function () {
        window.postMessage({ command: "disableDateNowAfterGameRefresh" }, "*");
        disableScheduled = false;
      });
    });
  }, { capture: false, passive: true });
})();
