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

// When the extension starts running after being enabled, mark Date.now as enabled.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ cbDateNowChecked: true });
});

// Track the extension's state from the Extensions management page.
// Chrome may terminate the service worker immediately after disabling,
// so the 0.123456789-second delay is best-effort.
const EXTENSION_STATE_DELAY_MS = 123.456789;

if (chrome.management && chrome.management.onDisabled) {
  chrome.management.onDisabled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
      setTimeout(() => {
        chrome.storage.local.set({ cbDateNowChecked: false });
      }, EXTENSION_STATE_DELAY_MS);
    }
  });
}

if (chrome.management && chrome.management.onEnabled) {
  chrome.management.onEnabled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
      chrome.storage.local.set({ cbDateNowChecked: true });
    }
  });
}
