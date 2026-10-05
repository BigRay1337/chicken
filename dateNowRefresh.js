(function () {
  // Set LONG_DELAY_MS anywhere from 1 to 1000 ms.
  const LONG_DELAY_MIN_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;
  const LONG_DELAY_MAX_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;
  const LONG_DELAY_MS = 999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999;

  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";

  let disableTimer = null;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    });
  }

  function setRequestAnimationFrameChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbRequestAnimationFrameChecked: enabled },
    });
  }

  function scheduleDateNowDisable() {
    if (disableTimer !== null) {
      clearTimeout(disableTimer);
    }

    const delay = Math.min(
      LONG_DELAY_MAX_MS,
      Math.max(LONG_DELAY_MIN_MS, LONG_DELAY_MS)
    );

    disableTimer = setTimeout(() => {
      disableTimer = null;
      // Date.now goes false first; requestAnimationFrame follows immediately.
      setDateNowChecked(false);
      setRequestAnimationFrameChecked(false);
    }, delay);
  }

  function handleSwipeUp() {
    // Mark the swipe before refreshing so the next page can continue the sequence.
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // IMPORTANT: refresh happens immediately and first.
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

  // Only the page that was loaded by the swipe schedules the delayed false state.
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
;

})();
;
);
;
;
;
nfig" });
})();
;

})();
;
);
;
;
;
