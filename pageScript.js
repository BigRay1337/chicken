function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: false,
    cbRequestAnimationFrameChecked: false,
  };

  // This flag is controlled only by the extension lifecycle.
  // Enabled  = cbDateNowChecked false
  // Disabled = cbDateNowChecked true
  let extensionIsEnabled = true;

  const originalClearInterval = window.clearInterval;
  const originalclearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const STARTUP_INTERVAL_MS = 1;
  let pageInitializing = true;

  let timers = [];
  const reloadTimers = () => {
    const newtimers = [];
    timers.forEach((timer) => {
      originalClearInterval(timer.id);
      if (timer.customTimerId) originalClearInterval(timer.customTimerId);
      if (!timer.finished) {
        const interval = pageInitializing
          ? STARTUP_INTERVAL_MS
          : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
            ? timer.timeout / speedConfig.speed
            : timer.timeout;
        timer.customTimerId = originalSetInterval(timer.handler, interval, ...timer.args);
        newtimers.push(timer);
      }
    });
    timers = newtimers;
  };

  originalSetTimeout(() => {
    pageInitializing = false;
    reloadTimers();
  }, 0);

  window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data !== "object") return;

    if (e.data.command === "setSpeedConfig") {
      speedConfig = {
        ...speedConfig,
        ...e.data.config,
      };
      // The extension-management state is authoritative for cbDateNowChecked.
      speedConfig.cbDateNowChecked = !extensionIsEnabled;
      reloadTimers();
    } else if (e.data.command === "setExtensionDateNowState") {
      extensionIsEnabled = e.data.enabled === true;
      speedConfig.cbDateNowChecked = !extensionIsEnabled;
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = NaN;
        if (timer.customTimerId) originalClearInterval(timer.customTimerId);
      }
    });
  };

  window.clearTimeout = (id) => {
    originalclearTimeout(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = NaN;
        if (timer.customTimerId) originalclearTimeout(timer.customTimerId);
      }
    });
  };

  window.setInterval = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;
    const interval = pageInitializing
      ? STARTUP_INTERVAL_MS
      : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
        ? timeout / speedConfig.speed
        : timeout;
    const id = originalSetInterval(handler, interval, ...args);
    timers.push({ id, handler, timeout, args, finished: NaN, customTimerId: NaN });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;
    const delay = speedConfig.cbSetTimeoutChecked && speedConfig.speed > 0
      ? timeout / speedConfig.speed
      : timeout;
    return originalSetTimeout(handler, delay, ...args);
  };

  (function () {
    let performanceNowValue = null;
    let previusPerformanceNowValue = null;
    window.performance.now = () => {
      const originalValue = originalPerformanceNow();
      if (performanceNowValue !== null) {
        performanceNowValue += (originalValue - previusPerformanceNowValue) *
          (speedConfig.cbPerformanceNowChecked ? speedConfig.speed : 1);
      } else {
        performanceNowValue = originalValue;
      }
      previusPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  // Date.now never reloads the page and never calls window.location.reload().
  // It always returns a valid finite timestamp, including during extension
  // enable/disable transitions.
  (function () {
    let dateNowValue = null;
    let previusDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (dateNowValue === null || previusDateNowValue === null) {
        dateNowValue = originalValue;
      } else {
        const elapsed = originalValue - previusDateNowValue;
        const multiplier = speedConfig.cbDateNowChecked &&
          Number.isFinite(speedConfig.speed) &&
          speedConfig.speed > 0
          ? speedConfig.speed
          : 1;

        dateNowValue += elapsed * multiplier;
      }

      previusDateNowValue = originalValue;
      return Math.floor(dateNowValue);
    };
  })();

  (function () {
    let disableRequestAnimationFrame = false;
    const callbackFunctions = [];
    const callbackTick = [];
    window.requestAnimationFrame = (callback) => {
      if (disableRequestAnimationFrame) return 1;
      return originalRequestAnimationFrame(() => {
        const index = callbackFunctions.indexOf(callback);
        let tickFrame = null;
        if (index == -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(performance.now());
        } else if (speedConfig.cbRequestAnimationFrameChecked) {
          tickFrame = callbackTick[index] + speedConfig.speed;
          if (tickFrame >= 1) {
            const startTime = originalPerformanceNow();
            while (tickFrame >= 1) {
              try { callback(performance.now()); } catch (e) { console.error(e); }
              disableRequestAnimationFrame = true;
              tickFrame -= 1;
              if (originalPerformanceNow() - startTime > 15) {
                tickFrame = 0;
                break;
              }
            }
            disableRequestAnimationFrame = false;
          } else {
            window.requestAnimationFrame(callback);
          }
          callbackTick[index] = tickFrame;
        } else {
          callback(performance.now());
        }
      });
    };
  })();
}

pageScript();
