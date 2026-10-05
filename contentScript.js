let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  }
});

window.addEventListener("message", (e) => {
  if (e.data.command === "getSpeedConfig") {
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
});

(function () {
  let touchStartY = null;
  const SWIPE_UP_PIXELS = 30;
  const REQUEST_ANIMATION_FRAME_DISABLE_DELAY_MS = 490;
  const PENDING_RAF_DISABLE_KEY = "__chicken_pending_raf_disable__";

  const setDateNowChecked = (checked) => {
    speedConfig = {
      ...speedConfig,
      cbDateNowChecked: checked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  };

  const setRequestAnimationFrameChecked = (checked) => {
    speedConfig = {
      ...speedConfig,
      cbRequestAnimationFrameChecked: checked,
    };

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  };

  // If the previous page was refreshed by a 30px swipe, wait until this
  // refreshed page is loaded before disabling requestAnimationFrame.
  try {
    if (sessionStorage.getItem(PENDING_RAF_DISABLE_KEY) === "true") {
      sessionStorage.removeItem(PENDING_RAF_DISABLE_KEY);
      setTimeout(() => {
        setRequestAnimationFrameChecked(false);
      }, REQUEST_ANIMATION_FRAME_DISABLE_DELAY_MS);
    }
  } catch (_) {}

  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (touchStartY === null || event.changedTouches.length !== 1) {
      touchStartY = null;
      return;
    }

    const touchEndY = event.changedTouches[0].clientY;
    const swipeDistance = touchStartY - touchEndY;
    touchStartY = null;

    if (swipeDistance >= SWIPE_UP_PIXELS) {
      // Refresh the game first. The requestAnimationFrame false state is
      // applied only after the refreshed page loads, with a 490 ms delay.
      try {
        sessionStorage.setItem(PENDING_RAF_DISABLE_KEY, "true");
      } catch (_) {}

      window.location.reload();
    }
  }, { passive: true });
})();