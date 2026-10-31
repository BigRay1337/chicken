(function () {
  "use strict";

  // Capture the browser's native Date.now before pageScript.js replaces it.
  const nativeDateNow = Date.now.bind(Date);
  let dateNowEnabled = true;
  let frozenDateNow = nativeDateNow();

  function applyDateNowConfig(config) {
    const nextEnabled = config?.cbDateNowChecked !== false;

    if (dateNowEnabled && !nextEnabled) {
      frozenDateNow = nativeDateNow();
    } else if (!dateNowEnabled && nextEnabled) {
      frozenDateNow = nativeDateNow();
    }

    dateNowEnabled = nextEnabled;
  }

  function fixedDateNow() {
    return dateNowEnabled ? nativeDateNow() : frozenDateNow;
  }

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.command !== "setSpeedConfig") return;
    applyDateNowConfig(event.data.config || {});
    // pageScript.js may have replaced Date.now earlier in this same startup
    // sequence, so restore this wrapper after its synchronous initialization.
    Date.now = fixedDateNow;
  });

  Date.now = fixedDateNow;

  // Restore after pageScript.js finishes executing, without editing that file.
  Promise.resolve().then(function () {
    Date.now = fixedDateNow;
  });
})();
