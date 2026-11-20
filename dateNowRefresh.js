(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const UNFREEZE_DELAY_MS = 625;

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;

  function setDateNowFrozen(frozen) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: frozen }
    }, "*");
  }

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

    // Let the swipe gesture finish, then briefly unfreeze Date.now.
    window.setTimeout(() => {
      setDateNowFrozen(false);

      // Re-freeze immediately before starting the game refresh.
      window.requestAnimationFrame(() => {
        setDateNowFrozen(true);
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      });
    }, UNFREEZE_DELAY_MS);
  }, { passive: true });
})();
