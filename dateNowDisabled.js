(function () {
  "use strict";

  const originalDateNow = Date.now;
  let cbDateNowChecked = true;
  let dateNowValue = null;
  let previousDateNowValue = null;

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    cbDateNowChecked = e.data.config?.cbDateNowChecked !== false;

    // Capture the native timestamp when Date.now is disabled.
    const now = originalDateNow();
    dateNowValue = now;
    previousDateNowValue = now;
  });

  Date.now = function () {
    const realNow = originalDateNow();

    // When enabled, use the native Date.now value unchanged.
    if (cbDateNowChecked) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
      return realNow;
    }

    // When disabled, freeze at the native timestamp captured on toggle.
    if (dateNowValue === null) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
    }

    return Math.floor(dateNowValue);
  };
})();
