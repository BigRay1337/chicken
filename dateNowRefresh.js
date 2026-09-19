// Independent Date.now controller.
// Layer 1 keeps the existing game refresh.
// Layer 2 performs a second game refresh after the first one.
// The surrounding website is not reloaded.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

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

  // Existing refresh layer.
  function oldRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    const replacement = game.cloneNode(true);
    game.parentNode.replaceChild(replacement, game);
    return true;
  }

  // Second refresh layer. It runs after the original refresh has had
  // time to recreate the game instance.
  function secondRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    const replacement = game.cloneNode(true);
    game.parentNode.replaceChild(replacement, game);
    return true;
  }

  function refreshDateNowLayers() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    // Give Date.now a fresh starting value.
    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    // Layer 1: preserve the old game refresh.
    oldRefreshLayer();

    // Layer 2: refresh the newly recreated game again.
    originalSetTimeout(function () {
      try {
        secondRefreshLayer();
      } finally {
        refreshScheduled = false;
      }
    }, 60);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      const wasEnabled = extensionIsEnabled;
      extensionIsEnabled = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      // Keep the old refresh behavior and add the second layer.
      if (wasEnabled && !extensionIsEnabled) {
        refreshDateNowLayers();
      }

      return;
    }

    // Also respond directly to cbDateNowChecked becoming false.
    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      if (!checked && !extensionIsEnabled) {
        refreshDateNowLayers();
      }
    }
  });
})();
