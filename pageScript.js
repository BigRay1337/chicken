(() => {
  "use strict";

  // Keep the browser's native RAF scheduler running. Only freeze the
  // timestamp passed to game callbacks when the refresh flow enables it.
  const nativeRequestAnimationFrame =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;

  if (!nativeRequestAnimationFrame || window.__chickenRafTimestampPatch) {
    return;
  }

  // RAF spoofing is off during normal browsing and is enabled temporarily
  // by dateNowRefresh.js after the swipe-up refresh gesture.
  let freezeRafTimestamp = false;
  let frozenRafTimestamp = null;

  window.__chickenRafTimestampPatch = true;

  window.addEventListener("message", (event) => {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      const shouldFreeze =
        data.config.cbRequestAnimationFrameChecked === true;

      if (shouldFreeze !== freezeRafTimestamp) {
        freezeRafTimestamp = shouldFreeze;
        frozenRafTimestamp = null;
      }
    }
  });

  window.requestAnimationFrame = function (callback) {
    if (typeof callback !== "function") {
      return nativeRequestAnimationFrame(callback);
    }

    return nativeRequestAnimationFrame((timestamp) => {
      let callbackTimestamp = timestamp;

      if (freezeRafTimestamp) {
        // Keep callbacks and painting alive while holding their game clock.
        if (frozenRafTimestamp === null) {
          frozenRafTimestamp = timestamp;
        }
        callbackTimestamp = frozenRafTimestamp;
      }

      callback.call(window, callbackTimestamp);
    });
  };

  // Read the current config; the refresh script can temporarily override it.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
