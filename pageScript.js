(() => {
  "use strict";

  // Keep the browser's real animation-frame scheduler running so pages can
  // initialize and paint. When the option is enabled, freeze the timestamp
  // delivered to RAF callbacks; games that advance from RAF timestamp deltas
  // then stop advancing while their callbacks and rendering still run.
  const nativeRequestAnimationFrame =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;

  if (!nativeRequestAnimationFrame || window.__chickenRafTimestampPatch) {
    return;
  }

  let freezeRafTimestamp = true;

  window.__chickenRafTimestampPatch = true;

  window.addEventListener("message", (event) => {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      freezeRafTimestamp =
        data.config.cbRequestAnimationFrameChecked === true;
    }
  });

  window.requestAnimationFrame = function (callback) {
    if (typeof callback !== "function") {
      return nativeRequestAnimationFrame(callback);
    }

    return nativeRequestAnimationFrame((timestamp) => {
      // Do not cancel or suppress the frame: only freeze the game clock
      // supplied to RAF callbacks. Real browser painting remains enabled.
      callback.call(window, freezeRafTimestamp ? 0 : timestamp);
    });
  };

  // Ask the isolated content script for the user's current checkbox state.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
