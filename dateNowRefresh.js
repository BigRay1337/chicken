// Independent Date.now controller.
// Restart only the game/app container when Date.now control is turned off.
// The surrounding website is left running.
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

  function restartGameLikeReopen() {
    // Restart a Java applet by replacing it with a fresh instance.
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      const replacement = applet.cloneNode(true);
      applet.parentNode.replaceChild(replacement, applet);
      return true;
    }

    // Restart only a dedicated game iframe, similar to closing and
    // reopening the browser game app. Do not reload the parent website.
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
        // Force a fresh navigation of the game frame.
        gameFrame.src = "about:blank";
        gameFrame.src = src;
      } else {
        const replacement = gameFrame.cloneNode(true);
        gameFrame.parentNode.replaceChild(replacement, gameFrame);
      }

      return true;
    }

    return false;
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setExtensionDateNowState") return;

    const wasEnabled = extensionIsEnabled;
    extensionIsEnabled = data.enabled === true;

    // Start Date.now from a fresh value, like a newly opened game.
    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    // Only restart the game when Date.now control is turned off.
    if (wasEnabled && !extensionIsEnabled && !refreshScheduled) {
      refreshScheduled = true;

      originalSetTimeout(function () {
        restartGameLikeReopen();
        refreshScheduled = false;
      }, 60);
    }
  });
})();
