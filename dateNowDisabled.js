(function () {
  "use strict";

  // Date.now speed multiplier: 1 = normal time, 0.25 = quarter speed.
  let requestedFrozen = true;
  let requestedSpeed = 0.25;
  let installed = false;

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (typeof data.config.cbDateNowChecked === "boolean") {
      requestedFrozen = data.config.cbDateNowChecked;
      if (installed) setFrozen(requestedFrozen);
    }

    if (typeof data.config.speed === "number" &&
        Number.isFinite(data.config.speed) &&
        data.config.speed >= 0) {
      requestedSpeed = data.config.speed;
      if (installed) setSpeed(requestedSpeed);
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
    let frozenValue = baseDateNow();
    let runningValue = frozenValue;
    let runningStart = baseDateNow();

    function currentValue(realNow) {
      return frozen
        ? frozenValue
        : runningValue + Math.max(0, realNow - runningStart) * speed;
    }

    setFrozen = function (shouldFreeze) {
      if (typeof shouldFreeze !== "boolean" || shouldFreeze === frozen) return;
      const realNow = baseDateNow();
      const current = currentValue(realNow);

      if (shouldFreeze) {
        frozenValue = current;
        frozen = true;
      } else {
        runningValue = current;
        runningStart = realNow;
        frozen = false;
      }
    };

    setSpeed = function (nextSpeed) {
      if (typeof nextSpeed !== "number" ||
          !Number.isFinite(nextSpeed) || nextSpeed < 0 ||
          nextSpeed === speed) return;

      const realNow = baseDateNow();
      const current = currentValue(realNow);
      if (frozen) {
        frozenValue = current;
      } else {
        runningValue = current;
        runningStart = realNow;
      }
      speed = nextSpeed;
    };

    Date.now = function () {
      return Math.floor(currentValue(baseDateNow()));
    };

    setSpeed(requestedSpeed);
    setFrozen(requestedFrozen);
  }

  let setFrozen = function (shouldFreeze) {
    requestedFrozen = shouldFreeze;
  };
  let setSpeed = function (nextSpeed) {
    requestedSpeed = nextSpeed;
  };

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
