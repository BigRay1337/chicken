// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// Set cbDateNowChecked to null in already-running pages when the extension is disabled.
chrome.management.onDisabled.addListener(async (info) => {
  if (info.id !== chrome.runtime.id) return;

  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      await chrome.tabs.sendMessage(tab.id, {
        command: "extensionDisabled"
      });
    } catch (error) {
      // The tab may not have an injected content script or may not allow messaging.
    }
  }
});

// Re-enable the scripts and set cbDateNowChecked back to true in existing tabs.
chrome.management.onEnabled.addListener(async (info) => {
  if (info.id !== chrome.runtime.id) return;

  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        files: ["pageScript.js"]
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["contentScript.js"]
      });

      await chrome.tabs.sendMessage(tab.id, {
        command: "extensionEnabled"
      });
    } catch (error) {
      console.debug("Could not re-enable Chicken in tab", tab.id, error);
    }
  }
});
