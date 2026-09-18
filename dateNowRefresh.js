// Independent Date.now controller.
// Date.now control runs independently of cbDateNowChecked.
// The checkbox can remain disabled while this controller continues
// providing the frozen Date.now value.
(function () {
  const originalDateNow = Date.now;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  Date.now = function () {
    if (!extensionIsEnabled) {
      return originalDateNow();
    }

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      // Intentionally ignore data.config.cbDateNowChecked.
      // dateNowRefresh remains active even when the checkbox is disabled.
      return;
    }

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      if (extensionIsEnabled) {
        // Re-anchor the frozen value when the extension becomes active.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      } else {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
    }
  });

  window.postMessage({ command: "getSpeedConfig" });
})();