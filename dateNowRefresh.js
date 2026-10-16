// Refresh the page immediately when Date.now is disabled.
// pageScript.js also reloads directly in its swipe handler for the lowest latency.
(() => {
  let refreshStarted = false;

  const refreshImmediately = () => {
    if (refreshStarted) return;
    refreshStarted = true;
    window.location.reload();
  };

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (data.config.cbDateNowChecked === false) {
      refreshImmediately();
    }
  });
})();
