let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

const SWIPE_UP_PIXELS = 30;
const FALSE_DELAY_MS = 9000;
const REENABLE_DELAY_MS = 1;
const PENDING_FALSE_KEY = "__chicken_pending_false__";

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

function setDateNowChecked(checked) {
  speedConfig = {
    ...speedConfig,
    cbDateNowChecked: checked,
  };

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
}

function setRequestAnimationFrameChecked(checked) {
  speedConfig = {
    ...speedConfig,
    cbRequestAnimationFrameChecked: checked,
  };

  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
}

function scheduleFalseAfterSwipe() {
  setTimeout(() => {
    setDateNowChecked(false);
    setRequestAnimationFrameChecked(false);

    setTimeout(() => {
      setDateNowChecked(true);
      setRequestAnimationFrameChecked(true);
    }, REENABLE_DELAY_MS);
  }, FALSE_DELAY_MS);
}

function handleSwipeUp() {
  try {
    sessionStorage.setItem(PENDING_FALSE_KEY, "true");
  } catch (_) {}

  // Refresh immediately on every valid swipe-up.
  window.location.reload();
}

function schedulePendingFalseAfterRefresh() {
  try {
    if (sessionStorage.getItem(PENDING_FALSE_KEY) !== "true") return;
    sessionStorage.removeItem(PENDING_FALSE_KEY);
    scheduleFalseAfterSwipe();
  } catch (_) {}
}

function isSwipeUp(startY, endY) {
  return startY - endY >= SWIPE_UP_PIXELS;
}

let touchStartY = null;

document.addEventListener("touchstart", (event) => {
  if (!event.touches || event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (touchStartY === null) return;

  if (!event.changedTouches || event.changedTouches.length !== 1) {
    touchStartY = null;
    return;
  }

  const endY = event.changedTouches[0].clientY;
  const startY = touchStartY;
  touchStartY = null;

  if (isSwipeUp(startY, endY)) {
    handleSwipeUp();
  }
}, { passive: true });

// Also support touch events received through the window/game layer.
window.addEventListener("touchstart", (event) => {
  if (!event.touches || event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchend", (event) => {
  if (touchStartY === null) return;

  if (!event.changedTouches || event.changedTouches.length !== 1) {
    touchStartY = null;
    return;
  }

  const endY = event.changedTouches[0].clientY;
  const startY = touchStartY;
  touchStartY = null;

  if (isSwipeUp(startY, endY)) {
    handleSwipeUp();
  }
}, { passive: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", schedulePendingFalseAfterRefresh, {
    once: true,
  });
} else {
  schedulePendingFalseAfterRefresh();
}