let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

// Date.now OFF automatically keeps requestAnimationFrame enabled in pageScript.
const normalizeSpeedConfig = (config) => ({
  ...config,
  cbRequestAnimationFrameChecked:
    Boolean(config.cbRequestAnimationFrameChecked) ||
    config.cbDateNowChecked === false,
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = normalizeSpeedConfig(request.config);
    window.postMessage({
      ...request,
      config: speedConfig,
    });
  } else if (request.command == "getSpeedConfig") {
    sendResponse(normalizeSpeedConfig(speedConfig));
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    speedConfig = normalizeSpeedConfig(speedConfig);
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});
