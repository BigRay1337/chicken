let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: NaN,
  cbRequestAnimationFrameChecked: false,
};

let extensionContextAlive = true;
let startupStateSent = false;

const setDateNowState = (value) => {
  speedConfig.cbDateNowChecked = value;
  window.postMessage({
    command: "setDateNowChecked",
    value,
  });
};

// Every fresh/re-enabled content-script instance starts with Date.now disabled
// by the speed hack. NaN is intentional and is preserved by postMessage.
setDateNowState(NaN);
startupStateSent = true;

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

// A disabled extension cannot run its service worker/content script anymore,
// but already-injected content scripts can remain in existing pages. Watch for
// the extension context disappearing and make the page-side Date.now override
// fall back to the enabled/true state.
const checkExtensionContext = () => {
  if (!extensionContextAlive) return;

  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error("Extension context unavailable");
    }

    chrome.runtime.sendMessage({ command: "chickenHeartbeat" }, () => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "";
        if (/context invalidated|receiving end does not exist|message port closed/i.test(message)) {
          extensionContextAlive = false;
          setDateNowState(true);
        }
      }
    });
  } catch (error) {
    extensionContextAlive = false;
    setDateNowState(true);
  }
};

const watchdog = setInterval(checkExtensionContext, 250);

window.addEventListener("unload", () => {
  clearInterval(watchdog);
});
