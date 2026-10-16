// Refresh the page immediately when Date.now is disabled.
// pageScript.js detects swipe-up and posts the updated speed configuration.
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
