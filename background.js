const EXTENSION_ID = chrome.runtime.id;
const STATE_DELAY_MS = 1.7;

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

// Chrome fires this when the extension is disabled from chrome://extensions.
// Set cbDateNowChecked to false after the requested 1.7 ms delay.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== EXTENSION_ID) return;

  setTimeout(() => {
    sendDateNowStateToOpenTabs(false);
  }, STATE_DELAY_MS);
});

// Chrome fires this when the extension is enabled again.
// Set cbDateNowChecked to true after the same requested 1.7 ms delay.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== EXTENSION_ID) return;

  setTimeout(() => {
    sendDateNowStateToOpenTabs(true);
  }, STATE_DELAY_MS);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});
