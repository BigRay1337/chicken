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

    // Preserve the swipe-up false action, then restore true before reload.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");

    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: true }
    }, "*");

    // Carry the one-time state through reload so the refreshed page keeps
    // its existing false-while-loading, true-when-stable behavior.
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    // Let both same-document messages apply before starting the refresh.
    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });
})();
