(() => {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DATE_NOW_DELAY_MS = 264.9;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable_at";

  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  let swipeDateNowDisabled = false;
  let pendingDisableTimer = null;

  function postDateNowState(checked) {
    speedConfig = {
      ...speedConfig,
      cbDateNowChecked: checked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: {
        ...speedConfig,
        cbDateNowChecked: checked,
      },
    });
  }

  function disableDateNow() {
    swipeDateNowDisabled = true;
    postDateNowState(false);

    try {
      localStorage.removeItem(PENDING_DISABLE_KEY);
    } catch (e) {}
  }

  function schedulePendingDateNowDisable() {
    let disableAt = null;

    try {
      const stored = localStorage.getItem(PENDING_DISABLE_KEY);
      if (stored !== null) disableAt = Number(stored);
    } catch (e) {}

    if (!Number.isFinite(disableAt)) return;

    const now = performance.timeOrigin + performance.now();
    const remaining = disableAt - now;

    if (remaining <= 0) {
      disableDateNow();
      return;
    }

    if (pendingDisableTimer !== null) {
      clearTimeout(pendingDisableTimer);
    }

    pendingDisableTimer = setTimeout(() => {
      pendingDisableTimer = null;
      disableDateNow();
    }, remaining);
  }

  function handleSwipeUp() {
    // Persist the deadline so the state change survives the immediate top-layer reload.
    try {
      const disableAt =
        performance.timeOrigin +
        performance.now() +
        SWIPE_DATE_NOW_DELAY_MS;

      localStorage.setItem(PENDING_DISABLE_KEY, String(disableAt));
    } catch (e) {}

    // Refresh the top-layer game immediately.
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

  // Keep cbDateNowChecked true until the pending 264.9ms deadline is reached.
  function forceDateNowCheckedEveryFrame() {
    if (!swipeDateNowDisabled) {
      postDateNowState(true);
    }
    window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
  }

  schedulePendingDateNowDisable();
  if (!swipeDateNowDisabled) {
    postDateNowState(true);
  }
  window.requestAnimationFrame(forceDateNowCheckedEveryFrame);
})();