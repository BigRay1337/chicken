// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// When the extension is enabled again from Manage Extensions, restart the
// content/page scripts in tabs that were already open.
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
    } catch (error) {
      // Chrome blocks script injection on some protected/internal pages.
      console.debug("Could not re-enable Chicken in tab", tab.id, error);
    }
  }
});
