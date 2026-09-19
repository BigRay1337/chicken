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
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalDateNow = Date.now;
  let previousDateNowChecked = null;
  let gameRefreshInProgress = false;

  function refreshJavaGame() {
    if (gameRefreshInProgress) return;
    gameRefreshInProgress = true;

    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      applet.parentNode.replaceChild(applet.cloneNode(true), applet);
    } else {
      const frame = Array.from(document.querySelectorAll("iframe")).find((f) => {
        const value = ((f.src || "") + " " + (f.id || "") + " " +
          (typeof f.className === "string" ? f.className : "") + " " + (f.title || "")).toLowerCase();
        return value.includes("java") || value.includes("applet") || value.includes("game");
      });

      if (frame && frame.parentNode) {
        const src = frame.getAttribute("src");
        if (src) {
          frame.src = "about:blank";
          frame.src = src;
        } else {
          frame.parentNode.replaceChild(frame.cloneNode(true), frame);
        }
      }
    }

    originalSetTimeout(() => { gameRefreshInProgress = false; }, 1000);
  }

  const STARTUP_INTERVAL_MS = 1;
  let pageInitializing = true;

  let timers = [];
  const reloadTimers = () => {
    const newTimers = [];

    timers.forEach((timer) => {
      originalClearInterval(timer.id);

      if (timer.customTimerId) {
        originalClearInterval(timer.customTimerId);
      }

      if (!timer.finished) {
        const interval = pageInitializing
          ? STARTUP_INTERVAL_MS
          : speedConfig.cbSetIntervalChecked && speedConfig.speed > 0
            ? timer.timeout / speedConfig.speed
            : timer.timeout;

        timer.customTimerId = originalSetInterval(
          timer.handler,
          interval,
          ...timer.args
        );

        newTimers.push(timer);
      }
    });

    timers = newTimers;
  };

  // Do not reload or refresh the page when settings change.
  originalSetTimeout(() => {
    pageInitializing = false;
    reloadTimers();
  }, 0);

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.command !== "setSpeedConfig") return;

    speedConfig = {
      speed: Number(e.data.config?.speed) || 0,
      cbSetIntervalChecked: !!e.data.config?.cbSetIntervalChecked,
      cbSetTimeoutChecked: !!e.data.config?.cbSetTimeoutChecked,
      cbPerformanceNowChecked: !!e.data.config?.cbPerformanceNowChecked,
      cbDateNowChecked: e.data.config?.cbDateNowChecked !== false,
      cbRequestAnimationFrameChecked: !!e.data.config?.cbRequestAnimationFrameChecked,
    };

    if (previousDateNowChecked === null) {
      previousDateNowChecked = speedConfig.cbDateNowChecked;
    } else if (speedConfig.cbDateNowChecked === false && previousDateNowChecked !== false) {
      refreshJavaGame();
      previousDateNowChecked = false;
    } else {
      previousDateNowChecked = speedConfig.cbDateNowChecked;
    }

    reloadTimers();
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

    timers.push({
      id,
      handler,
      timeout,
      args,
      finished: false,
      customTimerId: NaN,
    });

    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    if (!timeout) timeout = 0;

    const delay = speedConfig.cbSetTimeoutChecked && speedConfig.speed > 0
      ? timeout / speedConfig.speed
      : timeout;

    return originalSetTimeout(handler, delay, ...args);
  };

  // performance.now
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

  // Date.now
  (function () {
    let dateNowValue = null;
    let previousDateNowValue = null;

    Date.now = () => {
      const originalValue = originalDateNow();

      if (dateNowValue !== null) {
        const multiplier = speedConfig.cbDateNowChecked ? speedConfig.speed : 1;
        dateNowValue += (originalValue - previousDateNowValue) * multiplier;
      } else {
        dateNowValue = originalValue;
      }

      previousDateNowValue = originalValue;
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
