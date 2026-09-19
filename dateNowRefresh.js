// Refresh the Java/game element whenever cbDateNowChecked becomes false.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let previousDateNowChecked = null;
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

      return value.includes("java") || value.includes("applet") || value.includes("game");
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

  function refreshGame() {
    if (refreshScheduled) return;
    refreshScheduled = true;

    originalSetTimeout(function () {
      try {
        restartGameLikeReopen();
      } finally {
        refreshScheduled = false;
      }
    }, 60);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      const checked = data.config.cbDateNowChecked === true;

      // Refresh the Java/game page when the checkbox changes to false.
      // The transition check prevents repeated setSpeedConfig messages from
      // continuously refreshing the game while it remains false.
      if (previousDateNowChecked !== false && checked === false) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
        refreshGame();
      }

      previousDateNowChecked = checked;
      return;
    }

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;

      // If the extension is disabled while cbDateNowChecked is already false,
      // refresh the game as well.
      if (!extensionIsEnabled && previousDateNowChecked === false) {
        refreshGame();
      }
    }
  });
})();
