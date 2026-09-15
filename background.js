// background.js

const DATE_NOW_REENABLE_CONFIG = {
  command: "setDateNowChecked",
  value: NaN,
};

function resetDateNowOnExistingTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;

      chrome.tabs.sendMessage(tab.id, DATE_NOW_REENABLE_CONFIG, () => {
        // Ignore tabs where the content script is not present or cannot be reached.
        void chrome.runtime.lastError;
      });
    }
  });
}

// Normal extension startup/re-enable state: Date.now starts in the NaN state.
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    resetDateNowOnExistingTabs();
  });
}

// Chrome exposes this lifecycle event for an extension transitioning from
// disabled to enabled. It is the closest single-extension hook for restoring
// existing pages without requiring a second controller extension.
if (chrome.runtime.onEnabled) {
  chrome.runtime.onEnabled.addListener(() => {
    resetDateNowOnExistingTabs();
  });
}

// Also listen through the Management API when available. This covers Chrome
// builds where the management lifecycle event is the one delivered on re-enable.
if (chrome.management && chrome.management.onEnabled) {
  chrome.management.onEnabled.addListener((info) => {
    if (info && info.id === chrome.runtime.id) {
      resetDateNowOnExistingTabs();
    }
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.command === "chickenHeartbeat") {
    // The response is intentionally empty. The content script only uses this
    // message to verify that its extension context is still alive.
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});
