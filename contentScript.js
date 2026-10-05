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

  // Set false immediately on every valid swipe-up, then keep it for 9 seconds.
  setDateNowChecked(false);
  setRequestAnimationFrameChecked(false);

  setTimeout(() => {
    setDateNowChecked(true);
    setRequestAnimationFrameChecked(true);
  }, LONG_DELAY_MS);
}, { passive: true });

