(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";
  const RAF_DISABLE_MIN_MS = 0;
  const RAF_DISABLE_MAX_MS = 1000;

  function getRandomRarityDelayMs() {
    return Math.floor(
      RAF_DISABLE_MAX_MS -
        Math.random() * (RAF_DISABLE_MAX_MS - RAF_DISABLE_MIN_MS + 1)
    );
  }

  function disableAfterRefresh() {
    try {
      if (sessionStorage.getItem(PENDING_DISABLE_KEY) !== "true") {
        return;
      }

      sessionStorage.removeItem(PENDING_DISABLE_KEY);

      window.addEventListener("message", (event) => {
        if (event.data?.command !== "setSpeedConfig") return;

        const config = event.data.config;

        // Date.now is disabled immediately after the game refresh.
        window.postMessage({
          command: "setSpeedConfig",
          config: {
            ...config,
            cbDateNowChecked: false,
          },
        });

        // RequestAnimationFrame is disabled after a random 1000-to-0 ms delay.
        const delayMs = getRandomRarityDelayMs();

        window.setTimeout(() => {
          window.postMessage({
            command: "setSpeedConfig",
            config: {
              ...config,
              cbDateNowChecked: false,
              cbRequestAnimationFrameChecked: false,
            },
          });
        }, delayMs);
      }, { once: true });

      window.postMessage({ command: "getSpeedConfig" });
    } catch (_) {}
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // Refresh immediately on swipe up.
    window.location.reload();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", disableAfterRefresh, {
      once: true,
    });
  } else {
    disableAfterRefresh();
  }

  let swipeStartX = null;
  let swipeStartY = null;

  window.addEventListener("touchstart", (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    if (!event.changedTouches || event.changedTouches.length !== 1) return;

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - swipeStartX;
    const deltaY = endY - swipeStartY;

    swipeStartX = null;
    swipeStartY = null;

    if (
      deltaY > -SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      return;
    }

    handleSwipeUp();
  }, { passive: true });

  window.postMessage({ command: "getSpeedConfig" });
})();
