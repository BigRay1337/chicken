let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: true,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
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


// Swipe up 30px: disable Date.now speed handling and immediately refresh the game page.
{
  let swipeStartY = null;
  const SWIPE_UP_THRESHOLD_PX = 30;

  window.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
      swipeStartY = event.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartY === null || event.changedTouches.length !== 1) return;

    const swipeEndY = event.changedTouches[0].clientY;
    const swipeDistance = swipeStartY - swipeEndY;
    swipeStartY = null;

    if (swipeDistance >= SWIPE_UP_THRESHOLD_PX) {
      speedConfig = { ...speedConfig, cbDateNowChecked: false };
      window.postMessage({
        command: "setSpeedConfig",
        config: speedConfig,
      });
      window.location.reload();
    }
  }, { passive: true });
}
