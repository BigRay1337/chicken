// background.js

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

// When the extension is enabled again from chrome://extensions,
// static content scripts are not automatically injected into tabs
// that were already open. Re-inject both worlds so Date.now() starts
// working again without requiring a page refresh.
chrome.management.onEnabled.addListener(async (info) => {
  if (info.id !== chrome.runtime.id) return;

  try {
    const tabs = await chrome.tabs.query({});

    await Promise.all(
      tabs.map(async (tab) => {
        if (!tab.id || !tab.url || /^(chrome|chrome-extension|edge|about|brave):\/\//i.test(tab.url)) {
          return;
        }

        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ["pageScript.js"],
            world: "MAIN",
            injectImmediately: true,
          });

          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ["contentScript.js"],
            world: "ISOLATED",
            injectImmediately: true,
          });
        } catch (error) {
          // Some tabs cannot be scripted (browser/internal pages).
          console.debug("Could not re-enable chicken in tab", tab.id, error);
        }
      })
    );
  } catch (error) {
    console.error("Failed to re-enable chicken after extension enable:", error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "chickenHeartbeat") {
    sendResponse({ ok: true });
  }
});
