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

// Detect the extension being disabled without changing the Date.now() implementation.
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
      clearTimeout(extensionCheckTimer);
      extensionCheckTimer = null;
    }
  }

  // setTimeout(..., 0) requests the next available event-loop turn.
  extensionCheckTimer = setTimeout(checkExtensionState, 0);
}

checkExtensionState();
