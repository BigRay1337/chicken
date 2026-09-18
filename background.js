// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

async function setDateNowExtensionStateInOpenTabs(enabled) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        func: (extensionEnabled) => {
          window.postMessage({
            command: "setExtensionDateNowState",
            enabled: extensionEnabled,
          });

          // Keep Date.now checked/active when the extension is enabled.
          window.postMessage({
            command: "setSpeedConfig",
            config: {
              speed: 0,
              cbSetIntervalChecked: true,
              cbSetTimeoutChecked: false,
              cbPerformanceNowChecked: false,
              cbDateNowChecked: extensionEnabled === true,
              cbRequestAnimationFrameChecked: false,
            },
          });
        },
        args: [enabled],
      });
    } catch (error) {
      console.debug("Could not change Date.now state in tab", tab.id, error);
    }
  }
}

chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  // Disable Date.now control cleanly before the extension is stopped.
  setDateNowExtensionStateInOpenTabs(false);
});

chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  // Restore Date.now as checked when the extension is enabled again.
  setDateNowExtensionStateInOpenTabs(true);
});
