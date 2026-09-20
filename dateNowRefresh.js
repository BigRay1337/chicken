// Refresh only the game when cbDateNowChecked becomes false.
(function () {
  let previousEnabled = null;

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // true -> false: tell pageScript to refresh the game only.
    if (previousEnabled === true && enabled === false) {
      window.postMessage({ command: "refreshJavaGameOnly" }, "*");
    }

    previousEnabled = enabled;
  });
})();
