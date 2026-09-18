// Independent Date.now controller.
// When Date.now is disabled, restart the game container as closely as possible
// to reopening the browser game, without reloading the surrounding website.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let restartScheduled = false;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  function restartGame() {
    if (restartScheduled) return;
    restartScheduled = true;

    originalSetTimeout(function () {
      restartScheduled = false;

      // Prefer an explicitly identified game container.
      const game =
        document.querySelector(
          '[id*="game" i], [class*="game" i], ' +
          '[id*="java" i], [class*="java" i], ' +
          'applet, object[type="application/x-java-applet"], ' +
          'embed[type="application/x-java-applet"]'
        ) ||
        document.querySelector('iframe[src*="game" i], iframe[src*="java" i], iframe[src*="applet" i]');

      if (!game || !game.parentNode) return;

      // Recreate the game element. This gives the game a fresh document/runtime
      // while leaving the surrounding website page loaded.
      const replacement = game.cloneNode(true);
      game.parentNode.replaceChild(replacement, game);
    }, 60);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setExtensionDateNowState") return;

    const wasEnabled = extensionIsEnabled;
    extensionIsEnabled = data.enabled === true;

    if (!extensionIsEnabled) {
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    } else {
      // Reinitialize Date.now exactly like a newly opened game session.
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      if (!wasEnabled) {
        restartGame();
      }
    }
  });
})();
