(function () {
  "use strict";

  // Keep Date.now native while the refreshed game is still initializing.
  let requestedFrozen = true;
  let installed = false;
  let setFrozen = function (shouldFreeze) {
    requestedFrozen = shouldFreeze;
  };

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    if (typeof data.config.cbDateNowChecked === "boolean") {
      requestedFrozen = data.config.cbDateNowChecked;
      if (installed) setFrozen(requestedFrozen);
    }
  });

  function getGameSurfaceSignature() {
    const canvases = document.querySelectorAll("canvas");
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          canvas,
          signature: [
            rect.width,
            rect.height,
            canvas.width,
            canvas.height
          ].join(":")
        };
      }
    }
    return null;
  }

  function waitForFinishedGameLoad() {
    // Use the native clock so this wait is not affected by the Date.now hook.
    const nativeNow = Date.now.bind(Date);
    const waitStartedAt = nativeNow();
    const minimumWaitMs = 2500;
    const stableChecksRequired = 4;
    const checkIntervalMs = 300;

    let lastCanvas = null;
    let lastSignature = null;
    let stableChecks = 0;

    function checkReady() {
      if (installed) return;

      const elapsed = nativeNow() - waitStartedAt;
      const surface = getGameSurfaceSignature();

      if (surface && surface.canvas === lastCanvas &&
          surface.signature === lastSignature) {
        stableChecks += 1;
      } else {
        lastCanvas = surface ? surface.canvas : null;
        lastSignature = surface ? surface.signature : null;
        stableChecks = surface ? 1 : 0;
      }

      // Do not use document.readyState === "complete" or a timeout fallback.
      // Wait until the game has a visible canvas whose dimensions remain
      // unchanged across several checks, after the browser load event.
      if (elapsed >= minimumWaitMs &&
          surface &&
          stableChecks >= stableChecksRequired) {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(installDateNowControl);
          });
        } else {
          window.setTimeout(installDateNowControl, 100);
        }
        return;
      }

      window.setTimeout(checkReady, checkIntervalMs);
    }

    checkReady();
  }

  function installDateNowControl() {
    if (installed) return;
    installed = true;

    // Capture the native clock only after the refreshed game surface settles.
    const baseDateNow = Date.now.bind(Date);
    let frozen = requestedFrozen;
    let frozenValue = baseDateNow();
    let runningValue = frozenValue;
    let runningStart = baseDateNow();

    function currentValue(realNow) {
      const value = frozen
        ? frozenValue
        : runningValue + Math.max(0, realNow - runningStart);

      return Number.isFinite(value) ? value : 0.25;
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
      return Math.floor(currentValue(baseDateNow()));
    };

    // Apply the latest toggle received during refresh/loading.
    setFrozen(requestedFrozen);
  }

  // The load event is necessary but not sufficient: the game canvas must
  // also appear and settle before the Date.now fallback/control is installed.
  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
