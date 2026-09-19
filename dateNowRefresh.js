// Game-only refresh layer.
// This file never calls window.location.reload(), so the surrounding website is not reloaded.
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

    if (enabled === false && previousEnabled !== false) {
      window.postMessage({ command: "refreshJavaGameOnly" }, "*");
    }

    previousEnabled = enabled;
  });
})();
