function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: false,
  };

  const originalClearInterval = window.clearInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const STARTUP_INTERVAL_MS = 1;
  let pageInitializing = true;

  let timers = [];
  const reloadTimers = () => {
    const newTimers = [];

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
        newTimers.push(timer);
      }
    });

    timers = newTimers;
  };

  originalSetTimeout(() => {
    pageInitializing = false;
    reloadTimers();
  }, 0);

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    speedConfig = {
      ...speedConfig,
      ...(e.data.config || {}),
      speed: Number(e.data.config?.speed ?? speedConfig.speed) || 0,
      cbSetIntervalChecked: e.data.config?.cbSetIntervalChecked ?? speedConfig.cbSetIntervalChecked,
      cbSetTimeoutChecked: e.data.config?.cbSetTimeoutChecked ?? speedConfig.cbSetTimeoutChecked,
      cbPerformanceNowChecked: e.data.config?.cbPerformanceNowChecked ?? speedConfig.cbPerformanceNowChecked,
      cbDateNowChecked: e.data.config?.cbDateNowChecked ?? speedConfig.cbDateNowChecked,
      cbRequestAnimationFrameChecked: e.data.config?.cbRequestAnimationFrameChecked ?? speedConfig.cbRequestAnimationFrameChecked,
    };

    reloadTimers();
  });

  window.postMessage({ command: "getSpeedConfig" });

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = true;
        if (timer.customTimerId) originalClearInterval(timer.customTimerId);
      }
    });
  };

  window.clearTimeout = (id) => {
    originalClearTimeout(id);
  };

  window.setInterval = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const interval = pageInitializing
      ? STARTUP_INTERVAL_MS
      : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
        ? timeout / speedConfig.speed
        : timeout;

    const id = originalSetInterval(handler, interval, ...args);
    timers.push({ id, handler, timeout, args, finished: false, customTimerId: NaN });
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
    let previousPerformanceNowValue = null;

    window.performance.now = () => {
      const originalValue = originalPerformanceNow();

      if (performanceNowValue !== null) {
        performanceNowValue +=
          (originalValue - previousPerformanceNowValue) *
          (speedConfig.cbPerformanceNowChecked ? speedConfig.speed : 1);
      } else {
        performanceNowValue = originalValue;
      }

      previousPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  (function () {
    let dateNowValue = null;
    let previousDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (dateNowValue !== null) {
        dateNowValue +=
          (originalValue - previousDateNowValue) *
          (speedConfig.cbDateNowChecked ? speedConfig.speed : Math.floor(0 + dateNowValue));
      } else {
        dateNowValue = originalValue;
      }

      previousDateNowValue = originalValue;
      return Math.floor(0 + dateNowValue);
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

        if (index === -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(performance.now());
          return;
        }

        if (speedConfig.cbRequestAnimationFrameChecked) {
          tickFrame = callbackTick[index] + speedConfig.speed;

          if (tickFrame >= 1) {
            const startTime = originalPerformanceNow();

            while (tickFrame >= 1) {
              try {
                callback(performance.now());
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
          callback(performance.now());
        }
      });
    };
  })();
}

pageScript();
