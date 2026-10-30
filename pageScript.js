// Main-world configuration bridge for the Chicken speed controls.
(function () {
  "use strict";

  const config = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false
  };

  function applyConfig(nextConfig) {
    if (!nextConfig || typeof nextConfig !== "object") return;
    Object.keys(config).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(nextConfig, key)) {
        config[key] = nextConfig[key];
      }
    });

    // Keep the current settings visible to scripts running in the page's
    // main world. The refresh helper updates these same flags through messages.
    window.__chickenSpeedConfig = Object.assign({}, config);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window || !event.data) return;

    if (event.data.command === "setSpeedConfig") {
      applyConfig(event.data.config);
    } else if (event.data.command === "getSpeedConfig") {
      window.postMessage({
        command: "setSpeedConfig",
        config: Object.assign({}, config)
      }, "*");
    }
  });

  window.__chickenSpeedConfig = Object.assign({}, config);
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
