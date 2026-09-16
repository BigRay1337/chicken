// background.js
chrome.runtime.onInstalled.addListener((details) => {
  // Verifica se é uma instalação ou atualização
  if (details.reason === "install" || details.reason === "update") {
    // Abre o link do PayPal em uma nova aba
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }

  chrome.storage.local.set({ cbDateNowChecked: false });
});

// When the extension is enabled/reloaded by Chrome, mark Date.now as enabled.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ cbDateNowChecked: false });
});

// Chrome does not provide an event to an extension when that same extension
// is disabled from chrome://extensions. Code stops running when disabled, so
// cbDateNowChecked cannot reliably be changed at that exact moment.
