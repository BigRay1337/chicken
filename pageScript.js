(() => {
  "use strict";

  // Capture native functions before installing any wrappers.
  const originalDateNow = Date.now.bind(Date);
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalSetInterval = window.setInterval.bind(window);
  const originalClearInterval = window.clearInterval.bind(window);
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window);

  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true
  };

  let frozenDateNow = null;
  let pageLoaded = document.readyState === "complete";

  // Preserve Date.now exactly when enabled. When disabled, return the
  // native timestamp captured at the moment the setting changes.
  Date.now = function () {
    return speedConfig.cbDateNowChecked
      ? originalDateNow()
      : (frozenDateNow === null ? (frozenDateNow = originalDateNow()) : frozenDateNow);
  };

  function updateConfig(config) {
    if (!config || typeof config !== "object") return;

    const wasDateNowEnabled = speedConfig.cbDateNowChecked !== false;
    speedConfig = Object.assign({}, speedConfig, config);

    if (wasDateNowEnabled && speedConfig.cbDateNowChecked === false) {
      frozenDateNow = originalDateNow();
    } else if (speedConfig.cbDateNowChecked !== false) {
      frozenDateNow = null;
    }

    if (!isAnimationFrozen()) resumeQueuedFrames();
  }

  function isAnimationFrozen() {
    return pageLoaded &&
      speedConfig.cbRequestAnimationFrameChecked === true &&
      !(Number(speedConfig.speed) > 0);
  }

  // Keep interval IDs cancellable while applying speed changes only when
  // the interval control is enabled and the configured speed is positive.
  const intervalIds = new Map();

  window.setInterval = function (handler, delay, ...args) {
    const requestedDelay = Math.max(0, Number(delay) || 0);
    const speed = Number(speedConfig.speed);
    const actualDelay = speedConfig.cbSetIntervalChecked && speed > 0
      ? requestedDelay / speed
      : requestedDelay;
    const id = originalSetInterval(handler, actualDelay, ...args);
    intervalIds.set(id, id);
    return id;
  };

  window.clearInterval = function (id) {
    intervalIds.delete(id);
    return originalClearInterval(id);
  };

  window.setTimeout = function (handler, delay, ...args) {
    const requestedDelay = Math.max(0, Number(delay) || 0);
    const speed = Number(speedConfig.speed);
    const actualDelay = speedConfig.cbSetTimeoutChecked && speed > 0
      ? requestedDelay / speed
      : requestedDelay;
    return originalSetTimeout(handler, actualDelay, ...args);
  };

  // Keep performance.now monotonic and native unless its speed control is
  // enabled. Date.now remains independent from this clock.
  let performanceValue = null;
  let previousPerformanceValue = null;

  try {
    window.performance.now = function () {
      const now = originalPerformanceNow();
      if (!speedConfig.cbPerformanceNowChecked || !(Number(speedConfig.speed) > 0)) {
        performanceValue = now;
        previousPerformanceValue = now;
        return now;
      }
      if (performanceValue === null) {
        performanceValue = now;
      } else {
        performanceValue += (now - previousPerformanceValue) * Number(speedConfig.speed);
      }
      previousPerformanceValue = now;
      return performanceValue;
    };
  } catch (error) {
    // Some browsers expose performance.now as non-writable.
  }

  // When RAF freezing is enabled, hold callbacks instead of repeatedly
  // scheduling empty frames. Queued callbacks are released when unfrozen.
  let nextFrameId = 1;
  const queuedFrames = new Map();
  const nativeFrameIds = new Map();

  function runFrame(id, callback, timestamp) {
    nativeFrameIds.delete(id);
    if (isAnimationFrozen()) {
      queuedFrames.set(id, callback);
      return;
    }
    try {
      callback(timestamp);
    } catch (error) {
      originalSetTimeout(() => { throw error; }, 0);
    }
  }

  window.requestAnimationFrame = function (callback) {
    const id = nextFrameId++;
    if (typeof callback !== "function") return id;

    if (isAnimationFrozen()) {
      queuedFrames.set(id, callback);
      return id;
    }

    const nativeId = originalRequestAnimationFrame((timestamp) => {
      runFrame(id, callback, timestamp);
    });
    nativeFrameIds.set(id, nativeId);
    return id;
  };

  window.cancelAnimationFrame = function (id) {
    const nativeId = nativeFrameIds.get(id);
    if (nativeId !== undefined) originalCancelAnimationFrame(nativeId);
    nativeFrameIds.delete(id);
    queuedFrames.delete(id);
  };

  function resumeQueuedFrames() {
    if (isAnimationFrozen() || queuedFrames.size === 0) return;
    const pending = Array.from(queuedFrames.entries());
    queuedFrames.clear();
    for (const [id, callback] of pending) {
      const nativeId = originalRequestAnimationFrame((timestamp) => {
        runFrame(id, callback, timestamp);
      });
      nativeFrameIds.set(id, nativeId);
    }
  }

  window.addEventListener("load", () => {
    pageLoaded = true;
    // If RAF freeze is selected, stop game animation after the page has
    // completed loading, not while the browser is building the page.
  }, { once: true });

  window.addEventListener("message", (event) => {
    const data = event && event.data;
    if (!data || typeof data !== "object") return;

    if (data.command === "setSpeedConfig") {
      updateConfig(data.config);
    } else if (data.command === "getSpeedConfig") {
      window.postMessage({
        command: "setSpeedConfig",
        config: speedConfig
      }, "*");
    }
  });

  // Ask the isolated content script for the current popup settings.
  window.postMessage({ command: "getSpeedConfig" }, "*");
})();
