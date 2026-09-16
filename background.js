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

const sendExtensionState = async (command) => {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map((tab) => {
      if (!tab.id) return Promise.resolve();
      return chrome.tabs.sendMessage(tab.id, { command }).catch(() => {});
    }));
  } catch (e) {}
};

chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  sendExtensionState("extensionDisabled");
});

chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  sendExtensionState("extensionEnabled");
});
