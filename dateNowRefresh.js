// Game-only refresh layer.
// When cbDateNowChecked is false, refresh the game without reloading the website.
(function () {
  let refreshScheduled = false;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const dateNowDisabled = data.config.cbDateNowChecked === false;

    if (dateNowDisabled && !refreshScheduled) {
      refreshScheduled = true;

      // Let the setting update finish, then refresh only the game.
      window.setTimeout(function () {
        window.postMessage({ command: "refreshJavaGameOnly" }, "*");

        // Allow another false-state refresh after 1 second.
        window.setTimeout(function () {
          refreshScheduled = false;
        }, 1000);
      }, 0);
    }

    if (!dateNowDisabled) {
      refreshScheduled = false;
    }
  });
})();
