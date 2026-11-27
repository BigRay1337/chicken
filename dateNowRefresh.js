(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 6789;
  const DATE_NOW_BEFORE_REFRESH_MS = 1;

  let swipeStartX = null;
  let swipeStartY = null;
  let swipeRefreshTimer = null;
  let refreshStarted = false;

  function resetSwipe() {
    swipeStartX = null;
    swipeStartY = null;
  }

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    }, "*");
  }

  window.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1 || refreshStarted) {
      resetSwipe();
      return;
    }

    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null || refreshStarted) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) {
      resetSwipe();
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    resetSwipe();

    // A swipe-up has a negative Y delta and must be mostly vertical.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaY) <= Math.abs(deltaX)) return;

    if (swipeRefreshTimer !== null) clearTimeout(swipeRefreshTimer);
    swipeRefreshTimer = setTimeout(() => {
      refreshStarted = true;
      setDateNowChecked(false);
      setTimeout(() => window.location.reload(), DATE_NOW_BEFORE_REFRESH_MS);
    }, SWIPE_DELAY_MS);
  }, { passive: true });

  window.addEventListener("touchcancel", resetSwipe, { passive: true });
})();