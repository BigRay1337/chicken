// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// When the extension is enabled again from Manage Extensions, the existing
// page scripts are still present in open tabs, but the isolated content
// script needs to be started again so its heartbeat can turn cbDateNowChecked
// back to true.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (!/^https?:\/\//i.test(tab.url)) continue;

      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["contentScript.js"]
      }).catch(() => {
        // Some tabs do not allow script injection; ignore those tabs.
      });
    }
  });
});
