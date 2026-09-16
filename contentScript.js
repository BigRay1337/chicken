if (!globalThis.__chickenContentScriptStarted) {
  globalThis.__chickenContentScriptStarted = true;

  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false,
  };

  const HEARTBEAT_MS = 250;

  const postExtensionState = (command) => {
    window.postMessage({ command }, "*");
  };

  postExtensionState("extensionEnabled");

  setInterval(() => {
    try {
      chrome.runtime.getURL("");
      postExtensionState("extensionHeartbeat");
    } catch (error) {
      // The extension context has been invalidated.
    }
  }, HEARTBEAT_MS);

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
}