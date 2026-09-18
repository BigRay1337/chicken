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
    window.postMessage(request);
    window.postMessage({
      command: "setDateNowState",
      enabled: request.config.cbDateNowChecked === true,
    });
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({ command: "setSpeedConfig", config: speedConfig });
  }
});

const EXTENSION_STATE_CHECK_MS = 250;
const DATE_NOW_DISABLE_DELAY_MS = 10000;

let extensionCheckTimer = null;
let extensionCheckPort = null;
let extensionIsEnabled = true;
let dateNowDisableTimer = null;

function setDateNowExtensionState(enabled) {
  if (extensionIsEnabled === enabled) return;
  extensionIsEnabled = enabled;

  window.postMessage({
    command: "setExtensionDateNowState",
    enabled: enabled,
  });

  if (enabled) {
    if (dateNowDisableTimer !== null) {
      clearTimeout(dateNowDisableTimer);
      dateNowDisableTimer = null;
    }

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  } else {
    if (dateNowDisableTimer !== null) {
      clearTimeout(dateNowDisableTimer);
    }

    dateNowDisableTimer = setTimeout(() => {
      dateNowDisableTimer = null;

      speedConfig = {
        ...speedConfig,
        cbDateNowChecked: false,
      };

      window.postMessage({
        command: "setSpeedConfig",
        config: speedConfig,
      });

      window.postMessage({
        command: "setDateNowState",
        enabled: false,
      });
    }, DATE_NOW_DISABLE_DELAY_MS);
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
