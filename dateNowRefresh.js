// Independent Date.now controller.
// Runs in the page's MAIN world without replacing the website's timers,
// animation frames, or other JavaScript APIs.
(function () {
  const originalDateNow = Date.now;

  let extensionIsEnabled = true;
  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  Date.now = function () {
    const originalValue = originalDateNow();

    // When cbDateNowChecked is false, leave the website's Date.now timing
    // running normally. This prevents sites from freezing or failing.
    if (!cbDateNowChecked || !extensionIsEnabled) {
      return originalValue;
    }

    if (dateNowValue === null) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;
    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      cbDateNowChecked = data.config.cbDateNowChecked === true;

      if (!cbDateNowChecked) {
        // Restore real browser Date.now immediately.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      } else {
        // Start Date.now control from the current browser time.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
      return;
    }

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      // Do not leave the website with a stale Date.now value when the
      // extension is disabled.
      if (!extensionIsEnabled) {
        cbDateNowChecked = false;
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
    }
  });

  window.postMessage({ command: "getSpeedConfig" });
})();