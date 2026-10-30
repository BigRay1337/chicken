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
  const data = e && e.data;
  if (!data || typeof data !== "object") return;

  if (data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
    return;
  }

  // Keep the isolated-world copy in sync with the MAIN-world refresh
  // controller. During a swipe refresh this reflects the suspended hooks;
  // when the page finishes loading it reflects the restored user settings.
  if (data.command === "setSpeedConfig" && data.config && typeof data.config === "object") {
    speedConfig = Object.assign({}, speedConfig, data.config);
  }
});