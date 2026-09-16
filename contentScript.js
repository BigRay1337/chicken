let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: false,
  cbRequestAnimationFrameChecked: false,
};

function setDateNowLifecycleState(value) {
  speedConfig.cbDateNowChecked = value;
  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "setDateNowLifecycleState") {
    setDateNowLifecycleState(request.value);
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

// The extension is enabled when this content script exists again.
setDateNowLifecycleState(false);
