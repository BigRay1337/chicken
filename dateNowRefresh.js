(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 6789;
  const DATE_NOW_FALLBACK_SPEED = 0.25;

  let cbDateNowChecked = true;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    // Unfreeze Date.now at the fixed quarter-speed fallback.
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
        speed: DATE_NOW_FALLBACK_SPEED,
      },
    });
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (
      event.data.command === "setSpeedConfig" &&
      typeof event.data.config?.cbDateNowChecked === "boolean"
    ) {
      cbDateNowChecked = event.data.config.cbDateNowChecked;
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

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

    // Swipe up unfreezes the game; do not reload and re-freeze it.
    window.setTimeout(() => {
      setDateNowChecked(false);
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
