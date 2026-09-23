// Website refresh while Date.now is disabled.
// Active while cbDateNowChecked is false.
// Uses a new delay from 0 through 1000 ms before each website reload.

(function () {
  "use strict";

  let previousEnabled = null;
  let refreshTimer = null;

  const MIN_DELAY = 0;
  const MAX_DELAY = 1000;

  function getDelay() {
    return Math.floor(
      MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY + 1)
    );
  }

  function scheduleWebsiteRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;

      // Refresh the current website page.
      window.location.reload();

      // If reload is prevented, keep the refresh loop active.
      scheduleWebsiteRefresh();
    }, getDelay());
  }

  function stopWebsiteRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;

    if (
      !data ||
      data.command !== "setSpeedConfig" ||
      !data.config
    ) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    if (enabled === false) {
      // Keep website refresh active with a 0-1000 ms delay.
      scheduleWebsiteRefresh();
    } else {
      stopWebsiteRefresh();
    }

    previousEnabled = enabled;
  });
})();
