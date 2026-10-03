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

  let swipeDateNowDisabled = false;

  function setDateNowChecked() {
    if (swipeDateNowDisabled) return;

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
    swipeDateNowDisabled = true;
    speedConfig = {
      ...speedConfig,
      cbDateNowChecked: false,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        ...speedConfig,
        cbDateNowChecked: false,
      },
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
        cbDateNowChecked: swipeDateNowDisabled
          ? false
          : true,
      };

      window.postMessage({
        command: "setSpeedConfig",
        config: {
          ...speedConfig,
          cbDateNowChecked: swipeDateNowDisabled
            ? false
            : true,
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

  // Keep cbDateNowChecked true continuously until a qualifying swipe disables it.
  function forceDateNowCheckedEveryFrame() {
    setDateNowChecked();
    window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
  }

  setDateNowChecked();
  window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
})();