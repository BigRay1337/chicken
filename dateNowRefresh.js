// Combined Chicken + Chicken-refresh controller.
// Refresh the detected Java/game element first, then reload the website
// 7 seconds later. This file does not override Date.now, so pageScript.js
// remains the single Date.now implementation.
(function () {
  const GAME_SECOND_REFRESH_DELAY_MS = 100;
  const WEBSITE_REFRESH_DELAY_MS = 7000;

  let previousDateNowChecked = null;
  let refreshInProgress = false;
  let websiteRefreshTimer = null;
  let gameSecondRefreshTimer = null;

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

  function refreshGameLayer() {
    const game = findGame();
    if (!game || !game.parentNode) return false;

    const replacement = game.cloneNode(true);
    game.parentNode.replaceChild(replacement, game);
    return true;
  }

  function cancelScheduledRefreshes() {
    if (websiteRefreshTimer !== null) {
      clearTimeout(websiteRefreshTimer);
      websiteRefreshTimer = null;
    }

    if (gameSecondRefreshTimer !== null) {
      clearTimeout(gameSecondRefreshTimer);
      gameSecondRefreshTimer = null;
    }
  }

  function refreshGameThenWebsite() {
    if (refreshInProgress) return;

    refreshInProgress = true;
    cancelScheduledRefreshes();

    // Step 1: refresh the Java/game element immediately.
    refreshGameLayer();

    // Step 2: give the game a second refresh layer 100 ms later.
    gameSecondRefreshTimer = setTimeout(function () {
      gameSecondRefreshTimer = null;

      try {
        refreshGameLayer();
      } catch (error) {
        console.error("Java game second refresh failed", error);
      }
    }, GAME_SECOND_REFRESH_DELAY_MS);

    // Step 3: reload the entire website exactly 7 seconds after
    // the first game refresh.
    websiteRefreshTimer = setTimeout(function () {
      websiteRefreshTimer = null;

      try {
        window.location.reload();
      } catch (error) {
        refreshInProgress = false;
        console.error("Website refresh failed", error);
      }
    }, WEBSITE_REFRESH_DELAY_MS);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      // Establish the initial state without refreshing.
      if (previousDateNowChecked === null) {
        previousDateNowChecked = checked;
        return;
      }

      // Refresh only once for a true -> false transition.
      // This prevents continuous website reloads after the page comes back.
      if (previousDateNowChecked === true && checked === false) {
        refreshGameThenWebsite();
      }

      // If Date.now is enabled again before the website reloads,
      // cancel the pending full-page refresh.
      if (previousDateNowChecked === false && checked === true) {
        refreshInProgress = false;
        cancelScheduledRefreshes();
      }

      previousDateNowChecked = checked;
    }

    if (data.command === "setExtensionDateNowState" && data.enabled === false) {
      // Do not start another refresh merely because the extension lifecycle
      // changed. The speed-config transition is the refresh trigger.
      previousDateNowChecked = false;
    }
  });
})();
