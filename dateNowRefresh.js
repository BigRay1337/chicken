// Reload the page only when Date.now is changed from enabled to disabled.
// This file is intentionally separate from pageScript.js so the original
// Date.now implementation and timing code are not modified.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  const originalDateNow = Date.now;
  const originalClearTimeout = window.clearTimeout;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = null;
  let previusDateNowValue = null;

  Date.now = () => {
    const originalValue = originalDateNow();

    if (dateNowValue !== null) {
      if (!extensionIsEnabled) {
        dateNowValue = originalValue;
      }
    } else {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      // Date.now stays frozen while the extension is enabled.
      // It runs normally only after the extension is disabled.
      if (!extensionIsEnabled) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
      return;
    }

    if (data.command !== "setSpeedConfig" || !data.config) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    // Do not refresh for the initial configuration received during page load.
    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Only refresh on the transition: Date.now enabled -> disabled.
    if (previousEnabled === true && enabled === false && !refreshScheduled) {
      refreshScheduled = true;
      originalSetTimeout(function () {
        window.location.reload();
      }, 60);
    }

    previousEnabled = enabled;
  });
})();
