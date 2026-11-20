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

    // Unfreeze Date.now synchronously on the swipe, before requesting refresh.
    // The refreshed document keeps it running until the game surface is stable.
    if (typeof window.__chickenSetDateNowFrozen === "function") {
      window.__chickenSetDateNowFrozen(false);
    }

    // Carry a one-time marker through the page reload.
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {
      // If storage is unavailable, still perform the requested refresh.
    }

    refreshRequested = true;
    window.location.reload();
  }, { passive: true });
})();
