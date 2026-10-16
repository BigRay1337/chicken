// Date.now disabled refresh helper.
// This is intentionally separate from pageScript.js so the existing Date.now
// implementation is not modified.
(() => {
  let refreshScheduled = false;

  // An infinite wait must not be passed to setTimeout: browsers may clamp
  // Infinity to a very short delay. Leave the refresh callback unscheduled.
  const refreshDelay = Infinity;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (data.config.cbDateNowChecked === false && !refreshScheduled) {
      refreshScheduled = true;

      if (Number.isFinite(refreshDelay)) {
        window.setTimeout(() => {
          window.location.reload();
        }, refreshDelay);
      }
      // refreshDelay === Infinity: intentionally never execute the callback.
    }
  });
})();
