// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }
});

async function postExtensionState(command) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        func: (stateCommand) => {
          window.postMessage({ command: stateCommand }, "*");
        },
        args: [command]
      });
    } catch (error) {
      console.debug("Could not update Chicken Date.now state in tab", tab.id, error);
    }
  }
}

async function setFalseThenTrueAfterDisable() {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        func: () => {
          window.postMessage({ command: "extensionDisabled" }, "*");

          setTimeout(() => {
            window.postMessage({ command: "extensionEnabled" }, "*");
          }, 690);
        }
      });
    } catch (error) {
      console.debug("Could not update Chicken Date.now disable state in tab", tab.id, error);
    }
  }
}

chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  setFalseThenTrueAfterDisable();
});

chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  postExtensionState("extensionEnabled");
});
