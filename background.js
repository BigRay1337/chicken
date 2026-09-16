// background.js
chrome.runtime.onInstalled.addListener((details) => {
  // Verifica se é uma instalação ou atualização
  if (details.reason === "install" || details.reason === "update") {
    // Abre o link do PayPal em uma nova aba
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

// Chrome fires this when the extension is disabled from chrome://extensions.
// Date.now is turned OFF in the page without reloading the page.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  postExtensionState("extensionDisabled");
});

// Chrome fires this when the extension is enabled again.
// Date.now is turned back ON without reinjecting pageScript.js.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  postExtensionState("extensionEnabled");
});
