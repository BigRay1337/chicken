(function () {
  const SWIPE_THRESHOLD_PX = 30;

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

    // Briefly set Date.now false, then immediately set it true.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");

    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: true }
    }, "*");

    // Do not carry a refresh marker or change Date.now again after reload.
    try {
      window.sessionStorage.removeItem("__chickenDateNowRefreshPending");
    } catch (_) {}

    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });
})();
