// Combined Chicken + Chicken-refresh Date.now controller.
// Keeps the existing game refresh layers and adds the Chicken-refresh
// lifecycle behavior: when the extension is disabled, Date.now remains
// enabled at 1x for 1 second, then the game is refreshed before the
// surrounding website is refreshed 7 seconds later.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  const DATE_NOW_DISABLE_DELAY_MS = 1000;
  const WEBSITE_REFRESH_DELAY_MS = 7000;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;
  let disableTimer = null;

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
    if (refreshScheduled) return;
    refreshScheduled = true;

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    // Layer 1: refresh the Java/game element first.
    oldRefreshLayer();

    // Layer 2: preserve the existing second game refresh immediately after it.
    originalSetTimeout(function () {
      secondRefreshLayer();

      // Layer 3: wait 7 seconds after the game refresh before reloading the site.
      originalSetTimeout(function () {
        websiteRefreshLayer();
        refreshScheduled = false;
      }, WEBSITE_REFRESH_DELAY_MS);
    }, 0);
  }

  function disableDateNowAfterDelay() {
    if (disableTimer !== null) {
      originalSetTimeout(() => {}, 0);
    }

    disableTimer = originalSetTimeout(function () {
      disableTimer = null;
      extensionIsEnabled = false;
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
      refreshDateNowLayers();
    }, DATE_NOW_DISABLE_DELAY_MS);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      const enabled = data.enabled === true;

      if (enabled) {
        extensionIsEnabled = true;
        if (disableTimer !== null) {
          clearTimeout(disableTimer);
          disableTimer = null;
        }
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      } else if (extensionIsEnabled) {
        // Keep the spoofing layer alive at normal 1x behavior for 1 second,
        // then disable Date.now and run the combined refresh sequence.
        disableDateNowAfterDelay();
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
