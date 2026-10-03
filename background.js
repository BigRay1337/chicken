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

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.command === "swipeUpRefresh" && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;

    // Force Date.now to remain enabled in every frame before reloading.
    chrome.tabs.sendMessage(tabId, { command: "forceDateNowTrue" });

    // Give every frame a moment to apply the setting, then refresh the game.
    setTimeout(() => {
      chrome.tabs.reload(tabId);
    }, 0);
  }
});
