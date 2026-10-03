let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

let swipeStartY = null;

document.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) {
    swipeStartY = event.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (swipeStartY === null || event.changedTouches.length !== 1) return;

  const swipeEndY = event.changedTouches[0].clientY;
  const swipeDistance = swipeStartY - swipeEndY;
  swipeStartY = null;

  if (swipeDistance >= 30) {
    speedConfig.cbDateNowChecked = null;
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
    window.location.reload();
  }
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
