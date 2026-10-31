let speedConfig = {
  speed: 0,
  cbSetIntervalChecked: false,
  cbSetTimeoutChecked: false,
  cbPerformanceNowChecked: false,
  cbDateNowChecked: true,
  cbRequestAnimationFrameChecked: false,
};

// A zero speed cannot safely be used by the existing pageScript timer/RAF
// scaling code: dividing timer delays by zero produces Infinity, and the RAF
// frame accumulator never advances. Keep native timers and animation frames
// in that case while leaving the Date.now setting untouched.
function normalizeSpeedConfig(config) {
  const nextConfig = { ...config };
  const speed = Number(nextConfig.speed);

  if (!Number.isFinite(speed) || speed <= 0) {
    nextConfig.cbSetIntervalChecked = false;
    nextConfig.cbRequestAnimationFrameChecked = false;
  }

  return nextConfig;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "setSpeedConfig") {
    speedConfig = normalizeSpeedConfig(request.config);
    window.postMessage({
      command: "setSpeedConfig",
      config: speedConfig,
    });
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
