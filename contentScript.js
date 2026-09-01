let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

let dateNowReloadHandled = false;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

// The page-world Date.now watcher requests the reload. Persist the ON state
// before reloading so the popup closing/being recreated cannot overwrite it.
window.addEventListener("message", (e) => {
  if (!e.data) return;

  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
    return;
  }

  if (e.data.command === "dateNowDisabledNeedsReload" && !dateNowReloadHandled) {
    dateNowReloadHandled = true;

    const restoredConfig = {
      ...speedConfig,
      cbDateNowChecked: true,
    };

    // Commit the enabled state to extension storage first. The callback runs
    // before reload, so the state survives popup/window recreation.
    chrome.storage.local.set({ speedConfig: restoredConfig }, function () {
      speedConfig = restoredConfig;
      window.location.reload();
    });
  }
});
