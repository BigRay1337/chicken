// Date.now controller.
// When enabled, Date.now stays frozen at the value captured when the
// controller is enabled. This intentionally freezes websites that use
// Date.now for their elapsed-time logic.
(function () {
  const originalDateNow = Date.now;

  let extensionIsEnabled = true;
  let cbDateNowChecked = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  Date.now = function () {
    if (!extensionIsEnabled || !cbDateNowChecked) {
      return originalDateNow();
    }

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      const nextChecked = data.config.cbDateNowChecked === true;

      if (nextChecked && !cbDateNowChecked) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      cbDateNowChecked = nextChecked;

      if (!cbDateNowChecked) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
      return;
    }

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      if (extensionIsEnabled) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
        cbDateNowChecked = true;
      } else {
        cbDateNowChecked = false;
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
    }
  });

  window.postMessage({ command: "getSpeedConfig" });
})();