(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";

  function disableBeforeRefresh() {
    try {
      window.postMessage({ command: "getSpeedConfig" });

      window.addEventListener("message", (event) => {
        if (event.data?.command !== "setSpeedConfig") return;

        // Disable requestAnimationFrame before the game refresh.
        window.postMessage({
          command: "setSpeedConfig",
          config: {
            ...event.data.config,
            cbRequestAnimationFrameChecked: false,
          },
        });

        // Keep Date.now enabled until the refreshed game starts.
      }, { once: true });
    } catch (_) {}
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // Disable RAF first, then refresh immediately.
    disableBeforeRefresh();
    window.location.reload();
  }

  function disableDateNowAfterRefresh() {
    try {
      if (sessionStorage.getItem(PENDING_DISABLE_KEY) !== "true") {
        return;
      }

      sessionStorage.removeItem(PENDING_DISABLE_KEY);

      window.postMessage({ command: "getSpeedConfig" });

      window.addEventListener("message", (event) => {
        if (event.data?.command !== "setSpeedConfig") return;

        // Date.now is disabled immediately after the game refresh.
        window.postMessage({
          command: "setSpeedConfig",
          config: {
            ...event.data.config,
            cbDateNowChecked: false,
          },
        });
      }, { once: true });
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", disableDateNowAfterRefresh, {
      once: true,
    });
  } else {
    disableDateNowAfterRefresh();
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
