let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

// Fictional/mock extension state. This does not actually turn the browser
// extension off or on; it only simulates the state transition in memory.
let fictionalExtensionEnabled = true;

function runFictionalSwipeToggle() {
  speedConfig = { ...speedConfig, cbDateNowChecked: false };
  fictionalExtensionEnabled = false;

  window.postMessage({
    command: "fictionalSwipeToggle",
    cbDateNowChecked: false,
    extensionEnabled: false,
  });

  speedConfig = { ...speedConfig, cbDateNowChecked: true };
  fictionalExtensionEnabled = true;

  window.postMessage({
    command: "fictionalSwipeToggle",
    cbDateNowChecked: true,
    extensionEnabled: true,
  });
}

let swipeStartY = null;
let swipeStartX = null;

window.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  if (!touch) return;
  swipeStartY = touch.clientY;
  swipeStartX = touch.clientX;
}, { passive: true });

window.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  if (!touch || swipeStartY === null || swipeStartX === null) return;

  const deltaY = touch.clientY - swipeStartY;
  const deltaX = touch.clientX - swipeStartX;

  // Upward swipe: at least 30 px upward and predominantly vertical.
  if (deltaY <= -30 && Math.abs(deltaY) > Math.abs(deltaX)) {
    runFictionalSwipeToggle();
  }

  swipeStartY = null;
  swipeStartX = null;
}, { passive: true });

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
