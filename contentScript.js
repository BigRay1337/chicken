let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

const HEARTBEAT_INTERVAL_MS = 200;
let heartbeatTimer = null;

function sendExtensionHeartbeat() {
  window.postMessage({ command: "extensionHeartbeat", enabled: true });
}

function startExtensionHeartbeat() {
  if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
  sendExtensionHeartbeat();
  heartbeatTimer = setInterval(sendExtensionHeartbeat, HEARTBEAT_INTERVAL_MS);
}

startExtensionHeartbeat();

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
