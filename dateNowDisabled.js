(function () {
  "use strict";

  const originalDateNow = Date.now;
  let cbDateNowChecked = true;
  let dateNowValue = null;
  let previousDateNowValue = null;

  // Infinity is a numeric limit; repeating a string Infinity times throws RangeError.
  const LONG_DELAY = Infinity;

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    cbDateNowChecked = e.data.config?.cbDateNowChecked !== false;

    if (cbDateNowChecked) {
      const now = originalDateNow();
      dateNowValue = now;
      previousDateNowValue = now;
    }
  });

  Date.now = function () {
    const realNow = originalDateNow();

    // Only apply this override when cbDateNowChecked is disabled.
    if (cbDateNowChecked) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
      return realNow;
    }

    if (dateNowValue === null) {
      dateNowValue = realNow;
      previousDateNowValue = realNow;
      return Math.floor(0 + dateNowValue);
    }

    const elapsed = Math.max(0, realNow - previousDateNowValue);
    previousDateNowValue = realNow;

    // Infinity means there is no finite cap on elapsed time.
    const delayedElapsed = Math.min(elapsed, LONG_DELAY);
    dateNowValue += delayedElapsed;

    return Math.floor(0 + dateNowValue);
  };
})();
