let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

let swipeStartY = null;

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

window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    swipeStartY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (swipeStartY === null || e.changedTouches.length !== 1) {
    swipeStartY = null;
    return;
  }

  const swipeEndY = e.changedTouches[0].clientY;
  const swipeDistance = swipeEndY - swipeStartY;
  swipeStartY = null;

  if (swipeDistance <= -30) {
    speedConfig.cbDateNowChecked = false;

    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
  }
}, { passive: true });
