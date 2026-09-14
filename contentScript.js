let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

let extensionContextAlive = true;

function checkExtensionContext() {
  if (!extensionContextAlive) return;
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      extensionContextAlive = false;
      window.postMessage({ command: "extensionDisabled" });
    }
  } catch (error) {
    extensionContextAlive = false;
    window.postMessage({ command: "extensionDisabled" });
  }
}

// An already-injected content script can remain on an existing page after
// the extension is disabled. Detect the invalidated extension context so
// pageScript.js can restore the native Date.now().
setInterval(checkExtensionContext, 250);
checkExtensionContext();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!extensionContextAlive) return;

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
