(function () {
  "use strict";
  const originalDateNow = Date.now;
  let isUnfrozen = true;
  const frozenValue = originalDateNow();

  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;
    if (event.data.command === "chickenFreezeDateNow") {
      isUnfrozen = false;
    } else if (event.data.command === "chickenUnfreezeDateNow") {
      isUnfrozen = true;
    }
  });

  Date.now = function () {
    return isUnfrozen ? originalDateNow() : frozenValue;
  };
})();