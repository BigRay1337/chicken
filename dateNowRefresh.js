(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 6789;
  const DATE_NOW_BEFORE_REFRESH_MS = 1;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  let swipeRefreshTimer = null;
  let swipeStartX = null;
  let swipeStartY = null;

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
      deltaY < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    if (swipeRefreshTimer !== null) {
      clearTimeout(swipeRefreshTimer);
    }

    // Preserve the existing wait after swipe-up.
    swipeRefreshTimer = setTimeout(() => {
      // Turn Date.now off immediately before starting the game refresh.
      setDateNowChecked(false);

      setTimeout(() => {
        window.location.reload();
      }, DATE_NOW_BEFORE_REFRESH_MS);
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();