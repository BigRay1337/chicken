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
  let touchStartX = null;
  let touchStartY = null;
  const TAP_PIXELS = 0;

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
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (
      touchStartX === null ||
      touchStartY === null ||
      event.changedTouches.length !== 1
    ) {
      touchStartX = null;
      touchStartY = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    touchStartX = null;
    touchStartY = null;

    // A tap is exactly 0 pixels of movement.
    if (deltaX === TAP_PIXELS && deltaY === TAP_PIXELS) {
      // Disable Date.now for the tap-triggered game refresh.
      setDateNowChecked(false);

      // Ask pageScript to refresh only the game iframe, never the host page.
      window.postMessage({
        command: "refreshGameOnly",
      });
    }
  }, { passive: true });
})();