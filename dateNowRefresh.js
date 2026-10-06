(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";

  function disableAfterRefresh() {
    try {
      if (sessionStorage.getItem(PENDING_DISABLE_KEY) !== "true") {
        return;
      }

      sessionStorage.removeItem(PENDING_DISABLE_KEY);

      // First action after the refresh: disable requestAnimationFrame.
      window.postMessage({ command: "getSpeedConfig" });

      window.addEventListener("message", (event) => {
        if (event.data?.command !== "setSpeedConfig") return;

        const rafDisabledConfig = {
          ...event.data.config,
          cbRequestAnimationFrameChecked: false,
        };

        // RAF is disabled first in the sequence.
        window.postMessage({
          command: "setSpeedConfig",
          config: rafDisabledConfig,
        });

        // Date.now is disabled only after RAF.
        window.postMessage({
          command: "setSpeedConfig",
          config: {
            ...rafDisabledConfig,
            cbDateNowChecked: false,
          },
        });
      }, { once: true });

      window.postMessage({ command: "getSpeedConfig" });
    } catch (_) {}
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // Refresh first; the next page starts the disable sequence with RAF.
    window.location.reload();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", disableAfterRefresh, {
      once: true,
    });
  } else {
    disableAfterRefresh();
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
