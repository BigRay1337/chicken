// Independent Date.now controller.
// Refresh the game whenever cbDateNowChecked is false.
// The surrounding website is left running.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let lastDateNowChecked = null;
  let refreshScheduled = false;

  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  function restartGameLikeReopen() {
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      applet.parentNode.replaceChild(applet.cloneNode(true), applet);
      return true;
    }

    const gameFrame = Array.from(document.querySelectorAll("iframe")).find((frame) => {
      const value = (
        (frame.src || "") + " " +
        (frame.id || "") + " " +
        (typeof frame.className === "string" ? frame.className : "") + " " +
        (frame.title || "")
      ).toLowerCase();

      return (
        value.includes("java") ||
        value.includes("applet") ||
        value.includes("game")
      );
    });

    if (gameFrame && gameFrame.parentNode) {
      const src = gameFrame.getAttribute("src");

      if (src) {
        gameFrame.src = "about:blank";
        gameFrame.src = src;
      } else {
        gameFrame.parentNode.replaceChild(gameFrame.cloneNode(true), gameFrame);
      }

      return true;
    }

    return false;
  }

  function refreshWhenDateNowUnchecked(config) {
    const checked = config && config.cbDateNowChecked === true;

    // Every transition to false triggers a fresh game restart.
    if (!checked && lastDateNowChecked !== false && !refreshScheduled) {
      refreshScheduled = true;

      // Reset Date.now before restarting the game.
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      originalSetTimeout(function () {
        restartGameLikeReopen();
        refreshScheduled = false;
      }, 60);
    }

    lastDateNowChecked = checked;
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
      refreshWhenDateNowUnchecked(data.config);
    }
  });
})();
