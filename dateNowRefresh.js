(function () {
  "use strict";
  const SWIPE_UP_THRESHOLD_PX = 30;
  let touchStartY = null;
  let pageLoaded = document.readyState === "complete";
  let isFrozen = false;

  function freezeAfterLoad() {
    if (isFrozen) return;
    isFrozen = true;
    window.postMessage({ command: "chickenFreezeDateNow" }, "*");
  }

  // After each game refresh, wait for the page load event before freezing.
  if (pageLoaded) {
    freezeAfterLoad();
  } else {
    window.addEventListener("load", function () {
      pageLoaded = true;
      freezeAfterLoad();
    }, { once: true });
  }

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

    // Once loaded and frozen, an upward swipe of 30 px or more is the
    // only action that unfreezes Date.now. It does not trigger a reload.
    if (!pageLoaded || swipeDistance < SWIPE_UP_THRESHOLD_PX || !isFrozen) return;

    isFrozen = false;
    window.postMessage({ command: "chickenUnfreezeDateNow" }, "*");
  }, { capture: false, passive: true });
})();