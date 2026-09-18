function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: false,
    cbRequestAnimationFrameChecked: false,
  };

  const originalClearInterval = window.clearInterval;
  const originalclearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const STARTUP_INTERVAL_MS = 1;
  const DATE_NOW_DISABLE_DELAY_MS = 1000;
  let pageInitializing = true;

  let dateNowDisableReloadTimer = null;
  let extensionDateNowOverride = null;

  // This state is controlled only by the extension lifecycle.
  let extensionIsEnabled = true;

  const scheduleDateNowDisabledReload = () => {
    return;
  };

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
    if (e.data.command === "setSpeedConfig") {
      speedConfig = e.data.config;
      reloadTimers();

      if (dateNowDisableReloadTimer !== null) {
        originalclearTimeout(dateNowDisableReloadTimer);
        dateNowDisableReloadTimer = null;
      }
    } else if (e.data.command === "setExtensionDateNowState") {
      extensionIsEnabled = e.data.enabled === true;

      if (!extensionIsEnabled) {
        // Keep Date.now spoofing enabled for 1 second after the extension is disabled.
        speedConfig.cbDateNowChecked = true;
        speedConfig.speed = 1;

        if (dateNowDisableReloadTimer !== null) {
          originalclearTimeout(dateNowDisableReloadTimer);
        }

        dateNowDisableReloadTimer = originalSetTimeout(() => {
          dateNowDisableReloadTimer = null;
          speedConfig.cbDateNowChecked = false;
        }, DATE_NOW_DISABLE_DELAY_MS);
      } else {
        if (dateNowDisableReloadTimer !== null) {
          originalclearTimeout(dateNowDisableReloadTimer);
          dateNowDisableReloadTimer = null;
        }
        speedConfig.cbDateNowChecked = true;
      }

      if (extensionIsEnabled && extensionDateNowOverride !== null) {
        Date.now = extensionDateNowOverride;
      }
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
      if (performanceNowValue) {
        performanceNowValue += (originalValue - previusPerformanceNowValue) *
          (speedConfig.cbPerformanceNowChecked ? speedConfig.speed : 1);
      } else {
        performanceNowValue = originalValue;
      }
      previusPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  (function () {
    let dateNowValue = null;
    let previusDateNowValue = null;
    Date.now = () => {
      const originalValue = originalDateNow();
      if (dateNowValue !== null) {
        if (speedConfig.cbDateNowChecked) {
          dateNowValue += (originalValue - previusDateNowValue) * speedConfig.speed;
        } else {
          // Keep Date.now frozen while allowing the page's event loop to run normally.
          dateNowValue = dateNowValue;
        }
      } else {
        dateNowValue = originalValue;
      }
      previusDateNowValue = originalValue;
      return Math.floor(0 + dateNowValue);
    };
  })();

  extensionDateNowOverride = Date.now;

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
