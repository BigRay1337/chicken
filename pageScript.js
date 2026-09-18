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
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const STARTUP_INTERVAL_MS = 1;
  const DATE_NOW_FALSE_DELAY_MS = 999000;
  let pageInitializing = true;
  let extensionIsEnabled = true;
  let dateNowFalseTimer = null;

  let timers = [];
  const reloadTimers = () => {
    const newtimers = [];
    timers.forEach((timer) => {
      originalClearInterval(timer.id);
      if (timer.customTimerId) originalClearInterval(timer.customTimerId);
      if (!timer.finished) {
        const interval = pageInitializing
          ? STARTUP_INTERVAL_MS
          : !speedConfig.cbDateNowChecked
            ? timer.timeout
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

  function startDateNowFalseTimer() {
    if (dateNowFalseTimer !== null) {
      originalclearTimeout(dateNowFalseTimer);
    }

    dateNowFalseTimer = originalSetTimeout(() => {
      dateNowFalseTimer = null;

      speedConfig = {
        ...speedConfig,
        cbDateNowChecked: false,
      };

      reloadTimers();

      window.postMessage({
        command: "setSpeedConfig",
        config: speedConfig,
      });
    }, DATE_NOW_FALSE_DELAY_MS);
  }

  window.addEventListener("message", (e) => {
    if (e.data.command === "setSpeedConfig") {
      speedConfig = e.data.config;
      reloadTimers();

      if (speedConfig.cbDateNowChecked === false) {
        startDateNowFalseTimer();
      } else if (dateNowFalseTimer !== null) {
        originalclearTimeout(dateNowFalseTimer);
        dateNowFalseTimer = null;
      }
    } else if (e.data.command === "setExtensionDateNowState") {
      extensionIsEnabled = e.data.enabled === true;

      if (!extensionIsEnabled) {
        // Keep the current checkbox state and begin the 999-second countdown
        // only if cbDateNowChecked is already false.
        if (speedConfig.cbDateNowChecked === false) {
          startDateNowFalseTimer();
        }
      } else if (dateNowFalseTimer !== null) {
        originalclearTimeout(dateNowFalseTimer);
        dateNowFalseTimer = null;
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
      : !speedConfig.cbDateNowChecked
        ? timeout
        : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
          ? timeout / speedConfig.speed
          : timeout;

    const id = originalSetInterval(handler, interval, ...args);
    timers.push({ id, handler, timeout, args, finished: NaN, customTimerId: NaN });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const delay = !speedConfig.cbDateNowChecked
      ? timeout
      : speedConfig.cbSetTimeoutChecked && speedConfig.speed > 0
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
          (speedConfig.cbPerformanceNowChecked && speedConfig.cbDateNowChecked
            ? speedConfig.speed
            : 1);
      } else {
        performanceNowValue = originalValue;
      }

      previusPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
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
        const frameTime = originalPerformanceNow();

        if (index == -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(frameTime);
        } else if (speedConfig.cbRequestAnimationFrameChecked && speedConfig.cbDateNowChecked && speedConfig.speed > 0) {
          tickFrame = callbackTick[index] + speedConfig.speed;

          if (tickFrame >= 1) {
            const startTime = originalPerformanceNow();

            while (tickFrame >= 1) {
              try {
                callback(originalPerformanceNow());
              } catch (e) {
                console.error(e);
              }

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
          callback(frameTime);
        }
      });
    };
  })();
}

pageScript();
