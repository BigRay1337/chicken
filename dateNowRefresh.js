// Date.now disabled refresh helper.
// This is intentionally separate from pageScript.js so the existing Date.now
// implementation is not modified.
(() => {
  let refreshScheduled = false;
  const refreshDelay = 12345678;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (data.config.cbDateNowChecked === false && !refreshScheduled) {
      refreshScheduled = true;
      window.setTimeout(() => {
        window.location.reload();
      }, refreshDelay);
    }
  });
})();
