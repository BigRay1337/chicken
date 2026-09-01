// Reload the page only when Date.now is changed from enabled to disabled.
// This file is intentionally separate from pageScript.js so the original
// Date.now implementation and timing code are not modified.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) {
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
      window.setTimeout(function () {
        window.location.reload();
      },);
    }

    previousEnabled = enabled;
  });
})();
