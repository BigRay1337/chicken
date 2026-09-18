// Independent Date.now controller.
// Date.now runs directly through this source file and remains separate
// from the main pageScript.js speed/timer implementation.
(function () {
  const originalDateNow = Date.now;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;

  // Keep Date.now implemented directly in the source.
  // The game's JavaScript calls Date.now() normally and reaches this function.
  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setExtensionDateNowState") return;

    extensionIsEnabled = data.enabled === true;

    if (!extensionIsEnabled) {
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    } else {
      // Start a new frozen value when Date.now control is enabled again.
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    }
  });
})();
