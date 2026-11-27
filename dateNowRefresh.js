(function () {
  "use strict";
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const STORAGE_KEY = "chickenLastGameLoadDurationMs";
  const refreshStartedAt = Date.now();

  let touchStartY = null;
  let pageLoaded = document.readyState === "complete";
  let isFrozen = false;
  let reloadStarted = false;
  let freezeTimer = null;
  let previousLoadDuration = 0;

  try {
    previousLoadDuration = Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch (_) {
    previousLoadDuration = 0;
  }

  function freezeDateNow() {
    if (isFrozen) return;
    isFrozen = true;
    window.postMessage({ command: "chickenFreezeDateNow" }, "*");
  }

  // Use half of the previous measured game-load duration as this refresh's
  // estimated halfway point. On the first run, fall back to freezing at load.
  if (previousLoadDuration > 0 && !pageLoaded) {
    freezeTimer = nativeSetTimeout(
      freezeDateNow,
      Math.max(0, Math.floor(previousLoadDuration / 2))
    );
  }

  function handlePageLoad() {
    if (pageLoaded) return;
    pageLoaded = true;

    const actualLoadDuration = Math.max(0, Date.now() - refreshStartedAt);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(actualLoadDuration));
    } catch (_) {
      // Storage may be unavailable; the current page can still operate.
    }

    // If the estimate has not fired by load completion, freeze now.
    if (!isFrozen) {
      if (freezeTimer !== null) nativeClearTimeout(freezeTimer);
      freezeTimer = null;
      freezeDateNow();
    }
  }

  if (pageLoaded) {
    const actualLoadDuration = Math.max(0, Date.now() - refreshStartedAt);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(actualLoadDuration));
    } catch (_) {}
    freezeDateNow();
  } else {
    window.addEventListener("load", handlePageLoad, { once: true });
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

    reloadStarted = true;
    isFrozen = false;
    window.postMessage({ command: "chickenUnfreezeDateNow" }, "*");
    nativeSetTimeout(function () {
      window.location.reload();
    }, 0);
  }, { capture: false, passive: true });
})();
