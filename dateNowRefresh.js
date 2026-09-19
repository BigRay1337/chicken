// Refresh the current game page whenever Date.now is disabled.
// Merged from Chicken-refresh.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    // Ignore the initial state so loading the extension does not refresh the game.
    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Refresh the Java/HTML5 game page whenever Date.now is disabled.
    if (enabled === false && !refreshScheduled) {
      refreshScheduled = true;
      window.setTimeout(function () {
        window.postMessage({ command: "refreshJavaGame" }, "*");
      }, 60);
    }

    // Permit another refresh after Date.now is enabled again.
    if (enabled === true) refreshScheduled = false;
    previousEnabled = enabled;
  });
})();
