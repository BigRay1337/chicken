(() => {
  const SWIPE_THRESHOLD_PX = 30;

  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  function setSpeedConfig(changes) {
    speedConfig = { ...speedConfig, ...changes };
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }

  function handleSwipeUp() {
    // Simulate the extension turning off, then immediately back on.
    setSpeedConfig({
      cbSetIntervalChecked: false,
      cbSetTimeoutChecked: false,
      cbPerformanceNowChecked: false,
      cbDateNowChecked: false,
      cbRequestAnimationFrameChecked: false,
    });

    // Turn the extension behavior back on and keep requestAnimationFrame enabled.
    setSpeedConfig({
      cbSetIntervalChecked: true,
      cbSetTimeoutChecked: false,
      cbPerformanceNowChecked: false,
      cbDateNowChecked: true,
      cbRequestAnimationFrameChecked: true,
    });

    // Immediately refresh the game/page.
    try {
      if (window.top && window.top !== window) {
        window.top.location.reload();
      } else {
        window.location.reload();
      }
    } catch (e) {
      window.location.reload();
    }
  }

  let swipeStartX = null;
  let swipeStartY = null;

  window.addEventListener("message", (event) => {
    if (
      event.data &&
      event.data.command === "setSpeedConfig" &&
      event.data.config
    ) {
      speedConfig = { ...speedConfig, ...event.data.config };
      // Keep requestAnimationFrame enabled whenever this handler is active.
      speedConfig.cbRequestAnimationFrameChecked = true;
    }
  });

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

    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });
})();
