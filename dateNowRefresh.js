(function () {
  "use strict";

  const SWIPE_THRESHOLD_PX = 30;
  const UNFREEZE_DELAY_MS = 1000;

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
  }, { passive: true, capture: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;

    swipeStartX = null;
    swipeStartY = null;

    // Only a deliberate upward swipe starts the refresh sequence.
    if (deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        refreshRequested) return;

    refreshRequested = true;

    // Keep the current game running briefly after the swipe.
    window.setTimeout(() => {
      // Unfreeze Date.now before the page refresh starts.
      setDateNowFrozen(false);

      // Allow the false setting to reach the Date.now controller.
      window.requestAnimationFrame(() => {
        // Freeze Date.now again immediately before refreshing.
        setDateNowFrozen(true);

        // Give the true setting one frame to reach the controller,
        // then begin the game refresh.
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      });
    }, UNFREEZE_DELAY_MS);
  }, { passive: true, capture: true });
})();
