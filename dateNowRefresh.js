(function () {
  "use strict";
  const SWIPE_UP_THRESHOLD_PX = 30;
  const MINIMUM_WAIT_MS = 47331;
  const RELOAD_DELAY_MS = 50;
  const nativeSetTimeout = window.setTimeout.bind(window);

  let touchStartY = null;
  let pageLoaded = document.readyState === "complete";
  let isFrozen = false;
  let reloadStarted = false;
  let loadStartedAt = pageLoaded ? Date.now() : 0;

  function freezeAfterWait() {
    if (isFrozen || !pageLoaded) return;
    const remaining = Math.max(0, MINIMUM_WAIT_MS - (Date.now() - loadStartedAt));
    nativeSetTimeout(function () {
      if (!pageLoaded || reloadStarted || isFrozen) return;
      isFrozen = true;
      window.postMessage({ command: "chickenFreezeDateNow" }, "*");
    }, remaining);
  }

  // Let the game finish loading and preserve the existing 47,331 ms wait
  // before freezing Date.now on each refreshed page.
  if (pageLoaded) {
    freezeAfterWait();
  } else {
    window.addEventListener("load", function () {
      pageLoaded = true;
      loadStartedAt = Date.now();
      freezeAfterWait();
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

    // After the wait and freeze, swipe up unfreezes Date.now and refreshes
    // the game screen. The next document repeats the wait, then freezes.
    if (!pageLoaded || swipeDistance < SWIPE_UP_THRESHOLD_PX || !isFrozen || reloadStarted) return;

    reloadStarted = true;
    isFrozen = false;
    window.postMessage({ command: "chickenUnfreezeDateNow" }, "*");
    nativeSetTimeout(function () {
      window.location.reload();
    }, RELOAD_DELAY_MS);
  }, { capture: false, passive: true });
})();