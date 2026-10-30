(() => {
  "use strict";

  // Keep the browser's real animation-frame scheduler running so the page
  // can initialize and paint. Freeze only the timestamp passed to callbacks.
  const nativeRequestAnimationFrame =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;

  if (!nativeRequestAnimationFrame || window.__chickenRafTimestampPatch) {
    return;
  }

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
        // Use the first real browser timestamp, not zero. This preserves a
        // valid time origin for game initialization while stopping RAF-based
        // elapsed-time progression on subsequent frames.
        if (frozenRafTimestamp === null) {
          frozenRafTimestamp = timestamp;
        }
        callbackTimestamp = frozenRafTimestamp;
      }

      callback.call(window, callbackTimestamp);
    });
  };

  // Ask the isolated content script for the user's current checkbox state.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
