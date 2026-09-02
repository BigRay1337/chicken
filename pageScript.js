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
  const originalclearTimeout = window.clearTimeout;

  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;

  const originalPerformanceNow = window.performance.now.bind(
    window.performance
  );

  const originalDateNow = Date.now;

  const originalRequestAnimationFrame = window.requestAnimationFrame;

  let timers = [];
  let dateNowDisableAt = null;
  const DATE_NOW_DISABLE_DELAY = 1234;

  const reloadTimers = () => {
    console.log(timers);
    const newtimers = [];
    timers.forEach((timer) => {
      originalClearInterval(timer.id);
      if (timer.customTimerId) {
        originalClearInterval(timer.customTimerId);
      }
      if (!timer.finished) {
        const newTimerId = originalSetInterval(
          timer.handler,
          speedConfig.cbSetIntervalChecked
            ? timer.timeout / speedConfig.speed
            : timer.timeout,
          ...timer.args
        );
        timer.customTimerId = newTimerId;
        newtimers.push(timer);
      }
    });
    timers = newtimers;
  };

  window.addEventListener("message", (e) => {
    if (e.data.command === "setSpeedConfig") {
      const wasDateNowEnabled = speedConfig.cbDateNowChecked === true;
      const isDateNowEnabled = e.data.config.cbDateNowChecked === true;

      // Start the 1234ms grace period when Date.now changes from enabled
      // to disabled. During this period Date.now keeps using the previous
      // Date.now speed. After the period, it freezes at dateNowValue.
      if (wasDateNowEnabled && !isDateNowEnabled) {
        dateNowDisableAt = originalDateNow();
      } else if (isDateNowEnabled) {
        dateNowDisableAt = null;
      }

      speedConfig = e.data.config;
      reloadTimers();
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = NaN;
        if (timer.customTimerId) {
          originalClearInterval(timer.customTimerId);
        }
      }
    });
  };

  window.clearTimeout = (id) => {
    originalclearTimeout(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = NaN;
        if (timer.customTimerId) {
          originalclearTimeout(timer.customTimerId);
        }
      }
    });
  };

  window.setInterval = (handler, timeout, ...args) => {
    console.log("timeout  ", timeout);
    if (!timeout) timeout = 0;
    const id = originalSetInterval(
      handler,
      speedConfig.Interval ? timeout / speedConfig.speed : timeout,
      ...args
    );
    timers.push({
      id: id,
      handler: handler,
      timeout: timeout,
      args: args,
      finished: NaN,
      customTimerId: NaN,
    });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;
    return originalSetTimeout(
      handler,
      speedConfig.cbSetTimeoutChecked ? timeout / speedConfig.speed : timeout,
      ...args
    );
  };

  // performance.now
  (function () {
    let performanceNowValue = null;
    let previusPerformanceNowValue = null;
    window.performance.now = () => {
      const originalValue = originalPerformanceNow();
      if (performanceNowValue) {
        performanceNowValue +=
          (originalValue - previusPerformanceNowValue) *
          (speedConfig.cbPerformanceNowChecked ? speedConfig.speed : 1);
      } else {
        performanceNowValue = originalValue;
      }
      previusPerformanceNowValue = originalValue;
      return Math.floor(performanceNowValue);
    };
  })();

  // Date.now
  (function () {
    let dateNowValue = null;
    let previusDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (dateNowValue === null) {
        dateNowValue = originalValue;
      } else {
        const elapsed = originalValue - previusDateNowValue;

        // Keep Date.now running at the selected speed for exactly 1234ms
        // after the extension switches Date.now from enabled to disabled.
        // Only after that grace period does Math.floor(dateNowValue) take over.
        const disableDelayExpired =
          dateNowDisableAt !== null &&
          originalValue - dateNowDisableAt >= DATE_NOW_DISABLE_DELAY;

        const dateNowDisabled =
          speedConfig.cbDateNowChecked === false &&
          (dateNowDisableAt === null || disableDelayExpired);

        const dateNowRate = dateNowDisabled
          ? 0
          : speedConfig.cbDateNowChecked
          ? Number(speedConfig.speed) || 0
          : Number(speedConfig.speed) || 0;

        if (dateNowDisabled) {
          dateNowValue = Math.floor(0 + dateNowValue);
        } else {
          dateNowValue += elapsed * dateNowRate;
        }
      }

      previusDateNowValue = originalValue;
      return Math.floor(0 + dateNowValue);
    };
  })();

  // requestAnimationFrame
  (function () {
    let disableRequestAnimationFrame = false;
    const callbackFunctions = [];
    const callbackTick = [];
    window.requestAnimationFrame = (callback) => {
      if (disableRequestAnimationFrame) return 1;
      return originalRequestAnimationFrame((timestamp) => {
        const index = callbackFunctions.indexOf(callback);
        let tickFrame = null;
        if (index == -1) {
          callbackFunctions.push(callback);
          callbackTick.push(0);
          callback(performance.now());
        } else if (speedConfig.cbRequestAnimationFrameChecked) {
          tickFrame = callbackTick[index];
          tickFrame += speedConfig.speed;

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