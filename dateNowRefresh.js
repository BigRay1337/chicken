// Refresh immediately when Date.now is disabled.
(() => {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (data.config.cbDateNowChecked === false) {
      // Do not schedule a timeout: reload as soon as the setting message arrives.
      window.location.reload();
    }
  });
})();
