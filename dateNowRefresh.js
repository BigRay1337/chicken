(function () {
  "use strict";
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeSetTimeout = window.setTimeout.bind(window);

  let touchStartY = null;
  let pageLoaded = document.readyState === "complete";
  let isFrozen = false;
  let reloadStarted = false;

  function freezeAfterLoad() {
    if (isFrozen) return;
    isFrozen = true;
    window.postMessage({ command: "chickenFreezeDateNow" }, "*");
  }

  // No fixed wait: freeze as soon as the game page has finished loading.
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

    if (!pageLoaded || swipeDistance < SWIPE_UP_THRESHOLD_PX || !isFrozen || reloadStarted) return;

    // Unfreeze only for the brief transition from the swipe to the refresh.
    // Reload on the next task so the swipe event can finish first.
    reloadStarted = true;
    isFrozen = false;
    window.postMessage({ command: "chickenUnfreezeDateNow" }, "*");
    nativeSetTimeout(function () {
      window.location.reload();
    }, 0);
  }, { capture: false, passive: true });
})();