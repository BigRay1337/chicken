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
    const minimumWaitMs = 1200;
    const toggleAtMs = 300;
    const stableChecksRequired = 2;
    const checkIntervalMs = 100;
    let lastCanvas = null;
    let lastSignature = null;
    let stableChecks = 0;
    let refreshToggleStarted = false;
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

      // On a swipe-triggered reload, briefly switch Date.now off and
      // immediately back on near the beginning of the early load window.
      // Require a visible, stable game canvas so this runs during game
      // refresh rather than before the refreshed game surface exists.
      if (refreshPending &&
          !refreshToggleStarted &&
          elapsed >= toggleAtMs &&
          surface &&
          stableChecks >= 1) {
        if (!installed) installDateNowControl();
        // Let the game run for one rendered frame while Date.now is
        // unfrozen. Re-freeze on the next frame so the false -> true
        // transition is observable by the game's update loop.
        refreshToggleStarted = true;
        requestedFrozen = false;
        setFrozen(false);

        const refreeze = function () {
          requestedFrozen = true;
          setFrozen(true);
        };

        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(refreeze);
        } else {
          window.setTimeout(refreeze, 16);
        }
      }

      if (elapsed >= minimumWaitMs &&
          surface &&
          stableChecks >= stableChecksRequired) {
        // Keep Date.now frozen after the midpoint toggle until the
        // refreshed game has passed the full stable-canvas check.
        if (refreshPending) {
          if (!installed) installDateNowControl();
          if (!refreshToggleStarted) {
            setFrozen(false);
            setFrozen(true);
          } else {
            setFrozen(true);
          }
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

  // A swipe-up refresh carries a one-time marker into the reloaded page.
  // Its Date.now false -> true pulse runs near the midpoint of early loading.

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
