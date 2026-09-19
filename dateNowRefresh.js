// Independent Date.now controller.
// Continuously refresh while cbDateNowChecked is false.
// State 2 runs 100ms after state 1.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  const REFRESH_DELAY_MS = 1000;
  const STATE_2_DELAY_MS = 100;
  const FALSE_STATE_CHECK_MS = 100;

  let extensionIsEnabled = true;
  let cbDateNowChecked = false;
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
    if (refreshScheduled || cbDateNowChecked !== false) return;

    refreshScheduled = true;

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    originalSetTimeout(function () {
      if (cbDateNowChecked !== false) {
        refreshScheduled = false;
        return;
      }

      // State 1.
      oldRefreshLayer();

      // State 2: exactly 100ms after state 1.
      originalSetTimeout(function () {
        if (cbDateNowChecked !== false) {
          refreshScheduled = false;
          return;
        }

        secondRefreshLayer();

        // Website refresh after the two game refresh states.
        originalSetTimeout(function () {
          if (cbDateNowChecked === false) {
            websiteRefreshLayer();
          } else {
            refreshScheduled = false;
          }
        }, 0);
      }, STATE_2_DELAY_MS);
    }, REFRESH_DELAY_MS);
  }

  // Keep checking continuously so false is acted on for as long as it remains false.
  function monitorDateNowState() {
    if (cbDateNowChecked === false) {
      refreshDateNowLayers();
    }

    originalSetTimeout(monitorDateNowState, FALSE_STATE_CHECK_MS);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      refreshDateNowLayers();
      return;
    }

    if (data.command === "setSpeedConfig" && data.config) {
      cbDateNowChecked = data.config.cbDateNowChecked === true;

      // Start the refresh sequence immediately whenever it is false.
      if (cbDateNowChecked === false) {
        refreshDateNowLayers();
      }
    }
  });

  // Start continuous false-state monitoring.
  monitorDateNowState();
})();
