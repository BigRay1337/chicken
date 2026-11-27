(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 6789;
  const REFRESH_PROGRESS = 10 / 100;
  const LAST_LOAD_DURATION_KEY = "chickenLastGameLoadDurationMs";
  const REFRESH_ARMED_KEY = "chickenDateNowRefreshArmed";
  const FALLBACK_LOAD_DURATION_MS = 6789;

  let cbDateNowChecked = true;
  let swipeRefreshTimer = null;

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
      },
    });
  }

  function readSessionNumber(key) {
    try {
      const value = Number(sessionStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function saveCompletedLoadDuration() {
    try {
      const navigation = performance.getEntriesByType("navigation")[0];
      const measured = navigation && navigation.loadEventEnd > 0
        ? navigation.loadEventEnd
        : performance.now();

      if (Number.isFinite(measured) && measured > 0) {
        sessionStorage.setItem(LAST_LOAD_DURATION_KEY, String(measured));
      }
    } catch (_) {
      // Storage may be unavailable; the fallback estimate remains usable.
    }
  }

  window.addEventListener("load", saveCompletedLoadDuration, { once: true });
  if (document.readyState === "complete") {
    saveCompletedLoadDuration();
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

  // Only apply the 43.21% trigger to a refresh initiated by swipe-up.
  let refreshArmed = false;
  try {
    refreshArmed = sessionStorage.getItem(REFRESH_ARMED_KEY) === "1";
    if (refreshArmed) sessionStorage.removeItem(REFRESH_ARMED_KEY);
  } catch (_) {
    refreshArmed = false;
  }

  if (refreshArmed) {
    const estimatedLoadDuration =
      readSessionNumber(LAST_LOAD_DURATION_KEY) || FALLBACK_LOAD_DURATION_MS;
    const triggerAtMs = estimatedLoadDuration * REFRESH_PROGRESS;
    const elapsedSinceNavigation = performance.now();
    const remainingMs = Math.max(0, triggerAtMs - elapsedSinceNavigation);

    setTimeout(() => {
      setDateNowChecked(false);
    }, remainingMs);
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

    if (swipeRefreshTimer !== null) {
      clearTimeout(swipeRefreshTimer);
    }

    // Keep the existing swipe-up delay, then begin the game refresh.
    swipeRefreshTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(REFRESH_ARMED_KEY, "1");
      } catch (_) {
        // Without session storage, the page can still refresh normally.
      }

      window.location.reload();
    }, SWIPE_DELAY_MS);
  }, { passive: true });
})();
