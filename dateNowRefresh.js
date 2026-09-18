// Independent Date.now controller.
// Date.now state is also exposed through window so the game can see that
// Date.now control is disabled when the extension itself is disabled.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let restartScheduled = false;

  // Keep the Date.now checked state available on window.
  window.cbDateNowChecked = true;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  function setDateNowWindowState(checked) {
    window.cbDateNowChecked = checked;

    // Also expose the state in a small object for game code that reads
    // window.speedConfig.cbDateNowChecked.
    if (!window.speedConfig || typeof window.speedConfig !== "object") {
      window.speedConfig = {};
    }

    window.speedConfig.cbDateNowChecked = checked;
  }

  function restartGame() {
    if (restartScheduled) return;
    restartScheduled = true;

    originalSetTimeout(function () {
      restartScheduled = false;

      const game =
        document.querySelector(
          '[id*="game" i], [class*="game" i], ' +
          '[id*="java" i], [class*="java" i], ' +
          'applet, object[type="application/x-java-applet"], ' +
          'embed[type="application/x-java-applet"]'
        ) ||
        document.querySelector(
          'iframe[src*="game" i], iframe[src*="java" i], iframe[src*="applet" i]'
        );

      if (!game || !game.parentNode) return;

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
      // Extension disabled: Date.now checkbox/state is FALSE.
      setDateNowWindowState(false);
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    } else {
      // Extension enabled: Date.now control is TRUE again.
      setDateNowWindowState(true);
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      if (!wasEnabled) {
        restartGame();
      }
    }
  });
})();
