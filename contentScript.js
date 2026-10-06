let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: true,
};

const SWIPE_UP_PIXELS = 30;
const REENABLE_DELAY_MS = 9000;

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

function handleSwipeUp() {
  // Go false immediately on every valid swipe-up.
  setDateNowChecked(false);
  setRequestAnimationFrameChecked(false);

  // Keep both false for 9 seconds, then restore them.
  setTimeout(() => {
    setDateNowChecked(true);
    setRequestAnimationFrameChecked(true);
  }, REENABLE_DELAY_MS);
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

  const touchEndY = event.changedTouches[0].clientY;
  const swipeDistance = touchStartY - touchEndY;
  touchStartY = null;

  if (swipeDistance >= SWIPE_UP_PIXELS) {
    handleSwipeUp();
  }
}, { passive: true });
