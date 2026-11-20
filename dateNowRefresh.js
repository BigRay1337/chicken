(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const DATE_NOW_TOGGLE_PROGRESS = 0.25 / 4;
  const REFRESH_FLAG = "__chickenDateNowRefreshPending";
  const WAITING_FOR_RESUME_FLAG = "__chickenDateNowWaitingForResume";

  let swipeStartX = null;
  let swipeStartY = null;
  let refreshRequested = false;
  let dateNowToggledForSwipe = false;
  let resumeSwipe = false;

  function readWaitingForResume() {
    try {
      return window.sessionStorage.getItem(WAITING_FOR_RESUME_FLAG) === "1";
    } catch (_) {
      return false;
    }
  }

  function toggleDateNowForResume() {
    if (dateNowToggledForSwipe) return;
    dateNowToggledForSwipe = true;

    // False resumes the clock; true restores the option state without
    // freezing the running game clock again.
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: false }
    }, "*");
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: true, keepDateNowRunning: true }
    }, "*");

    try {
      window.sessionStorage.removeItem(WAITING_FOR_RESUME_FLAG);
    } catch (_) {}
  }

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
    dateNowToggledForSwipe = false;
    resumeSwipe = readWaitingForResume();
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (swipeStartX === null || swipeStartY === null ||
        !event.touches || event.touches.length !== 1 ||
        dateNowToggledForSwipe) return;

    const deltaX = event.touches[0].clientX - swipeStartX;
    const deltaY = event.touches[0].clientY - swipeStartY;
    const requiredProgress = SWIPE_THRESHOLD_PX * DATE_NOW_TOGGLE_PROGRESS;

    if (deltaY <= -requiredProgress && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (resumeSwipe || readWaitingForResume()) {
        resumeSwipe = true;
        toggleDateNowForResume();
      }
    }
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    swipeStartX = null;
    swipeStartY = null;

    if (Math.abs(deltaX) > Math.abs(deltaY) || deltaY >= 0) return;

    // If the page is waiting for the resume swipe, this gesture only
    // resumes Date.now; it must not trigger another page refresh.
    if (resumeSwipe || readWaitingForResume()) {
      if (!dateNowToggledForSwipe) toggleDateNowForResume();
      return;
    }

    if (deltaY > -SWIPE_THRESHOLD_PX || refreshRequested) return;

    refreshRequested = true;
    try {
      window.sessionStorage.setItem(REFRESH_FLAG, "1");
    } catch (_) {}

    window.setTimeout(() => window.location.reload(), 50);
  }, { passive: true });

  window.addEventListener("touchcancel", () => {
    swipeStartX = null;
    swipeStartY = null;
    dateNowToggledForSwipe = false;
    resumeSwipe = false;
  }, { passive: true });
})();
