// Reload only the top-level game page when Date.now changes from enabled to disabled.
// This file stays separate from pageScript.js.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  const originalDateNow = Date.now;
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

    // Only handle the initial configuration without refreshing.
    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Only refresh the top-level game page when Date.now changes from
    // enabled to disabled. Never reload an embedded iframe/frame.
    if (
      previousEnabled === true &&
      enabled === false &&
      !refreshScheduled &&
      window.top === window.self
    ) {
      refreshScheduled = true;
      originalSetTimeout(function () {
        try {
          window.top.location.reload();
        } catch (error) {
          console.debug("Could not refresh the game page", error);
        }
      }, 60);
    }

    previousEnabled = enabled;
  });
})();
