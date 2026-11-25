(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const REFRESH_FLAG = "__chickenDateNowRefreshPending";

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;

  // Capture touch events before game canvases or page handlers can stop bubbling.
  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) {
      swipeStartX = null;
      swipeStartY = null;
      return;
    }

    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }, { passive: true, capture: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) {
      swipeStartX = null;
      swipeStartY = null;
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    swipeStartX = null;
    swipeStartY = null;

    if (deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        refreshRequested) return;

    refreshRequested = true;

    // Keep Date.now frozen until this recognized swipe-up initiates refresh.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");

    // Carry the one-time release through reload; pageScript.js consumes it.
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true, capture: true });

  window.addEventListener("touchcancel", () => {
    swipeStartX = null;
    swipeStartY = null;
  }, { passive: true, capture: true });
})();