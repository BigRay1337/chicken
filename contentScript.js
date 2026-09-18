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

    // Date.now is controlled independently by dateNowRefresh.js.
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
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

// Detect extension lifecycle changes without a tight 0ms polling loop.
const EXTENSION_STATE_CHECK_MS = 250;
const DATE_NOW_DISABLE_DELAY_MS = 2500;

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
    // Cancel the pending 2.5 second disable if the extension becomes available again.
    if (dateNowDisableTimer !== null) {
      clearTimeout(dateNowDisableTimer);
      dateNowDisableTimer = null;
    }

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  } else {
    // Keep cbDateNowChecked active for 2.5 seconds after the extension is disabled.
    // Then explicitly set it false.
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
