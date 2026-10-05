function pageScript() {
  let speedConfig = {
    speed: 0,
    cbSetIntervalChecked: true,
    cbSetTimeoutChecked: false,
    cbPerformanceNowChecked: false,
    cbDateNowChecked: true,
    cbRequestAnimationFrameChecked: true,
  };

  const originalClearInterval = window.clearInterval;
  const originalclearTimeout = window.clearTimeout;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalPerformanceNow = window.performance.now.bind(window.performance);
  const originalDateNow = Date.now;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  const SWIPE_THRESHOLD_PX = 30;
  const SWIPE_DISABLE_DELAY_MS = 999;
  const PENDING_SWIPE_KEY = "__chicken_pending_swipe_refresh__";
  let swipeStartX = null;
  let swipeStartY = null;
  let swipeDisableTimer = null;
  let swipeHandled = false;

  const applySwipeConfig = (changes) => {
    speedConfig = { ...speedConfig, ...changes };
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  };

  const finishPendingSwipe = () => {
    try {
      if (sessionStorage.getItem(PENDING_SWIPE_KEY) !== "true") return;
      sessionStorage.removeItem(PENDING_SWIPE_KEY);
    } catch (_) {
      return;
    }

    // The page has now refreshed. Date.now is disabled first.
    // Keep the existing Date.now wrapper stable; do not force an unsafe time multiplier.
    applySwipeConfig({ cbDateNowChecked: false });

    // Disable requestAnimationFrame 999 ms after Date.now becomes false.
    if (swipeDisableTimer !== null) originalclearTimeout(swipeDisableTimer);
    swipeDisableTimer = originalSetTimeout(() => {
      swipeDisableTimer = null;
      applySwipeConfig({ cbRequestAnimationFrameChecked: false });
    }, SWIPE_DISABLE_DELAY_MS);
  };

  const handleSwipeUp = () => {
    if (swipeHandled) return;
    swipeHandled = true;

    try {
      sessionStorage.setItem(PENDING_SWIPE_KEY, "true");
    } catch (_) {
      swipeHandled = false;
      return;
    }

    // Refresh immediately. The false state is applied after the new page starts.
    window.location.reload();
  };

  // Listen in every injected frame. Each frame can receive touch events from its own game layer.
  {
    window.addEventListener("touchstart", (event) => {
      if (!event.touches || event.touches.length !== 1) return;
      swipeHandled = false;
      swipeStartX = event.touches[0].clientX;
      swipeStartY = event.touches[0].clientY;
    }, { passive: true, capture: true });

    window.addEventListener("touchend", (event) => {
      if (swipeStartX === null || swipeStartY === null) return;
      if (!event.changedTouches || event.changedTouches.length !== 1) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      const deltaX = endX - swipeStartX;
      const deltaY = endY - swipeStartY;

      swipeStartX = null;
      swipeStartY = null;

      // A vertical upward movement of at least 30px is a swipe.
      if (
        deltaY > -SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) >= Math.abs(deltaY)
      ) return;

      handleSwipeUp();
    }, { passive: true, capture: true });

    window.addEventListener("touchcancel", () => {
      swipeStartX = null;
      swipeStartY = null;
      swipeHandled = false;
    }, { passive: true, capture: true });

    // A swipe sets a session flag before reload, so the sequence survives refresh.
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", finishPendingSwipe, { once: true });
    } else {
      finishPendingSwipe();
    }
  }

  const STARTUP_INTERVAL_MS = 1;
  let pageInitializing = true;

  const DATE_NOW_DISABLED_RELOAD_MS = 2147483647; // Safe maximum browser timeout (~24.8 days).
  let dateNowDisableReloadTimer = null;

  const scheduleDateNowDisabledReload = () => {
    if (dateNowDisableReloadTimer !== null) originalclearTimeout(dateNowDisableReloadTimer);
    dateNowDisableReloadTimer = originalSetTimeout(() => {
      dateNowDisableReloadTimer = null;
      window.location.reload();
    }, DATE_NOW_DISABLED_RELOAD_MS);
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

  // Run page-created intervals at 1ms during the initial page-load phase.
  originalSetTimeout(() => {
    pageInitializing = false;
    reloadTimers();
  }, 0);

  window.addEventListener("message", (e) => {
    if (e.data.command === "setSpeedConfig") {
      const previousDateNowEnabled = speedConfig.cbDateNowChecked;
      speedConfig = e.data.config;
      reloadTimers();

      if (previousDateNowEnabled && !speedConfig.cbDateNowChecked) {
        scheduleDateNowDisabledReload();
      } else if (speedConfig.cbDateNowChecked && dateNowDisableReloadTimer !== null) {
        originalclearTimeout(dateNowDisableReloadTimer);
        dateNowDisableReloadTimer = null;
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
        const multiplier = speedConfig.cbDateNowChecked ? speedConfig.speed : 0;
        dateNowValue += (originalValue - previusDateNowValue) * multiplier;
      } else {
        dateNowValue = originalValue;
      }
      previusDateNowValue = originalValue;
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




