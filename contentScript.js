let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

const SWIPE_UP_PIXELS = 30;
const FALSE_HOLD_MS = 9000;
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
  speedConfig = { ...speedConfig, cbDateNowChecked: checked };
  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
}

function setRequestAnimationFrameChecked(checked) {
  speedConfig = { ...speedConfig, cbRequestAnimationFrameChecked: checked };
  window.postMessage({
    command: "setSpeedConfig",
    config: speedConfig,
  });
}

function setFalseImmediatelyFor9Seconds() {
  setDateNowChecked(false);
  setRequestAnimationFrameChecked(false);

  setTimeout(() => {
    setDateNowChecked(true);
    setRequestAnimationFrameChecked(true);
  }, FALSE_HOLD_MS);
}

function handleSwipeUp() {
  try {
    sessionStorage.setItem(PENDING_FALSE_KEY, "true");
  } catch (_) {}

  // Refresh immediately. The new page will set both values false immediately.
  window.location.reload();
}

function schedulePendingFalseAfterRefresh() {
  try {
    if (sessionStorage.getItem(PENDING_FALSE_KEY) !== "true") return;
    sessionStorage.removeItem(PENDING_FALSE_KEY);
    setFalseImmediatelyFor9Seconds();
  } catch (_) {}
}

function isSwipeUp(startY, endY) {
  return startY - endY >= SWIPE_UP_PIXELS;
}

let touchStartY = null;

function onTouchStart(event) {
  if (!event.touches || event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
}

function onTouchEnd(event) {
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
}

document.addEventListener("touchstart", onTouchStart, { passive: true });
document.addEventListener("touchend", onTouchEnd, { passive: true });
window.addEventListener("touchstart", onTouchStart, { passive: true });
window.addEventListener("touchend", onTouchEnd, { passive: true });

schedulePendingFalseAfterRefresh();
