(function () {
  const SWIPE_THRESHOLD_PX = 30;
  const PENDING_DISABLE_KEY = "__chicken_pending_date_now_disable__";
  const RAF_RARITY_MIN_MS = -0;
  const RAF_RARITY_MAX_MS = -0;

  function getRarityDelayMs() {
    return RAF_RARITY_MIN_MS +
      Math.random() * (RAF_RARITY_MAX_MS - RAF_RARITY_MIN_MS);
  }

  function handleSwipeUp() {
    try {
      sessionStorage.setItem(PENDING_DISABLE_KEY, "true");
    } catch (_) {}

    // Refresh immediately on swipe up.
    window.location.reload();
  }

  function disableAfterRefresh() {
    try {
      if (sessionStorage.getItem(PENDING_DISABLE_KEY) !== "true") {
        return;
      }

      sessionStorage.removeItem(PENDING_DISABLE_KEY);

      window.postMessage({ command: "getSpeedConfig" });

      window.addEventListener("message", (event) => {
        if (event.data?.command !== "setSpeedConfig") return;

        // Date.now is disabled immediately after the game refresh.
        const dateNowDisabledConfig = {
          ...event.data.config,
          cbDateNowChecked: false,
        };

        window.postMessage({
          command: "setSpeedConfig",
          config: dateNowDisabledConfig,
        });

        // RAF uses the requested -0 to -0 ms rarity range.
        const rarityDelayMs = getRarityDelayMs();
        window.setTimeout(() => {
          window.postMessage({
            command: "setSpeedConfig",
            config: {
              ...dateNowDisabledConfig,
              cbRequestAnimationFrameChecked: false,
            },
          });
        }, rarityDelayMs);
      }, { once: true });

      window.postMessage({ command: "getSpeedConfig" });
    } catch (_) {}
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
