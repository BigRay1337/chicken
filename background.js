// background.js
chrome.runtime.onInstalled.addListener((details) => {
  // Verifica se é uma instalação ou atualização
  if (details.reason === "install" || details.reason === "update") {
    // Abre o link do PayPal em uma nova aba
    chrome.tabs.create({
      url: "https://www.paypal.com/donate/?hosted_button_id=WBGKBJ73EDAW2"
    });
  }

  chrome.storage.local.set({ cbDateNowChecked: true });
});

// Best-effort state change when Chrome unloads the extension.
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.local.set({ cbDateNowChecked: false });
});
