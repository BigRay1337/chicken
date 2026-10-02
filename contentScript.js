let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

// A 30px upward swipe disables Date.now, immediately re-enables it,
// then reloads the page so the game starts from a clean page state.
(function () {
  let startY = null;
  let swipeTriggered = false;

  document.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) return;
    startY = event.touches[0].clientY;
    swipeTriggered = false;
  }, { passive: true });

  document.addEventListener("touchmove", function (event) {
    if (startY === null || swipeTriggered) return;
    if (!event.touches || event.touches.length !== 1) return;

    const upwardDistance = startY - event.touches[0].clientY;
    if (upwardDistance < 30) return;

    swipeTriggered = true;

    const disabledConfig = {
      ...speedConfig,
      cbDateNowChecked: false,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: disabledConfig,
    });

    const enabledConfig = {
      ...disabledConfig,
      cbDateNowChecked: true,
    };

    speedConfig = enabledConfig;

    window.postMessage({
      command: "setSpeedConfig",
      config: enabledConfig,
    });

    // Refresh only after the true state has been posted.
    window.location.reload();
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
