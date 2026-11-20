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
      // The refresh-only restore can set the option back to true while
      // explicitly keeping the Date.now clock running.
      if (installed) {
        setFrozen(data.config.preserveRunning === true
          ? false
          : requestedFrozen);
      }
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
    let lastCanvas = null;
    let lastSignature = null;
    let stableChecks = 0;
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

      if (elapsed >= minimumWaitMs &&
          surface &&
          stableChecks >= stableChecksRequired) {
        // At full game-surface stability, restore Date.now=true.
        if (refreshPending) {
          if (!installed) installDateNowControl();
          setFrozen(false);
          clearRefreshFlag();
        } else if (!installed) {
          installDateNowControl();
        }

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

  // A swipe-up sends Date.now=false before reload. On the refreshed
  // document, restore the checked/true option at 100% of the
  // four-interval refresh trigger, while keeping Date.now running.
  if (refreshPending) {
    installDateNowControl();
    setFrozen(false);

    const refreshTriggerIntervalMs = 300;
    const refreshTriggerIntervals = 4;
    const refreshTriggerFraction = 1.0;
    const restoreTrueAfterMs =
      refreshTriggerIntervalMs * refreshTriggerIntervals * refreshTriggerFraction;

    window.setTimeout(function () {
      // Restore the option state to true at 100/100 of the refresh trigger,
      // but keep Date.now running so the game does not become frozen.
      window.postMessage({
        command: "setSpeedConfig",
        config: {
          cbDateNowChecked: true,
          preserveRunning: true
        }
      }, "*");
      requestedFrozen = true;
      setFrozen(false);
      // Keep REFRESH_FLAG until the game canvas is stable; then the
      // load watcher freezes the game exactly once.
    }, restoreTrueAfterMs);
  }

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
