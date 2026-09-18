// Date.now refresh controller.
// Starts with cbDateNowChecked=false when the extension loads.
// It does not override Date.now; pageScript.js remains responsible for Date.now.

(function () {
  window.postMessage({
    command: "setDateNowChecked",
    enabled: false,
  });
})();
