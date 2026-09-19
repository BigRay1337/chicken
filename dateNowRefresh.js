// Independent Date.now controller.
// Refresh/reinitialize Date.now every time cbDateNowChecked changes
// between false and true in the extension app.
(function () {
  const originalDateNow = Date.now;

  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (cbDateNowChecked === true) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      const newCheckedState = data.config.cbDateNowChecked === true;

      // Refresh/reinitialize Date.now every time the checkbox changes.
      if (newCheckedState !== cbDateNowChecked) {
        cbDateNowChecked = newCheckedState;

        // Start Date.now from a fresh browser value on both transitions:
        // false -> true and true -> false.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      } else {
        cbDateNowChecked = newCheckedState;
      }

      return;
    }

    if (data.command === "setExtensionDateNowState") {
      if (data.enabled !== true) {
        cbDateNowChecked = false;
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      return;
    }
  });
})();
