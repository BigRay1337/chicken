(function () {
  "use strict";

  const SWIPE_THRESHOLD_PX = 30;
  const DATE_NOW_FALLBACK_SPEED = 0.25;
  const PENDING_REFRESH_KEY = "__chickenDateNowRefreshPending";

  let cbDateNowChecked = true;
  let refreshRequested = false;
  let pendingRefresh = false;

  try {
    pendingRefresh = sessionStorage.getItem(PENDING_REFRESH_KEY) === "1";
  } catch (error) {
    pendingRefresh = false;
  }

  function setDateNowChecked(enabled) {
    cbDateNowChecked = enabled;

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled,
        speed: DATE_NOW_FALLBACK_SPEED,
      },
    }, "*");
  }

  window.addEventListener("message", (event) => {
    if (!event.data) return;

    if (
      event.data.command === "setSpeedConfig" &&
      typeof event.data.config?.cbDateNowChecked === "boolean"
    ) {
      cbDateNowChecked = event.data.config.cbDateNowChecked;
      return;
    }

    // dateNowDisabled.js sends this only after the refreshed game's canvas
    // has appeared, remained stable, and the Date.now controller is installed.
    if (event.data.command === "gameRefreshReady" && pendingRefresh) {
      pendingRefresh = false;

      try {
        sessionStorage.removeItem(PENDING_REFRESH_KEY);
      } catch (error) {
        // The pending flag is only a reload handoff; continue with this load.
      }

      setDateNowChecked(false);
    }
  });

  window.postMessage({ command: "getSpeedConfig" }, "*");

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
      Math.abs(deltaX) > Math.abs(deltaY) ||
      refreshRequested
    ) {
      return;
    }

    // Persist the handoff before reloading. Date.now remains unchanged until
    // the new game load signals that its canvas is fully initialized.
    try {
      sessionStorage.setItem(PENDING_REFRESH_KEY, "1");
    } catch (error) {
      return;
    }

    refreshRequested = true;
    window.location.reload();
  }, { passive: true });
})();
