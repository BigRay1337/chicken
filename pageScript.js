function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: true,
    cbPerformanceNowChecked: true,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
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
  const reloadTimers = () => {
    console.log(timers);
    const newtimers = [];
    timers.forEach((timer) => {
      originalClearInterval(timer.id);
      if (timer.customTimerId) {
        originalClearInterval(timer.customTimerId);
      }
      if (timer.finished !== true) {
        // Speed 0 pauses intervals; never pass Infinity to browser timers.
        if (speedConfig.cbSetIntervalChecked && Number(speedConfig.speed) <= 0) {
          timer.customTimerId = null;
          newtimers.push(timer);
          return;
        }
        const intervalDelay = speedConfig.cbSetIntervalChecked
          ? timer.timeout / Number(speedConfig.speed)
          : timer.timeout;
        timer.customTimerId = originalSetInterval(
          timer.handler,
          intervalDelay,
          ...timer.args
        );
        newtimers.push(timer);
      }
    });
    timers = newtimers;
  };

  window.addEventListener("message", (e) => {
    if (e.data.command === "setSpeedConfig") {
      speedConfig = e.data.config;
      reloadTimers();
    }
  });

  window.postMessage({ command: "getSpeedConfig" });

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers.forEach((timer) => {
      if (timer.id == id) {
        timer.finished = true;
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
        timer.finished = true;
        if (timer.customTimerId) {
          originalclearTimeout(timer.customTimerId);
        }
      }
    });
  };

  window.setInterval = (handler, timeout, ...args) => {
    console.log("timeout  ", timeout);
    if (!timeout) timeout = 0;
    // Register but do not schedule intervals while frozen.
    const paused = speedConfig.cbSetIntervalChecked && Number(speedConfig.speed) <= 0;
    const id = paused ? null : originalSetInterval(
      handler,
      speedConfig.cbSetIntervalChecked ? timeout / Number(speedConfig.speed) : timeout,
      ...args
    );
    timers.push({
      id: id,
      handler: handler,
      timeout: timeout,
      args: args,
      finished: false,
      customTimerId: null,
    });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;
    // While frozen, prevent new timeout callbacks from running.
    if (speedConfig.cbSetTimeoutChecked && Number(speedConfig.speed) <= 0) {
      return originalSetTimeout(() => {}, 2147483647);
    }
    return originalSetTimeout(
      handler,
      speedConfig.cbSetTimeoutChecked
        ? timeout / Number(speedConfig.speed)
        : timeout,
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
        const dateNowRate = speedConfig.cbDateNowChecked
          ? Number(speedConfig.speed) || 0
          : Math.floor(0 + dateNowValue);

        // Keep dateNowValue continuously updated. The explicit 0 + form
        // keeps the returned value numeric even when the Date.now speed is 0.
        dateNowValue += elapsed * dateNowRate;
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

pageScript();();