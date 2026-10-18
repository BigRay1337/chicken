function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: true,
    cbPerformanceNowChecked: true,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  const originalClearInterval = window.clearInterval.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now.bind(Date);
  const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);

  let timers = [];

  const reloadTimers = () => {
    const newTimers = [];
    timers.forEach((timer) => {
      if (timer.id !== null) originalClearInterval(timer.id);
      if (timer.customTimerId !== null) originalClearInterval(timer.customTimerId);

      if (timer.finished) return;

      const speed = Number(speedConfig.speed);
      if (speedConfig.cbSetIntervalChecked && speed <= 0) {
        timer.id = null;
        timer.customTimerId = null;
        newTimers.push(timer);
        return;
      }

      const delay = speedConfig.cbSetIntervalChecked
        ? timer.timeout / speed
        : timer.timeout;
      timer.customTimerId = originalSetInterval(timer.handler, delay, ...timer.args);
      newTimers.push(timer);
    });
    timers = newTimers;
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.command === "setSpeedConfig" && event.data.config) {
      speedConfig = { ...speedConfig, ...event.data.config };
      reloadTimers();
    }
  });

  window.postMessage({ command: "getSpeedConfig" }, "*");

  window.clearInterval = (id) => {
    originalClearInterval(id);
    timers.forEach((timer) => {
      if (timer.id === id || timer.customTimerId === id) {
        timer.finished = true;
        if (timer.customTimerId !== null) originalClearInterval(timer.customTimerId);
      }
    });
  };

  window.clearTimeout = (id) => {
    originalClearTimeout(id);
  };

  window.setInterval = (handler, timeout = 0, ...args) => {
    const delay = Math.max(0, Number(timeout) || 0);
    const speed = Number(speedConfig.speed);
    const paused = speedConfig.cbSetIntervalChecked && speed <= 0;
    const id = paused
      ? null
      : originalSetInterval(
          handler,
          speedConfig.cbSetIntervalChecked ? delay / speed : delay,
          ...args
        );

    timers.push({
      id,
      handler,
      timeout: delay,
      args,
      finished: false,
      customTimerId: null,
    });
    return id;
  };

  window.setTimeout = (handler, timeout = 0, ...args) => {
    const delay = Math.max(0, Number(timeout) || 0);
    const speed = Number(speedConfig.speed);
    if (speedConfig.cbSetTimeoutChecked && speed <= 0) {
      // Keep the callback paused without creating an overflowing timer delay.
      return originalSetTimeout(() => {}, 2147483647);
    }
    return originalSetTimeout(
      handler,
      speedConfig.cbSetTimeoutChecked ? delay / speed : delay,
      ...args
    );
  };

  // performance.now
  (() => {
    let virtualNow = null;
    let previousRealNow = null;

    window.performance.now = () => {
      const realNow = originalPerformanceNow();
      if (virtualNow === null) {
        virtualNow = realNow;
      } else {
        const elapsed = realNow - previousRealNow;
        const rate = speedConfig.cbPerformanceNowChecked
          ? Math.max(0, Number(speedConfig.speed) || 0)
          : 1;
        virtualNow += elapsed * rate;
      }
      previousRealNow = realNow;
      return virtualNow;
    };
  })();

  // Date.now
  (() => {
    let virtualDateNow = null;
    let previousRealDateNow = null;

    Date.now = function () {
      const realNow = originalDateNow();

      if (virtualDateNow === null) {
        virtualDateNow = realNow;
      } else {
        const elapsed = realNow - previousRealDateNow;
        // When the Date.now option is off, use the real clock (rate 1).
        // When on, apply the configured speed; speed 0 intentionally freezes it.
        const rate = speedConfig.cbDateNowChecked
          ? Math.max(0, Number(speedConfig.speed) || 0)
          : 1;
        virtualDateNow += elapsed * rate;
      }

      previousRealDateNow = realNow;
      return Math.floor(virtualDateNow);
    };
  })();

  // requestAnimationFrame
  (() => {
    let frameCallbacks = [];
    let frameTicks = [];
    let processingFrame = false;

    window.requestAnimationFrame = (callback) => {
      if (processingFrame) return originalRequestAnimationFrame(callback);

      return originalRequestAnimationFrame(() => {
        let index = frameCallbacks.indexOf(callback);
        if (index === -1) {
          frameCallbacks.push(callback);
          frameTicks.push(0);
          index = frameCallbacks.length - 1;
        }

        if (!speedConfig.cbRequestAnimationFrameChecked) {
          callback(window.performance.now());
          return;
        }

        const speed = Math.max(0, Number(speedConfig.speed) || 0);
        frameTicks[index] += speed;
        if (frameTicks[index] >= 1) {
          processingFrame = true;
          try {
            while (frameTicks[index] >= 1) {
              callback(window.performance.now());
              frameTicks[index] -= 1;
            }
          } finally {
            processingFrame = false;
          }
        } else {
          originalRequestAnimationFrame(() => {
            window.requestAnimationFrame(callback);
          });
        }
      });
    };
  })();
}

pageScript();
