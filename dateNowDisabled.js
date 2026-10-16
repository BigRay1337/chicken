(function () {
  "use strict";

  const originalDateNow = Date.now;
  let cbDateNowChecked = true;
  let dateNowValue = null;
  let previousDateNowValue = null;

  // Use numeric Infinity as an unbounded elapsed-time cap.
  const LONG_DELAY = Number.POSITIVE_INFINITY;

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

    dateNowValue += Math.min(elapsed, LONG_DELAY);

    return Math.floor(0 + dateNowValue);
  };
})();
