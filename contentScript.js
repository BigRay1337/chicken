let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
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

  const setRequestAnimationFrameChecked = (checked) => {
    speedConfig = {
      ...speedConfig,
      cbRequestAnimationFrameChecked: checked,
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
      // Disable requestAnimationFrame immediately when the 30px swipe is detected.
      setRequestAnimationFrameChecked(false);

      // Refresh the game after the requestAnimationFrame state is disabled.
      window.location.reload();
    }
  }, { passive: true });
})();
