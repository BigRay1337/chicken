(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const DATE_NOW_TOGGLE_PROGRESS = 0.5; // 2/4 of the refresh swipe threshold.
  const REFRESH_FLAG = "__chickenDateNowRefreshPending";

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;
  let dateNowToggledForSwipe = false;

  function toggleDateNowAtSwipeProgress() {
    if (dateNowToggledForSwipe) return;
    dateNowToggledForSwipe = true;

    // Send false, then true immediately at the halfway point.
    // The special flag updates the option state without freezing the game clock.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false, keepDateNowRunning: true }
    }, "*");
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: true, keepDateNowRunning: true }
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

    // Cover short/fast swipes that reach refresh without a halfway touchmove.
    if (!dateNowToggledForSwipe) toggleDateNowAtSwipeProgress();

    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });

  window.addEventListener("touchcancel", () => {
    swipeStartX = null;
    swipeStartY = null;
    dateNowToggledForSwipe = false;
  }, { passive: true });
})();
