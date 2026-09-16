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
  } else if (request.command === "extensionDisabled") {
    speedConfig.cbDateNowChecked = false;
    window.postMessage({ command: "extensionDisabled" });
  } else if (request.command === "extensionEnabled") {
    speedConfig.cbDateNowChecked = true;
    window.postMessage({ command: "extensionEnabled" });
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "extensionDisabled") {
    speedConfig.cbDateNowChecked = false;
    return;
  }

  if (e.data.command === "extensionEnabled") {
    speedConfig.cbDateNowChecked = true;
    return;
  }

  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});
