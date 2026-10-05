(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_SWIPE_KEY = "__chicken_pending_swipe_refresh__";

  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  // Keep the complete config so changing one checkbox does not erase
  // the other speed settings.
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.command === "setSpeedConfig" && event.data.config) {
      speedConfig = { ...speedConfig, ...event.data.config };
    }
  });

  function updateConfig(changes) {
    speedConfig = { ...speedConfig, ...changes };
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }

  function disableImmediatelyAfterRefresh() {
    // No 999 ms timer: disable Date.now and requestAnimationFrame immediately
    // after the refresh completes.
    updateConfig({
      cbDateNowChecked: false,
      cbRequestAnimationFrameChecked: false,
    });
  }

  function finishPendingSwipe() {
    try {
      if (sessionStorage.getItem(PENDING_SWIPE_KEY) !== "true") return;
      sessionStorage.removeItem(PENDING_SWIPE_KEY);
      disableImmediatelyAfterRefresh();
    } catch (_) {
      // Still perform the disable sequence if sessionStorage is unavailable.
      disableImmediatelyAfterRefresh();
    }
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_SWIPE_KEY, "true");
    } catch (_) {}

    // Refresh first, immediately.
    window.location.reload();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", finishPendingSwipe, { once: true });
  } else {
    finishPendingSwipe();
  }

  let startX = null;
  let startY = null;

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;

    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (startX === null || startY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    startX = null;
    startY = null;

    // Swipe up = at least 30 px upward and more vertical than horizontal.
    if (deltaY >= -SWIPE_THRESHOLD_PX || Math.abs(deltaX) >= Math.abs(deltaY)) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  // Get the current extension configuration before the swipe sequence starts.
  window.postMessage({ command: "getSpeedConfig" });
})();