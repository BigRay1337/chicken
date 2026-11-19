(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const REFRESH_FLAG = "__chickenDateNowRefreshPending";

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    swipeStartX = null;
    swipeStartY = null;

    if (deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        refreshRequested) return;

    refreshRequested = true;

    // Save the one-time marker before briefly disabling Date.now.
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");

    // Reload after the false state has been applied. The new document
    // restores Date.now=true immediately at document_start.
    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });
})();
