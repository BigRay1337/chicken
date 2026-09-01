// Reload the page when Date.now changes from enabled to disabled.
// The isolated content script persists Date.now=ON before performing reload,
// so the state survives popup closure/recreation.
(function () {
  let previousEnabled = null;
  let refreshRequested = false;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    // Do not request a reload for the initial configuration.
    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Only react to the enabled -> disabled transition.
    if (previousEnabled === true && enabled === false && !refreshRequested) {
      refreshRequested = true;

      // Ask the isolated content script to persist ON and reload.
      window.postMessage({
        command: "dateNowDisabledNeedsReload",
      }, "*");
    }

    previousEnabled = enabled;
  });
})();
