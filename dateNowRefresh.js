(function () {
  // Randomly delay the false state from 1000 ms down to 1 ms.
  const RARE_DELAY_MAX_MS = 1000;
  const RARE_DELAY_MIN_MS = 1;

  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";

  let disableTimer = null;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    });
  }

  function scheduleDateNowDisable() {
    if (disableTimer !== null) {
      clearTimeout(disableTimer);
    }

    // Pick an integer uniformly from 1000 down to 1 ms.
    const delay =
      RARE_DELAY_MAX_MS -
      Math.floor(
        Math.random() * (RARE_DELAY_MAX_MS - RARE_DELAY_MIN_MS + 1)
      );

    disableTimer = setTimeout(() => {
      disableTimer = null;
      setDateNowChecked(false);
    }, delay);
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // Refresh immediately and first. No fixed 9-second or other fixed delay.
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
    window.addEventListener(
      "DOMContentLoaded",
      schedulePendingDisableAfterRefresh,
      { once: true }
    );
  } else {
    schedulePendingDisableAfterRefresh();
  }

  let swipeStartX = null;
  let swipeStartY = null;

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!event.touches || event.touches.length !== 1) return;

      swipeStartX = event.touches[0].clientX;
      swipeStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (event) => {
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
    },
    { passive: true }
  );

  window.postMessage({ command: "getSpeedConfig" });
})();
