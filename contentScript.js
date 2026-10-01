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
  const REENABLE_DELAY_MS = 1;
  const REFRESH_DELAY_MS = 9;

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
      // Disable DateNow/extension state.
      setDateNowChecked(false);

      // Re-enable after 1 ms.
      setTimeout(() => {
        setDateNowChecked(true);

        // Refresh the game 9 ms after re-enabling.
        setTimeout(() => {
          window.location.reload();
        }, REFRESH_DELAY_MS);
      }, REENABLE_DELAY_MS);
    }
  }, { passive: true });
})();