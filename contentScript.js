let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

// Keep the page informed that the extension is still enabled.
// When the extension is disabled from Manage Extensions, this stops immediately.
const EXTENSION_HEARTBEAT_INTERVAL_MS = 100;

const sendExtensionHeartbeat = () => {
  window.postMessage({
    command: "extensionHeartbeat",
  });
};

sendExtensionHeartbeat();
setInterval(sendExtensionHeartbeat, EXTENSION_HEARTBEAT_INTERVAL_MS);

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
