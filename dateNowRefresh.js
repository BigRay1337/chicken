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

    // This is the only path that turns Date.now off: a recognized swipe up.
    // Notify the Date.now controller before starting the page refresh.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");

    // Carry the one-time state through reload so the new page starts with
    // Date.now=false and switches it back to true once the game has settled.
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    // Keep the swipe-triggered false transition, then restore true immediately
    // before the actual reload. The session flag makes the refreshed document
    // start with Date.now=false as before.
    window.setTimeout(() => {
      window.postMessage({
        command: "setSpeedConfig",
        config: { cbDateNowChecked: true }
      }, "*");
      // Let the message event apply true before starting the reload.
      window.setTimeout(() => window.location.reload(), 0);
    }, 50);
  }, { passive: true });
})();
