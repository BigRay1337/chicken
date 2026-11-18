(function () {
  "use strict";

  // Keep the browser's native Date.now behavior in this disabled script.
  // Do not install a custom timestamp return value or freeze the game clock.
  let installed = false;

  function gameSurfaceIsReady() {
    const canvases = document.querySelectorAll("canvas");
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;
    }
    return false;
  }

  function waitForFinishedGameLoad() {
    const loadStartedAt = Date.now();
    const minimumWaitMs = 2500;
    const maximumWaitMs = 12000;

    function checkReady() {
      const elapsed = Date.now() - loadStartedAt;
      const gameSurfaceReady = gameSurfaceIsReady();

      if (
        document.readyState === "complete" &&
        elapsed >= minimumWaitMs &&
        (gameSurfaceReady || elapsed >= maximumWaitMs)
      ) {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(installDateNowControl);
          });
        } else {
          window.setTimeout(installDateNowControl, 100);
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

    // Intentionally leave Date.now untouched: the browser supplies the
    // original timestamp behavior without a custom return value.
  }

  if (document.readyState === "complete") {
    waitForFinishedGameLoad();
  } else {
    window.addEventListener("load", waitForFinishedGameLoad, { once: true });
  }
})();
