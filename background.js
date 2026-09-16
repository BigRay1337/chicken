// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// Chrome fires this when the extension is disabled from Manage Extensions.
// Tell already-injected content scripts to leave Date.now enabled.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;

      chrome.tabs.sendMessage(
        tab.id,
        { command: "setDateNowLifecycleState", value: true },
        () => {
          // A tab may not have a content-script context. Ignore that safely.
          void chrome.runtime.lastError;
        }
      );
    }
  });
});

// When enabled again, inject the isolated content script into existing tabs.
// The content script sets cbDateNowChecked back to false without reloading
// the page, so Date.now continues without a refresh/black screen.
chrome.management.onEnabled.addListener(async (info) => {
  if (info.id !== chrome.runtime.id) return;

  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["contentScript.js"]
      });
    } catch (error) {
      console.debug("Could not re-enable Chicken in tab", tab.id, error);
    }
  }
});
