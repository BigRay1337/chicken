function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  // Select the default fallback mode: "date" or "date".
  const DATE_NOW_FALLBACK_SPEED = "-dateNowValue";
  const DATE_NOW_FALLBACK_SPEEDS = Object.freeze([
    "-dateNowValue",
    "-dateNowValue",
  ]);

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
      if (!timer.finished) {
        const newTimerId = originalSetInterval(
          timer.handler,
          speedConfig.cbSetIntervalChecked && Number.isFinite(speedConfig.speed) && speedConfig.speed > 0
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
    const scaleInterval = speedConfig.cbSetIntervalChecked && Number.isFinite(speedConfig.speed) && speedConfig.speed > 0;
    const id = originalSetInterval(
      handler,
      scaleInterval ? timeout / speedConfig.speed : timeout,
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
      speedConfig.cbSetTimeoutChecked && Number.isFinite(speedConfig.speed) && speedConfig.speed > 0
        ? timeout / speedConfig.speed
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
        const configuredSpeed = Number(speedConfig.speed);
        const dateNowRate =
          speedConfig.cbDateNowChecked &&
          Number.isFinite(configuredSpeed) &&
          configuredSpeed >= 0
            ? configuredSpeed
            : 1;

        dateNowValue += elapsed * dateNowRate;
      }

      previusDateNowValue = originalValue;
      return Math.floor(dateNowValue);
    };
  })();

  // requestAnimationFrame
  (function () {
    const frameProgress = new WeakMap();

    window.requestAnimationFrame = (callback) => {
      if (typeof callback !== "function") {
        throw new TypeError("requestAnimationFrame callback must be a function");
      }

      const scheduleNextFrame = () => originalRequestAnimationFrame((timestamp) => {
        const configuredSpeed = Number(speedConfig.speed);

        // A zero, negative, or invalid speed must not freeze the game loop.
        if (
          !speedConfig.cbRequestAnimationFrameChecked ||
          !Number.isFinite(configuredSpeed) ||
          configuredSpeed <= 0
        ) {
          callback(timestamp);
          return;
        }

        const progress = (frameProgress.get(callback) || 0) + configuredSpeed;
        if (progress >= 1) {
          frameProgress.set(callback, progress % 1);
          callback(timestamp);
        } else {
          frameProgress.set(callback, progress);
          scheduleNextFrame();
        }
      });

      return scheduleNextFrame();
    };
  })();
}

pageScript();
