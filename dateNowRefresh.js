// Independent Date.now controller.
// Keep the existing game refresh layers.
// When Date.now is disabled, also refresh the surrounding website.
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

  // Existing game refresh layer.
  function oldRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  // Existing second game refresh layer.
  function secondRefreshLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    game.parentNode.replaceChild(game.cloneNode(true), game);
    return true;
  }

  // New website refresh layer.
  function websiteRefreshLayer() {
    try {
      window.location.reload();
      return true;
    } catch (error) {
      console.debug("Could not refresh website", error);
      return false;
    }
  }

  function refreshDateNowLayers() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    // Layer 1: keep the old game refresh.
    oldRefreshLayer();

    // Layer 2: keep the second game refresh.
    originalSetTimeout(function () {
      secondRefreshLayer();

      // Layer 3: after the game layers, refresh the actual website.
      originalSetTimeout(function () {
        websiteRefreshLayer();
        refreshScheduled = false;
      }, 1010101);
    }, 1010101);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      const wasEnabled = extensionIsEnabled;
      extensionIsEnabled = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      // When Date.now becomes disabled, run all refresh layers.
      if (wasEnabled && !extensionIsEnabled) {
        refreshDateNowLayers();
      }

      return;
    }

    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      // If cbDateNowChecked is false while the extension is disabled,
      // run the same game + website refresh sequence.
      if (!checked && !extensionIsEnabled) {
        refreshDateNowLayers();
      }
    }
  });
})();
;
;

;
