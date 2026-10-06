(function () {
  // Set LONG_DELAY_MS anywhere from 1 to 1000 ms.
  const LONG_DELAY_MIN_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;
  const LONG_DELAY_MAX_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;
  const LONG_DELAY_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;

  const SWIPE_THRESHOLD_PX = 30;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    });
  }

  function handleSwipeUp() {
    // Set DateNow false immediately when the swipe is detected.
    setDateNowChecked(false);

    // Refresh immediately after disabling DateNow.
    window.location.reload();
  }

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
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });
})();
