(function () {
  const LONG_DELAY_MS = 9000;
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";

  let disableTimer = null;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    });
  }

  function disableDateNowAndRequestAnimationFrame() {
    setDateNowChecked(false);
    window.postMessage({
      command: "disableRequestAnimationFrame",
    });
  }

  function scheduleDateNowDisable() {
    if (disableTimer !== null) {
      clearTimeout(disableTimer);
    }

    disableTimer = setTimeout(() => {
      disableTimer = null;
      disableDateNowAndRequestAnimationFrame();
    }, LONG_DELAY_MS);
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    window.location.reload();
  }

  function schedulePendingDisableAfterRefresh() {
    try {
      if (sessionStorage.getItem(PENDING_DISABLE_KEY) !== "true") {
        return;
      }

      sessionStorage.removeItem(PENDING_DISABLE_KEY);
      scheduleDateNowDisable();
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", schedulePendingDisableAfterRefresh, {
      once: true,
    });
  } else {
    schedulePendingDisableAfterRefresh();
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
