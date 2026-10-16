// Refresh immediately when Date.now is disabled.
// A string with "9".repeat(Infinity) cannot be created in JavaScript; it throws RangeError.
(() => {
  let refreshScheduled = false;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (data.config.cbDateNowChecked === false && !refreshScheduled) {
      refreshScheduled = true;
      window.location.reload();
    }
  });
})();
