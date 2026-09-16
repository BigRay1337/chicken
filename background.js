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

async function setDateNowExtensionStateInOpenTabs(enabled) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: "MAIN",
        func: (extensionEnabled) => {
          window.postMessage({
            command: "setExtensionDateNowState",
            enabled: extensionEnabled,
          });
        },
        args: [enabled],
      });
    } catch (error) {
      console.debug("Could not change Date.now state in tab", tab.id, error);
    }
  }
}

// When disabled in Manage Extensions, force cbDateNowChecked=false.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  setDateNowExtensionStateInOpenTabs(false);
});

// When enabled again in Manage Extensions, force cbDateNowChecked=false.
// Date.now stays frozen at its current dateNowValue.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  setDateNowExtensionStateInOpenTabs(false);
});
