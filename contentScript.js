let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: false,
  cbRequestAnimationFrameChecked: false,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    speedConfig.cbDateNowChecked = false;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    speedConfig.cbDateNowChecked = false;
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    speedConfig.cbDateNowChecked = false;
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

// Keep cbDateNowChecked false while the extension is running.
// Date.now() itself continues using speedConfig.speed.
let extensionCheckTimer = null;
let extensionCheckPort = null;
let extensionIsEnabled = true;

function setDateNowExtensionState(enabled) {
  if (extensionIsEnabled === enabled) return;
  extensionIsEnabled = enabled;
  window.postMessage({
    command: "setExtensionDateNowState",
    enabled: enabled,
  });
}

function checkExtensionState() {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error("Extension runtime unavailable");
    }

    if (extensionCheckPort === null) {
      extensionCheckPort = chrome.runtime.connect({ name: "extension-state-check" });
      extensionCheckPort.onDisconnect.addListener(() => {
        extensionCheckPort = null;
      });
    }

    setDateNowExtensionState(true);
  } catch (error) {
    setDateNowExtensionState(false);
    if (extensionCheckTimer !== null) {
      clearInterval(extensionCheckTimer);
      extensionCheckTimer = null;
    }
  }
}

checkExtensionState();
extensionCheckTimer = setInterval(checkExtensionState, 500);
