(() => {
  "use strict";

  // RAF spoofing is disabled by default. dateNowRefresh.js enables it only
  // for the document load started by the detected 30 px swipe refresh.
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
    if (!data || data.command !== "setSpeedConfig" || !data.config) {
      return;
    }

    const shouldFreeze =
      data.config.cbRequestAnimationFrameChecked === true;

    if (shouldFreeze !== freezeRafTimestamp) {
      freezeRafTimestamp = shouldFreeze;
      frozenRafTimestamp = null;
    }
  });

  window.requestAnimationFrame = function (callback) {
    if (typeof callback !== "function") {
      return nativeRequestAnimationFrame(callback);
    }

    return nativeRequestAnimationFrame((timestamp) => {
      let callbackTimestamp = timestamp;

      if (freezeRafTimestamp) {
        if (frozenRafTimestamp === null) {
          frozenRafTimestamp = timestamp;
        }
        callbackTimestamp = frozenRafTimestamp;
      }

      // Always execute the callback on the browser's real frame schedule.
      callback.call(window, callbackTimestamp);
    });
  };

  // Retrieve the saved checkbox state after registering the message listener.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
