// Independent Date.now controller.
// cbDateNowChecked is the only setting that enables or disables Date.now control.
// This file stays separate from pageScript.js speed/timer code.
(function () {
  const originalDateNow = Date.now;

  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  // Date.now is controlled directly by cbDateNowChecked.
  Date.now = function () {
    const originalValue = originalDateNow();

    if (!cbDateNowChecked) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    // The checkbox state directly controls Date.now.
    if (data.command === "setSpeedConfig" && data.config) {
      const newChecked = data.config.cbDateNowChecked === true;

      if (newChecked !== cbDateNowChecked) {
        cbDateNowChecked = newChecked;

        // Start from the current browser time whenever the setting changes.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      return;
    }

    // Also accept direct Date.now state messages for extension lifecycle handling.
    if (data.command === "setExtensionDateNowState") {
      cbDateNowChecked = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    }
  });

  // Request the current configuration so cbDateNowChecked is initialized
  // from the extension's actual checkbox setting.
  window.postMessage({ command: "getSpeedConfig" });
})();
