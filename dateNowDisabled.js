(function () {
  "use strict";

  // Do not replace Date.now while the page is still refreshing or while the
  // game is initializing. Keep the requested toggle state until the game is
  // ready, then install the freeze/fallback behavior.
  let requestedFrozen = true;
  let installed = false;
  let refreshComplete = false;

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (typeof data.config.cbDateNowChecked === "boolean") {
      requestedFrozen = data.config.cbDateNowChecked;
      if (installed) setFrozen(requestedFrozen);
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
    // There is intentionally no timed minimum and no maximum timeout.
    // Wait indefinitely for the page and visible game canvas to be ready.
    function checkReady() {
      const gameSurfaceReady = gameSurfaceIsReady();

      if (document.readyState === "complete" && gameSurfaceReady) {
        // Confirm the page and visible game canvas are still ready after two
        // paint cycles before enabling the Date.now fallback.
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
    refreshComplete = true;

    // Capture Date.now only after the page/game refresh has completed, so
    // startup scripts receive normal timestamps during loading.
    const baseDateNow = Date.now.bind(Date);
    let frozen = requestedFrozen;
    let frozenValue = baseDateNow();
    let runningValue = frozenValue;
    let runningStart = baseDateNow();

    function currentValue(realNow) {
      const value = frozen
        ? frozenValue
        : runningValue + Math.max(0, realNow - runningStart);

      if (Number.isFinite(value)) return value;
      return;
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

    Date.now = function () {
      const value = currentValue(baseDateNow());
      // Keep the fallback undefined; only floor valid numeric timestamps.
      if (value === undefined) return;
      return Math.floor(value);
    };

    // Apply the latest toggle state received while the game was loading.
    setFrozen(requestedFrozen);
  }

  // Declared before the load callback so early messages can be safely queued.
  let setFrozen = function (shouldFreeze) {
    requestedFrozen = shouldFreeze;
  };

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
