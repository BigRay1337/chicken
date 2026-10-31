(function () {
  "use strict";

  // Capture the browser's native Date.now before pageScript.js replaces it.
  const nativeDateNow = Date.now.bind(Date);
  let dateNowEnabled = true;
  let frozenDateNow = nativeDateNow();

  function applyDateNowConfig(config) {
    const nextEnabled = config?.cbDateNowChecked !== false;

    if (dateNowEnabled && !nextEnabled) {
      // Freeze the exact timestamp at the moment Date.now is disabled.
      frozenDateNow = nativeDateNow();
    } else if (!dateNowEnabled && nextEnabled) {
      // Resume from the real clock when Date.now is enabled again.
      frozenDateNow = nativeDateNow();
    }

    dateNowEnabled = nextEnabled;
  }

  // Re-apply after pageScript.js initializes its own Date.now wrapper.
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.command !== "setSpeedConfig") return;
    applyDateNowConfig(event.data.config || {});
  });

  Date.now = function () {
    return dateNowEnabled ? nativeDateNow() : frozenDateNow;
  };
})();
