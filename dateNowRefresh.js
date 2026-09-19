// Independent Date.now controller.
// Both refresh states run after a 1000ms delay.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  const REFRESH_DELAY_MS = 1000;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;

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

  // Refresh state 1: existing game refresh.
  function oldRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  // Refresh state 2: second game refresh.
  function secondRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  // Both refresh states now wait exactly 1000ms before running.
  function refreshDateNowLayers() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    originalSetTimeout(function () {
      try {
        // State 1.
        oldRefreshLayer();

        // State 2.
        secondRefreshLayer();
      } finally {
        refreshScheduled = false;
      }
    }, REFRESH_DELAY_MS);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      const wasEnabled = extensionIsEnabled;
      extensionIsEnabled = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      if (wasEnabled && !extensionIsEnabled) {
        refreshDateNowLayers();
      }

      return;
    }

    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      if (!checked && !extensionIsEnabled) {
        refreshDateNowLayers();
      }
    }
  });
})();
