// background.js

const setDateNowForOpenTabs = (enabled) => {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;

      chrome.tabs.sendMessage(tab.id, {
        command: "setDateNowChecked",
        enabled,
      }).catch(() => {});
    }
  });
};

chrome.management.onDisabled.addListener((info) => {
  if (info.id === chrome.runtime.id) {
    setDateNowForOpenTabs(false);
  }
});

chrome.management.onEnabled.addListener((info) => {
  if (info.id === chrome.runtime.id) {
    setDateNowForOpenTabs(true);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});
