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
  const originalDateNow = Date.now;

  const STARTUP_INTERVAL_MS = 1;
  const FREEZE_TIMER_MS = 2147483647;
  let pageInitializing = true;
  let frozenDateNowValue = null;

  let timers = [];
  const reloadTimers = () => {
    const newtimers = [];
    timers.forEach((timer) => {
      originalClearInterval(timer.id);
      if (timer.customTimerId) originalClearInterval(timer.customTimerId);
      if (!timer.finished) {
        const interval = pageInitializing
          ? STARTUP_INTERVAL_MS
          : speedConfig.cbDateNowChecked
            ? FREEZE_TIMER_MS
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
      const oldDateNowChecked = speedConfig.cbDateNowChecked;
      speedConfig = e.data.config;

      if (speedConfig.cbDateNowChecked && !oldDateNowChecked) {
        frozenDateNowValue = originalDateNow();
      } else if (!speedConfig.cbDateNowChecked && oldDateNowChecked) {
        frozenDateNowValue = null;
      }

      reloadTimers();
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

  Date.now = () => {
    if (speedConfig.cbDateNowChecked) {
      if (frozenDateNowValue === null) {
        frozenDateNowValue = originalDateNow();
      }
      return frozenDateNowValue;
    }

    return originalDateNow();
  };

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
      : speedConfig.cbDateNowChecked
        ? FREEZE_TIMER_MS
        : timeout;

    const id = originalSetInterval(handler, interval, ...args);
    timers.push({ id, handler, timeout, args, finished: NaN, customTimerId: NaN });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const delay = speedConfig.cbDateNowChecked
      ? FREEZE_TIMER_MS
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
            ? 0
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

        if (speedConfig.cbDateNowChecked) {
          if (index === -1) {
            callbackFunctions.push(callback);
            callbackTick.push(0);
          }
          return;
        }

        if (index == -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(frameTime);
        } else if (speedConfig.cbRequestAnimationFrameChecked && speedConfig.speed > 0) {
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
