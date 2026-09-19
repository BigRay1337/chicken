// Independent Date.now controller.
// Refresh state 1 runs after 1000ms; refresh state 2 runs 100ms later.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  // Full-page refresh behavior imported from Chicken-refresh.
  // Keep the existing two game-refresh layers as an additional layer.
  // Refresh the Java game immediately, then reload the website 7 seconds later.
  const WEBSITE_REFRESH_DELAY_MS = 7000;
  const REFRESH_DELAY_MS = 1000;
  const STATE_2_DELAY_MS = 100;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;
  let pageRefreshScheduled = false;
  let previousDateNowChecked = null;

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

  function refreshJavaGameFirstThenWebsite() {
    if (refreshScheduled || pageRefreshScheduled) return;

    refreshScheduled = true;
    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    try {
      // Refresh the Java/game element first, immediately.
      oldRefreshLayer();

      // Give the game its second refresh layer immediately after the first.
      originalSetTimeout(function () {
        try {
          secondRefreshLayer();
        } catch (error) {
          console.error("Java game second refresh failed", error);
        }
      }, STATE_2_DELAY_MS);

      // Then wait 7 seconds before reloading the entire website.
      pageRefreshScheduled = true;
      originalSetTimeout(function () {
        try {
          window.location.reload();
        } catch (error) {
          console.error("Website refresh failed", error);
        } finally {
          refreshScheduled = false;
          pageRefreshScheduled = false;
        }
      }, WEBSITE_REFRESH_DELAY_MS);
    } catch (error) {
      refreshScheduled = false;
      pageRefreshScheduled = false;
      console.error("Java game refresh failed", error);
    }
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

      // Only refresh on an actual enabled -> disabled transition.
      // This prevents the newly reloaded page from immediately reloading again
      // when it starts with cbDateNowChecked already false.
      if (previousDateNowChecked === null) {
        previousDateNowChecked = checked;
        return;
      }

      if (previousDateNowChecked === true && checked === false) {
        refreshJavaGameFirstThenWebsite();

        // The Java game is refreshed first; the full website reload follows
        // 1.9 seconds later inside refreshDateNowLayers().
      }

      previousDateNowChecked = checked;
    }
  });
})();
