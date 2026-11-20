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

    // Run the one-time unfreeze/Date.now=false -> freeze/Date.now=true
    // pulse BEFORE reloading the game. The reload only happens after 9 ms.
    const refreshGame = function () {
      try {
        window.sessionStorage.setItem(REFRESH_FLAG, "1");
      } catch (_) {}
      window.location.reload();
    };

    if (typeof window.__chickenPulseDateNowBeforeRefresh === "function") {
      window.__chickenPulseDateNowBeforeRefresh(refreshGame);
    } else {
      // Preserve the swipe refresh if the Date.now controller is unavailable.
      refreshGame();
    }
  }, { passive: true });
})();
