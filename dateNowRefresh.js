// Detect an upward swipe of at least 30 CSS pixels, then wait for the
// game's in-page loading screen to appear and disappear before disabling Date.now.
// This does not reload the browser tab.
(function () {
  const SWIPE_UP_THRESHOLD_PX = 30;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  let touchStartY = null;
  let latestConfig = null;
  let waitingForLoadingScreen = false;
  let loadingScreenSeen = false;
  let disableScheduled = false;

  function isVisible(element) {
    if (!(element instanceof Element)) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" ||
        Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function hasVisibleLoadingScreen() {
    const candidates = document.querySelectorAll(
      '[role="progressbar"], [aria-label*="load" i], [class*="load" i], ' +
      '[id*="load" i], [class*="spinner" i], [id*="spinner" i]'
    );

    for (const element of candidates) {
      if (!isVisible(element)) continue;
      const description = [
        element.getAttribute("aria-label") || "",
        element.getAttribute("role") || "",
        typeof element.className === "string" ? element.className : "",
        element.id || "",
        (element.innerText || element.textContent || "").slice(0, 160)
      ].join(" ").toLowerCase();

      if (/load|loading|spinner|progressbar|please wait/.test(description)) {
        return true;
      }
    }
    return false;
  }

  function finishAfterLoadingScreen() {
    if (!waitingForLoadingScreen || !loadingScreenSeen || disableScheduled) return;
    if (hasVisibleLoadingScreen()) return;

    disableScheduled = true;
    waitingForLoadingScreen = false;

    // Wait one native frame after the loading indicator disappears.
    nativeRequestAnimationFrame(function () {
      if (latestConfig) {
        const updatedConfig = Object.assign({}, latestConfig, {
          cbDateNowChecked: false
        });
        latestConfig = updatedConfig;
        window.postMessage({
          command: "setSpeedConfig",
          config: updatedConfig
        }, "*");
      }
      disableScheduled = false;
    });
  }

  function checkLoadingScreen() {
    if (!waitingForLoadingScreen) return;
    if (hasVisibleLoadingScreen()) {
      loadingScreenSeen = true;
    } else {
      finishAfterLoadingScreen();
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (data && data.command === "setSpeedConfig" && data.config) {
      latestConfig = data.config;
    }
  });

  // Watch DOM changes because many games render their loading screen inside
  // the page rather than navigating/reloading the browser tab.
  const observer = new MutationObserver(checkLoadingScreen);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "id", "style", "hidden", "aria-hidden", "aria-label"]
  });

  window.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
  }, { capture: true, passive: true });

  window.addEventListener("touchend", function (event) {
    if (touchStartY === null || !event.changedTouches || !event.changedTouches.length) {
      touchStartY = null;
      return;
    }

    const endY = event.changedTouches[0].clientY;
    const swipeUpDistance = touchStartY - endY;
    touchStartY = null;

    if (swipeUpDistance < SWIPE_UP_THRESHOLD_PX || waitingForLoadingScreen || disableScheduled) {
      return;
    }

    // Do not disable Date.now merely because a swipe happened. Wait for a
    // loading screen to be observed, then for it to disappear.
    waitingForLoadingScreen = true;
    loadingScreenSeen = false;
    checkLoadingScreen();
  }, { capture: false, passive: true });
})();