let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

const SWIPE_UP_PIXELS = 30;
const LONG_DELAY_MS = 9000;
const PENDING_FALSE_KEY = "__chicken_pending_occasional_false__";

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

function scheduleOccasionalFalse() {
  setTimeout(() => {
    setDateNowChecked(false);
    setRequestAnimationFrameChecked(false);

    setTimeout(() => {
      setDateNowChecked(true);
      setRequestAnimationFrameChecked(true);
    }, 1);
  }, LONG_DELAY_MS);
}

function schedulePendingFalseAfterRefresh() {
  if (sessionStorage.getItem(PENDING_FALSE_KEY) !== "true") return;

  sessionStorage.removeItem(PENDING_FALSE_KEY);
  scheduleOccasionalFalse();
}

document.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  document.documentElement.dataset.chickenSwipeStartY =
    String(event.touches[0].clientY);
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (!event.changedTouches || event.changedTouches.length !== 1) return;

  const startY = Number(document.documentElement.dataset.chickenSwipeStartY);
  delete document.documentElement.dataset.chickenSwipeStartY;

  if (!Number.isFinite(startY)) return;

  const endY = event.changedTouches[0].clientY;
  const swipeDistance = startY - endY;

  if (swipeDistance < SWIPE_UP_PIXELS) return;

  // Refresh immediately on every valid swipe-up.
  // Only some swipes schedule the 9-second false state.
  if (Math.random() < 0.5) {
    sessionStorage.setItem(PENDING_FALSE_KEY, "true");
  } else {
    sessionStorage.removeItem(PENDING_FALSE_KEY);
  }

  window.location.reload();
}, { passive: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", schedulePendingFalseAfterRefresh, {
    once: true,
  });
} else {
  schedulePendingFalseAfterRefresh();
}
