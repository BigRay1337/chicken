let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

const EXTENSION_HEARTBEAT_INTERVAL_MS = 200;
let heartbeatTimer = null;

function postExtensionState(enabled) {
  window.postMessage({
    command: "extensionState",
    enabled,
  });
}

function checkExtensionContext() {
  try {
    // Calling a runtime API makes this check fail when the extension context
    // has been invalidated by disabling/reloading the extension.
    chrome.runtime.getURL("");
    postExtensionState(true);
  } catch (error) {
    postExtensionState(false);
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }
}

checkExtensionContext();
heartbeatTimer = setInterval(checkExtensionContext, EXTENSION_HEARTBEAT_INTERVAL_MS);

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
