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
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

// The page script starts with cbDateNowChecked=false while the extension
// is enabled. If Chrome disables this extension, this content script can
// detect that its extension runtime has been invalidated and tell the page
// to change cbDateNowChecked to true. No reload is used.
let extensionCheckTimer = null;
let extensionCheckPort = null;
let extensionStateSent = false;

function postExtensionState(enabled) {
  const cbDateNowChecked = enabled !== true;
  window.postMessage({
    command: "setExtensionDateNowState",
    enabled: enabled === true,
  });
  extensionStateSent = true;
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

    // Extension is currently enabled.
    if (!extensionStateSent) {
      postExtensionState(true);
    }
  } catch (error) {
    // The extension context has been invalidated, which is what we expect
    // after disabling the extension from chrome://extensions.
    window.postMessage({
      command: "setExtensionDateNowState",
      enabled: false,
    });

    if (extensionCheckTimer !== null) {
      clearInterval(extensionCheckTimer);
      extensionCheckTimer = null;
    }
  }
}

checkExtensionState();
extensionCheckTimer = setInterval(checkExtensionState, 500);
