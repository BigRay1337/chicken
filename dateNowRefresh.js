// Advance/glitch game frames when Date.now is disabled.
// Does not reload the Java/HTML5 game or the website.
// Keeps the 0 -> 1000 ms long-delay cycle active while cbDateNowChecked is false.
(function () {
  let previousEnabled = null;
  let glitchRunning = false;
  let glitchTimer = null;
  let useLongDelay = true;

  const frameCallbacks = new Map();
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const nativeCancelAnimationFrame = window.cancelAnimationFrame
    ? window.cancelAnimationFrame.bind(window)
    : function () {};

  window.requestAnimationFrame = function (callback) {
    const id = nativeRequestAnimationFrame(function (timestamp) {
      frameCallbacks.delete(id);
      callback(timestamp);
    });

    frameCallbacks.set(id, callback);
    return id;
  };

  window.cancelAnimationFrame = function (id) {
    frameCallbacks.delete(id);
    nativeCancelAnimationFrame(id);
  };

  function nextDelay() {
    const delay = useLongDelay ? 1000 : 0;
    useLongDelay = !useLongDelay;
    return delay;
  }

  function glitchFramesForward() {
    if (!glitchRunning) return;

    const timestamp = performance.now();
    const callbacks = Array.from(frameCallbacks.values());

    // Run a snapshot of the game's pending animation callbacks again.
    // This advances/glitches frames without reloading the game.
    callbacks.forEach(function (callback) {
      try {
        callback(timestamp);
      } catch (error) {
        console.error("Chicken frame glitch:", error);
      }
    });

    glitchTimer = window.setTimeout(glitchFramesForward, nextDelay());
  }

  function startGlitch() {
    if (glitchRunning) return;

    glitchRunning = true;
    glitchFramesForward();
  }

  function stopGlitch() {
    glitchRunning = false;

    if (glitchTimer !== null) {
      window.clearTimeout(glitchTimer);
      glitchTimer = null;
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;

    if (!data || data.command !== "setSpeedConfig" || !data.config) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;

      if (enabled === false) {
        startGlitch();
      }

      return;
    }

    if (enabled === false) {
      // Date.now disabled: glitch/advance frames instead of refreshing.
      startGlitch();
    } else {
      // Date.now enabled: stop the extra frame advancement.
      stopGlitch();
    }

    previousEnabled = enabled;
  });
})();
