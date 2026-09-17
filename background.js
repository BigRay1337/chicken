// background.js
chrome.runtime.onInstalled.addListener((details) => {
  // Verifica se é uma instalação ou atualização
  if (details.reason === "install" || d,etails.reason === "update") {
    // Abre o link do PayPal em uma nova aba
    chrome.tabs.create({
    });
  }
});

async function setDateNowExtensionStateInOpenTabs(enabled) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.id || !tab.url || !/^https?:|^file:/.test(tab.url)) continue;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true},
        world: "MAIN"
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

// Force cbDateNowChecked=true immediately when this extension is disabled.
chrome.management.onDisabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;
  setDateNowExtensionStateInOpenTabs(true);
});

// Restore cbDateNowChecked=false when this extension is enabled again.
chrome.management.onEnabled.addListener((info) => {
  if (info.id !== chrome.runtime.id) return;

  setDateNowExtensionStateInOpenTabs(true);
});
rome.runtime.id) return;

  setDateNowExtensionStateInOpenTabs(true);
});
});

ensionStateInOpenTabs(true);
});
});


});

