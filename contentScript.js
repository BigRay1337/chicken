let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "setSpeedConfig") {
    speedConfig = {
      ...speedConfig,
      ...(request.config || {}),
      speed: Number(request.config?.speed ?? speedConfig.speed) || 0,
      cbSetIntervalChecked: request.config?.cbSetIntervalChecked ?? speedConfig.cbSetIntervalChecked,
      cbSetTimeoutChecked: request.config?.cbSetTimeoutChecked ?? speedConfig.cbSetTimeoutChecked,
      cbPerformanceNowChecked: request.config?.cbPerformanceNowChecked ?? speedConfig.cbPerformanceNowChecked,
      cbDateNowChecked: request.config?.cbDateNowChecked ?? speedConfig.cbDateNowChecked,
      cbRequestAnimationFrameChecked: request.config?.cbRequestAnimationFrameChecked ?? speedConfig.cbRequestAnimationFrameChecked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });

    sendResponse({ ok: true });
  } else if (request.command === "getSpeedConfig") {
    sendResponse(speedConfig);
  }

  return true;
});

window.addEventListener("message", (e) => {
  if (!e.data || e.data.command !== "getSpeedConfig") return;

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
});
