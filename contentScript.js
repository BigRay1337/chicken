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
    speedConfig = {
      ...request.config,
      cbDateNowChecked: false,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });

    window.postMessage({
      command: "setExtensionDateNowState",
      enabled: true,
    });
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

// Detect whether the extension is still available without a tight polling loop.
const EXTENSION_STATE_CHECK_MS = 250;
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

  if (enabled) {
    speedConfig.cbDateNowChecked = false;
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
}

function scheduleExtensionStateCheck() {
  if (extensionCheckTimer !== null) {
    clearTimeout(extensionCheckTimer);
  }

  extensionCheckTimer = setTimeout(() => {
    extensionCheckTimer = null;
    checkExtensionState();
  }, EXTENSION_STATE_CHECK_MS);
}

function checkExtensionState() {
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error("Extension runtime unavailable");
    }

    if (extensionCheckPort === null) {
      extensionCheckPort = chrome.runtime.connect({
        name: "extension-state-check",
      });

      extensionCheckPort.onDisconnect.addListener(() => {
        extensionCheckPort = null;
      });
    }

    setDateNowExtensionState(true);
    scheduleExtensionStateCheck();
  } catch (error) {
    setDateNowExtensionState(false);

    if (extensionCheckTimer !== null) {
      clearTimeout(extensionCheckTimer);
      extensionCheckTimer = null;
    }

    if (extensionCheckPort !== null) {
      extensionCheckPort = null;
    }
  }
}

checkExtensionState();
