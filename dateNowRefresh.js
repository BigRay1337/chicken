// Use this file as the Date.now-disabled refresh controller.
// When cbDateNowChecked is false, ask pageScript to refresh only the game.
(function () {
  let refreshScheduled = false;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const checked = data.config.cbDateNowChecked === true;

    // cbDateNowChecked=false is the trigger. Do not reload the website.
    if (checked === false && !refreshScheduled) {
      refreshScheduled = true;

      window.postMessage({
        command: "refreshJavaGameOnly"
      }, "*");

      // Prevent repeated setSpeedConfig messages from repeatedly
      // refreshing the game during the same disabled state.
      window.setTimeout(function () {
        refreshScheduled = false;
      }, 1000);
    }

    // Reset the one-refresh lock when Date.now is enabled again.
    if (checked === true) {
      refreshScheduled = false;
    }
  });
})();
