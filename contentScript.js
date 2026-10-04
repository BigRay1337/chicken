let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

(function () {
  let touchStartY = null;
  const SWIPE_UP_PIXELS = 30;
  const DATE_NOW_FALSE_DELAY_MS = 265.9;
  const REENABLE_DELAY_MS = .0;
  const REFRESH_DELAY_MS = .0;
  const REFRESH_PENDING_KEY = "chicken_refresh_then_disable_datenow";

  const setDateNowChecked = (checked) => {
    speedConfig = {
      ...speedConfig,
      cbDateNowChecked: checked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  };

  // After the refresh completes, disable DateNow 265.9 ms later.
  if (sessionStorage.getItem(REFRESH_PENDING_KEY) === "true") {
    sessionStorage.removeItem(REFRESH_PENDING_KEY);
    setTimeout(() => {
      setDateNowChecked(false);

      setTimeout(() => {
        setDateNowChecked(true);
      }, REENABLE_DELAY_MS);
    }, DATE_NOW_FALSE_DELAY_MS);
  }

  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (touchStartY === null || event.changedTouches.length !== 1) {
      touchStartY = null;
      return;
    }

    const touchEndY = event.changedTouches[0].clientY;
    const swipeDistance = touchStartY - touchEndY;
    touchStartY = null;

    if (swipeDistance >= SWIPE_UP_PIXELS) {
      // Refresh the game first.
      sessionStorage.setItem(REFRESH_PENDING_KEY, "true");
      window.location.reload();
    }
  }, { passive: true });
})();