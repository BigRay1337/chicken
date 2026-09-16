const EXTENSION_ID = chrome.runtime.id;

function sendDateNowStateToOpenTabs(enabled) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id === undefined || tab.id === null) continue;

      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        func: (state) => {
          window.postMessage({
            command: "extensionDateNowState",
            enabled: state,
          });
        },
        args: [enabled],
      }).catch(() => {});
    }
  });
}

// Disable: immediately tell every open tab that Date.now is disabled.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== EXTENSION_ID) return;
  sendDateNowStateToOpenTabs(false);
});

// Enable: immediately tell every open tab that Date.now is enabled again.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== EXTENSION_ID) return;
  sendDateNowStateToOpenTabs(true);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});
