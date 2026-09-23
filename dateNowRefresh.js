// Website page refresh while Date.now is disabled.
// Active while cbDateNowChecked is false.
// Refreshes the current page after exactly 1000 ms.

(function () {
  "use strict";

  let refreshTimer = null;

  const REFRESH_DELAY = 1000;

  function schedulePageRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;

      // Refresh the current page after 1000 ms.
      window.location.reload();
    }, REFRESH_DELAY);
  }

  function stopPageRefresh() {
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

    const cbDateNowChecked = data.config.cbDateNowChecked !== false;

    if (!cbDateNowChecked) {
      // Date.now is disabled: refresh the page after 1000 ms.
      schedulePageRefresh();
    } else {
      stopPageRefresh();
    }
  });
})();
