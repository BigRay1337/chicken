let speedConfig = {
  speed: 0.25,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    // Merge partial updates so changing Date.now does not erase other settings.
    speedConfig = {
      ...speedConfig,
      ...(request.config || {}),
    };

    window.postMessage({
      ...request,
      config: speedConfig,
    });
  } else if (request.command == "getSpeedConfig") {
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
