let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

// Tell the page-world script that the extension is currently enabled.
// This heartbeat stops automatically when Chrome disables the extension.
const EXTENSION_HEARTBEAT_MS = 250;
const sendExtensionHeartbeat = () => {
  window.postMessage({ command: "extensionHeartbeat", enabled: true }, "*");
};

sendExtensionHeartbeat();
setInterval(sendExtensionHeartbeat, EXTENSION_HEARTBEAT_MS);

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
