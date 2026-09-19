// Independent Date.now controller.
// Refresh state 1 runs after 1000ms; refresh state 2 runs 100ms later.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  // Full-page refresh behavior imported from Chicken-refresh.
  // Keep the existing two game-refresh layers as an additional layer.
  const PAGE_REFRESH_DELAY_MS = 60;
  const REFRESH_DELAY_MS = 1000;
  const STATE_2_DELAY_MS = 100;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;
  let pageRefreshScheduled = false;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  function findGame() {
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet) return applet;

    return Array.from(document.querySelectorAll("iframe")).find((frame) => {
      const value = (
        (frame.src || "") + " " +
        (frame.id || "") + " " +
        (typeof frame.className === "string" ? frame.className : "") + " " +
        (frame.title || "")
      ).toLowerCase();

      return value.includes("java") ||
             value.includes("applet") ||
             value.includes("game");
    });
  }

  function oldRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  function secondRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  function refreshDateNowLayers() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    originalSetTimeout(function () {
      try {
        // State 1 refreshes after 1000ms.
        oldRefreshLayer();

        // State 2 refreshes after another 100ms.
        originalSetTimeout(function () {
          try {
            secondRefreshLayer();
          } finally {
            refreshScheduled = false;
          }
        }, STATE_2_DELAY_MS);
      } catch (error) {
        refreshScheduled = false;
        console.error("Date.now refresh state 1 failed", error);
      }
    }, REFRESH_DELAY_MS);
  }


  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      return;
    }

    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      // Refresh every time cbDateNowChecked is false.
      if (!checked) {
        refreshDateNowLayers();

        // Chicken-refresh behavior: reload the whole page after 60 ms.
        // Use the original timer so pageScript timer scaling cannot change it.
        if (!pageRefreshScheduled) {
          pageRefreshScheduled = true;
          originalSetTimeout(function () {
            try {
              window.location.reload();
            } catch (error) {
              pageRefreshScheduled = false;
              console.error("Date.now page refresh failed", error);
            }
          }, PAGE_REFRESH_DELAY_MS);
        }
      }
    }
  });
})();
