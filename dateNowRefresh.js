// Date.now refresh controller.
// This script is the bridge between the extension checkbox and pageScript.js.
// It does not override Date.now itself.

(function () {
  let dateNowRefreshEnabled = true;

  function setDateNowRefreshState(enabled) {
    dateNowRefreshEnabled = enabled === true;

    window.postMessage({
      command: "setDateNowRefreshState",
      enabled: dateNowRefreshEnabled,
    });
  }

  window.addEventListener("message", (e) => {
    if (!e.data) return;

    if (e.data.command === "setSpeedConfig" && e.data.config) {
      setDateNowRefreshState(e.data.config.cbDateNowChecked === true);
    }
  });

  // Ask contentScript for the current checkbox state.
  window.postMessage({ command: "getSpeedConfig" });
})();
