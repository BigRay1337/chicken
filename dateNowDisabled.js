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

  // Expose a synchronous control so the swipe handler can unfreeze Date.now
  // before it calls location.reload().
  window.__chickenSetDateNowFrozen = function (shouldFreeze) {
    if (typeof shouldFreeze !== "boolean") return;
    requestedFrozen = shouldFreeze;
    if (!installed) installDateNowControl();
    setFrozen(shouldFreeze);
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
          setFrozen(true);
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

  // After a swipe refresh, let the game begin loading for 625 ms.
  // Then briefly unfreeze Date.now and refreeze it on the next animation
  // frame, before the refreshed game surface is considered fully ready.
  // The readiness loop below also ensures Date.now=true at full stability.
  if (refreshPending) {
    installDateNowControl();
    window.setTimeout(function () {
      setFrozen(false);
      window.requestAnimationFrame(function () {
        setFrozen(true);
      });
    }, 625);
  }

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
