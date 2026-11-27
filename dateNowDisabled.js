(function () {
  "use strict";
  const originalDateNow = Date.now;
  let isUnfrozen = false;
  const frozenValue = originalDateNow();

  // Every newly loaded/refreshed document starts frozen.
  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.command === "chickenUnfreezeDateNow") {
      isUnfrozen = true;
    }
  });

  Date.now = function () {
    return isUnfrozen ? originalDateNow() : frozenValue;
  };
})();