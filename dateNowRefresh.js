// Swipe-up spoof helper for the Chicken extension.
// A 30-pixel upward swipe temporarily spoofs cbDateNowChecked=false,
// then immediately restores it to true. The extension itself is not
// actually disabled; only the page-facing configuration is spoofed.
(() => {
  const SWIPE_THRESHOLD_PX = 30;

  let touchStartY = null;
  let touchStartX = null;
  let swipeHandled = false;

  const spoofDateNowOffThenOn = () => {
    let config = null;

    const onConfig = (event) => {
      if (!event.data || event.data.command !== "setSpeedConfig" || !event.data.config) return;
      config = { ...event.data.config };
    };

    window.addEventListener("message", onConfig);
    window.postMessage({ command: "getSpeedConfig" });

    window.setTimeout(() => {
      window.removeEventListener("message", onConfig);

      const baseConfig = config || {
        speed: 0,
        cbSetIntervalChecked: true,
        cbSetTimeoutChecked: false,
        cbPerformanceNowChecked: false,
        cbDateNowChecked: true,
        cbRequestAnimationFrameChecked: false,
      };

      // Spoof extension OFF / Date.now disabled.
      window.postMessage({
        command: "setSpeedConfig",
        config: { ...baseConfig, cbDateNowChecked: false }
      });

      // Spoof extension back ON immediately.
      window.postMessage({
        command: "setSpeedConfig",
        config: { ...baseConfig, cbDateNowChecked: true }
      });
    }, 0);
  };

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    swipeHandled = false;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeHandled || touchStartY === null || !event.changedTouches || !event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touch.clientX - touchStartX;

    touchStartY = null;
    touchStartX = null;

    // Negative deltaY means the finger moved upward.
    if (deltaY <= -SWIPE_THRESHOLD_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
      swipeHandled = true;
      spoofDateNowOffThenOn();
    }
  }, { passive: true });
})();
