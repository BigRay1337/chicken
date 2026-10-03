let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

let touchStartX = 0;
let touchStartY = 0;
let swipeHandled = false;
const SWIPE_UP_DISTANCE_PX = 30;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = request.config;
    window.postMessage(request);
  } else if (request.command == "getSpeedConfig") {
    sendResponse(speedConfig);
  } else if (request.command == "refreshGameOnly") {
    window.postMessage({
      command: "refreshGameOnly"
    });
  } else if (request.command == "forceDateNowTrue") {
    speedConfig.cbDateNowChecked = true;
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
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
  if (!e.touches || e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  swipeHandled = false;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (swipeHandled || !e.touches || e.touches.length !== 1) return;

  const deltaX = e.touches[0].clientX - touchStartX;
  const deltaY = e.touches[0].clientY - touchStartY;

  if (deltaY <= -SWIPE_UP_DISTANCE_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
    swipeHandled = true;

    speedConfig.cbDateNowChecked = false;
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });

    window.postMessage({
      command: "refreshGameOnly"
    });
  }
}, { passive: true });

window.addEventListener("touchend", () => {
  swipeHandled = false;
}, { passive: true });

window.addEventListener("touchcancel", () => {
  swipeHandled = false;
}, { passive: true });
