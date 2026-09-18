// Independent Date.now controller.
// Date.now runs separately and remains active when cbDateNowChecked is false.
(function () {
  const originalDateNow = Date.now;

  let extensionIsEnabled = true;
  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  Date.now = function () {
    const originalValue = originalDateNow();

    // dateNowRefresh owns Date.now when cbDateNowChecked is false.
    if (!cbDateNowChecked) {
      if (!extensionIsEnabled) {
        dateNowValue = originalValue;
      }
    } else {
      // Preserve the same source implementation while the checkbox is true.
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    // Explicitly accept the checkbox state from the extension app.
    if (data.command === "setSpeedConfig" && data.config) {
      cbDateNowChecked = data.config.cbDateNowChecked === true;

      // Keep a fresh Date.now value whenever the checkbox changes.
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
      return;
    }

    if (data.command !== "setExtensionDateNowState") return;

    extensionIsEnabled = data.enabled === true;

    // Reset to a fresh value when the extension state changes.
    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;
  });

  // Request the current extension configuration so this file can run
  // correctly even though it is separate from pageScript.js.
  window.postMessage({ command: "getSpeedConfig" });
})();