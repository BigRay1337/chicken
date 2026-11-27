(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DELAY_MS = 6789;
  const DATE_NOW_BEFORE_REFRESH_MS = 1;
  const DATE_NOW_REFRESH_PENDING_KEY = "__chickenDateNowRestoreAfterRefresh";

  let swipeStartX = null;
  let swipeStartY = null;
  let swipeRefreshTimer = null;
  let refreshStarted = false;

  function setDateNowChecked(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: { cbDateNowChecked: enabled },
    }, "*");
  }

  function restoreDateNowAfterRefresh() {
    let shouldRestore = false;
    try {
      shouldRestore = sessionStorage.getItem(DATE_NOW_REFRESH_PENDING_KEY) === "1";
      if (shouldRestore) sessionStorage.removeItem(DATE_NOW_REFRESH_PENDING_KEY);
    } catch (_) {}

    if (!shouldRestore) return;

    const restore = () => {
      // Restore Date.now after the refreshed game document has loaded.
      setDateNowChecked(true);
    };

    if (document.readyState === "complete") {
      setTimeout(restore, 0);
    } else {
      window.addEventListener("load", restore, { once: true });
    }
  }

  function resetSwipe() {
    swipeStartX = null;
    swipeStartY = null;
  }

  restoreDateNowAfterRefresh();

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

    // Upward, mostly vertical swipe only.
    if (deltaY > -SWIPE_THRESHOLD_PX || Math.abs(deltaY) <= Math.abs(deltaX)) return;

    if (swipeRefreshTimer !== null) clearTimeout(swipeRefreshTimer);
    swipeRefreshTimer = setTimeout(() => {
      refreshStarted = true;
      try {
        sessionStorage.setItem(DATE_NOW_REFRESH_PENDING_KEY, "1");
      } catch (_) {}

      setDateNowChecked(false);
      setTimeout(() => window.location.reload(), DATE_NOW_BEFORE_REFRESH_MS);
    }, SWIPE_DELAY_MS);
  }, { passive: true });

  window.addEventListener("touchcancel", resetSwipe, { passive: true });
})();