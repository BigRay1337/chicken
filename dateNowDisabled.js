(function () {
  "use strict";

  // Date.now multiplier: 1 = real time, 0.25 = quarter speed.
  let requestedFrozen = true;
  let requestedSpeed = 0.25;
  let installed = false;
  let applyConfig = function (config) {
    if (typeof config.cbDateNowChecked === "boolean") {
      requestedFrozen = config.cbDateNowChecked;
    }
    if (typeof config.speed === "number" &&
        Number.isFinite(config.speed) && config.speed >= 0) {
      requestedSpeed = config.speed;
    }
  };

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (installed) {
      applyConfig(data.config);
    } else {
      applyConfig(data.config);
    }
  });

  function gameSurfaceIsReady() {
    const canvases = document.querySelectorAll("canvas");
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;
    }
    return false;
  }

  function waitForFinishedGameLoad() {
    function checkReady() {
      if (document.readyState === "complete" && gameSurfaceIsReady()) {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              if (document.readyState === "complete" && gameSurfaceIsReady()) {
                installDateNowControl();
              } else {
                window.setTimeout(checkReady, 250);
              }
            });
          });
        } else {
          window.setTimeout(() => {
            if (document.readyState === "complete" && gameSurfaceIsReady()) {
              installDateNowControl();
            } else {
              window.setTimeout(checkReady, 250);
            }
          }, 100);
        }
        return;
      }
      window.setTimeout(checkReady, 250);
    }
    checkReady();
  }

  function installDateNowControl() {
    if (installed || document.readyState !== "complete") return;
    installed = true;

    const baseDateNow = Date.now.bind(Date);
    let frozen = requestedFrozen;
    let speed = requestedSpeed;
    let anchorReal = baseDateNow();
    let anchorVirtual = anchorReal;

    function currentValue(realNow) {
      if (frozen) return anchorVirtual;
      return anchorVirtual + Math.max(0, realNow - anchorReal) * speed;
    }

    applyConfig = function (config) {
      const realNow = baseDateNow();
      const current = currentValue(realNow);

      if (typeof config.speed === "number" &&
          Number.isFinite(config.speed) && config.speed >= 0) {
        speed = config.speed;
        requestedSpeed = config.speed;
      }

      if (typeof config.cbDateNowChecked === "boolean") {
        frozen = config.cbDateNowChecked;
        requestedFrozen = config.cbDateNowChecked;
      }

      // Re-anchor before changing state so toggling never jumps Date.now.
      anchorVirtual = current;
      anchorReal = realNow;
    };

    Date.now = function () {
      return Math.floor(currentValue(baseDateNow()));
    };

    // Apply the latest settings received before the game finished loading.
    applyConfig({
      speed: requestedSpeed,
      cbDateNowChecked: requestedFrozen
    });
  }

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
