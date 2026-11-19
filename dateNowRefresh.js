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

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - swipeStartX;
    const deltaY = endY - swipeStartY;

    swipeStartX = null;
    swipeStartY = null;

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY) ||
      refreshRequested
    ) {
      return;
    }

    // Refresh first. dateNowDisabled.js keeps Date.now frozen while the
    // game reloads and installs its control only after the game surface settles.
    refreshRequested = true;
    window.location.reload();
  }, { passive: true });
})();
