(function () {
  "use strict";

  const originalDateNow = Date.now;
  const UNFREEZE_SESSION_KEY = "__chicken_date_now_unfrozen";
  let swipeUnfrozen = false;
  try {
    swipeUnfrozen = sessionStorage.getItem(UNFREEZE_SESSION_KEY) === "1";
    if (swipeUnfrozen) sessionStorage.removeItem(UNFREEZE_SESSION_KEY);
  } catch (error) {}

  let cbDateNowChecked = swipeUnfrozen;
  let frozenDateNow = originalDateNow();

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig" || !e.data.config) return;

    const nextChecked = swipeUnfrozen || e.data.config.cbDateNowChecked === true;
    if (nextChecked && !cbDateNowChecked) {
      frozenDateNow = originalDateNow();
    } else if (!nextChecked && cbDateNowChecked) {
      frozenDateNow = originalDateNow();
    }
    cbDateNowChecked = nextChecked;
  });

  Date.now = function () {
    if (cbDateNowChecked) return originalDateNow();
    return Math.floor(frozenDateNow);
  };
})();