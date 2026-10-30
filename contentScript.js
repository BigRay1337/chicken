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
    speedConfig = Object.assign({}, speedConfig, request.config);
    window.postMessage({ command: "setSpeedConfig", config: speedConfig }, "*");
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    }, "*");
  } else if (e.data.command === "setSpeedConfig" && e.source === window) {
    // Keep popup settings synchronized with refresh-state changes.
    speedConfig = Object.assign({}, speedConfig, e.data.config);
  }
});
