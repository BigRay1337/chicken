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

// 30-pixel upward swipe: temporarily disable Date.now, then immediately
// re-enable it. dateNowRefresh.js refreshes the game when it sees the
// false transition.
(function () {
  let startY = null;
  let swipeTriggered = false;

  document.addEventListener("touchstart", function (event) {
    if (!event.touches || !event.touches.length) return;
    startY = event.touches[0].clientY;
    swipeTriggered = false;
  }, { passive: true });

  document.addEventListener("touchmove", function (event) {
    if (startY === null || swipeTriggered) return;
    if (!event.touches || !event.touches.length) return;

    const currentY = event.touches[0].clientY;
    const upwardDistance = startY - currentY;

    if (upwardDistance >= 30) {
      swipeTriggered = true;

      const disabledConfig = {
        ...speedConfig,
        cbDateNowChecked: false,
      };

      speedConfig = disabledConfig;
      window.postMessage({
        command: "setSpeedConfig",
        config: disabledConfig,
      });

      const enabledConfig = {
        ...speedConfig,
        cbDateNowChecked: true,
      };

      speedConfig = enabledConfig;
      window.postMessage({
        command: "setSpeedConfig",
        config: enabledConfig,
      });
    }
  }, { passive: true });

  document.addEventListener("touchend", function () {
    startY = null;
    swipeTriggered = false;
  }, { passive: true });

  document.addEventListener("touchcancel", function () {
    startY = null;
    swipeTriggered = false;
  }, { passive: true });
})();
