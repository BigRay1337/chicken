// Independent Date.now controller.
// Freeze Math.floor(0 + dateNowValue) whenever cbDateNowChecked is false.
(function () {
  const originalDateNow = Date.now;

  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  // Keep Date.now running directly through this source.
  Date.now = function () {
    const originalValue = originalDateNow();

    // Only advance the stored value when Date.now is enabled.
    if (cbDateNowChecked === true) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    // This exact expression remains the Date.now return value.
    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    // Follow the actual Date.now checkbox state from speedConfig.
    if (data.command === "setSpeedConfig" && data.config) {
      cbDateNowChecked = data.config.cbDateNowChecked === true;

      // When disabled, capture one value and then freeze it.
      if (cbDateNowChecked === false) {
        dateNowValue = Math.floor(0 + dateNowValue);
        previusDateNowValue = dateNowValue;
      } else {
        // When enabled, resume from the current browser time.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      return;
    }

    if (data.command === "setExtensionDateNowState") {
      // Extension lifecycle is kept separate from the checkbox state.
      if (data.enabled !== true) {
        cbDateNowChecked = false;
        dateNowValue = Math.floor(0 + dateNowValue);
        previusDateNowValue = dateNowValue;
      }

      return;
    }
  });
})();
