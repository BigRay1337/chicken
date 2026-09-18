// Independent Date.now controller.
// Date.now runs directly through this source file.
// cbDateNowChecked must remain false for 999 seconds before the
// Date.now state is explicitly kept false.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  const DATE_NOW_FALSE_DELAY_MS = 999000;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let dateNowFalseTimer = null;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  function startDateNowFalseTimer() {
    if (dateNowFalseTimer !== null) {
      return;
    }

    dateNowFalseTimer = originalSetTimeout(function () {
      dateNowFalseTimer = null;

      // Keep Date.now disabled after cbDateNowChecked has remained false
      // for the full 999 seconds.
      window.postMessage({
        command: "setDateNowState",
        enabled: false,
      });
    }, DATE_NOW_FALSE_DELAY_MS);
  }

  function cancelDateNowFalseTimer() {
    if (dateNowFalseTimer !== null) {
      window.clearTimeout(dateNowFalseTimer);
      dateNowFalseTimer = null;
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      if (data.config.cbDateNowChecked === false) {
        startDateNowFalseTimer();
      } else {
        cancelDateNowFalseTimer();
      }
      return;
    }

    if (data.command !== "setExtensionDateNowState") return;

    extensionIsEnabled = data.enabled === true;

    if (!extensionIsEnabled) {
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    } else {
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
      cancelDateNowFalseTimer();
    }
  });
})();
