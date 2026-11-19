(function () {
  "use strict";

  const REFRESH_FLAG = "__chickenDateNowRefreshPending";
  let refreshPending = false;
  try {
    refreshPending = window.sessionStorage.getItem(REFRESH_FLAG) === "1";
  } catch (_) {}

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
          signature: [rect.width, rect.height, canvas.width, canvas.height].join(":")
        };
      }
    }
    return null;
  }

  function clearRefreshFlag() {
    try {
      window.sessionStorage.removeItem(REFRESH_FLAG);
    } catch (_) {}
    refreshPending = false;
  }

  function waitForFinishedGameLoad() {
    const nativeNow = Date.now.bind(Date);
    const waitStartedAt = nativeNow();
    const minimumWaitMs = 2500;
    const stableChecksRequired = 4;
    const checkIntervalMs = 300;
    const unfreezeAtStableCheck = 2;

    let lastCanvas = null;
    let lastSignature = null;
    let stableChecks = 0;
    let refreshUnfrozen = false;
    let finished = false;

    function checkReady() {
      if (finished) return;

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

      // Only a swipe-triggered refresh gets the temporary Date.now=false
      // phase. Install the hook at 3 of 4 stable checks so false is effective.
      if (refreshPending && !refreshUnfrozen &&
          elapsed >= minimumWaitMs &&
          surface && stableChecks >= unfreezeAtStableCheck) {
        installDateNowControl();
        setFrozen(false);
        refreshUnfrozen = true;
        clearRefreshFlag();
      }

      if (elapsed >= minimumWaitMs &&
          surface &&
          stableChecks >= stableChecksRequired) {
        if (!installed) installDateNowControl();

        finished = true;
        return;
      }

      window.setTimeout(checkReady, checkIntervalMs);
    }

    checkReady();
  }

  function installDateNowControl() {
    if (installed) return;
    installed = true;

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

    setFrozen(requestedFrozen);
  }

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
