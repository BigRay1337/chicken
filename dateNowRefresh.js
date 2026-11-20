(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const DATE_NOW_TOGGLE_PROGRESS = 0.75;
  const REFRESH_FLAG = "__chickenDateNowRefreshPending";

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;
  let dateNowToggledForSwipe = false;

  function toggleDateNowAtSwipeProgress() {
    if (dateNowToggledForSwipe) return;
    dateNowToggledForSwipe = true;

    // Briefly switch Date.now off, then immediately restore it.
    // The swipe refresh itself remains responsible for the page reload.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: true }
    }, "*");
  }

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
    dateNowToggledForSwipe = false;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (swipeStartX === null || swipeStartY === null ||
        !event.touches || event.touches.length !== 1 ||
        refreshRequested || dateNowToggledForSwipe) return;

    const deltaX = event.touches[0].clientX - swipeStartX;
    const deltaY = event.touches[0].clientY - swipeStartY;
    const requiredProgress = SWIPE_THRESHOLD_PX * DATE_NOW_TOGGLE_PROGRESS;

    if (deltaY <= -requiredProgress &&
        Math.abs(deltaY) > Math.abs(deltaX)) {
      toggleDateNowAtSwipeProgress();
    }
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    swipeStartX = null;
    swipeStartY = null;

    if (deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        refreshRequested) return;

    refreshRequested = true;

    // Cover short/fast swipes that reach the refresh threshold without
    // delivering a touchmove event at the three-quarter point.
    if (!dateNowToggledForSwipe) toggleDateNowAtSwipeProgress();

    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    // Keep the existing refresh handoff delay.
    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });

  window.addEventListener("touchcancel", () => {
    swipeStartX = null;
    swipeStartY = null;
    dateNowToggledForSwipe = false;
  }, { passive: true });
})();
