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

  function setDateNowChecked() {
    speedConfig = {
      ...speedConfig,
      cbDateNowChecked: true,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        ...speedConfig,
        cbDateNowChecked: true,
      },
    });
  }

  function handleSwipeUp() {
    // On a qualifying upward swipe, toggle Date.now off and back on immediately,
    // then refresh the top-level game page.
    const baseConfig = { ...speedConfig };

    window.postMessage({
      command: "setSpeedConfig",
      config: { ...baseConfig, cbDateNowChecked: false },
    });

    window.postMessage({
      command: "setSpeedConfig",
      config: { ...baseConfig, cbDateNowChecked: true },
    });

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
      speedConfig = {
        ...speedConfig,
        ...event.data.config,
        cbDateNowChecked: true,
      };

      window.postMessage({
        command: "setSpeedConfig",
        config: {
          ...speedConfig,
          cbDateNowChecked: true,
        },
      });
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

  // Keep cbDateNowChecked true continuously, including every animation frame.
  function forceDateNowCheckedEveryFrame() {
    setDateNowChecked();
    window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
  }

  setDateNowChecked();
  window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
})();