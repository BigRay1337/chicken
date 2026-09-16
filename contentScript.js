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
let spoofedCbDateNowChecked = true;

function postExtensionState(enabled) {
  spoofedCbDateNowChecked = enabled === true;
  window.postMessage({
    command: "extensionState",
    enabled: spoofedCbDateNowChecked,
  });
}

function checkExtensionContext() {
  try {
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
  if (request.command === "setExtensionState") {
    postExtensionState(request.enabled === true);
    return;
  }

  if (request.command === "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        ...speedConfig,
        cbDateNowChecked: spoofedCbDateNowChecked,
      },
    });
  } else if (request.command === "getSpeedConfig") {
    sendResponse({
      ...speedConfig,
      cbDateNowChecked: spoofedCbDateNowChecked,
    });
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        ...speedConfig,
        cbDateNowChecked: spoofedCbDateNowChecked,
      },
    });
  }
});
