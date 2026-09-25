// Swipe-up refresh helper for the Chicken game tab.
// Swipe up -> refresh immediately. After the reload completes, wait 3000 ms
// and then disable Date.now spoofing. This file no longer watches for a
// pre-existing cbDateNowChecked === false state.
(() => {
  const SWIPE_THRESHOLD_PX = 60;
  const DISABLE_AFTER_RELOAD_MS = 3000;
  const PENDING_RELOAD_KEY = "chickenSwipeUpRefreshPending";

  let touchStartY = null;
  let touchStartX = null;
  let swipeHandled = false;

  const disableDateNowAfterReload = () => {
    let config = null;

    const onConfig = (event) => {
      if (!event.data || event.data.command !== "setSpeedConfig" || !event.data.config) return;
      config = { ...event.data.config, cbDateNowChecked: false };
    };

    window.addEventListener("message", onConfig);
    window.postMessage({ command: "getSpeedConfig" });

    window.setTimeout(() => {
      window.removeEventListener("message", onConfig);
      const nextConfig = config || { cbDateNowChecked: false };
      nextConfig.cbDateNowChecked = false;
      window.postMessage({ command: "setSpeedConfig", config: nextConfig });
    }, DISABLE_AFTER_RELOAD_MS);
  };

  if (sessionStorage.getItem(PENDING_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(PENDING_RELOAD_KEY);
    disableDateNowAfterReload();
  }

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    swipeHandled = false;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeHandled || touchStartY === null || !event.changedTouches || !event.changedTouches.length) return;

    const touch = event.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touch.clientX - touchStartX;

    touchStartY = null;
    touchStartX = null;

    // Negative deltaY means the finger moved upward.
    if (deltaY <= -SWIPE_THRESHOLD_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
      swipeHandled = true;
      sessionStorage.setItem(PENDING_RELOAD_KEY, "1");
      window.location.reload();
    }
  }, { passive: true });
})();
