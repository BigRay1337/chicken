let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

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

// Detect extension lifecycle changes without a tight 0ms polling loop.
// A 0ms recursive timer can monopolize the page's event loop and cause
// freezing/crashes, especially while the extension is being disabled.
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

  // When the extension is enabled again, restore the user's normal speed config.
  if (enabled) {
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
    // The extension is no longer available. Tell pageScript to return Date.now()
    // to normal 1x behavior, then stop polling so the page event loop is free.
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
