let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: true,
  cbPerformanceNowChecked: true,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.command) return;

  if (request.command === "setSpeedConfig" && request.config) {
    speedConfig = { ...speedConfig, ...request.config };
    window.postMessage(
      { command: "setSpeedConfig", config: speedConfig },
      "*"
    );
    sendResponse?.({ success: true });
    return true;
  }

  if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
    return true;
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.command === "getSpeedConfig") {
    window.postMessage(
      { command: "setSpeedConfig", config: speedConfig },
      "*"
    );
  }
});
