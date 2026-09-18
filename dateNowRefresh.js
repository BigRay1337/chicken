// Independent Date.now controller.
// Date.now runs directly through this source file.
// When Date.now control is turned off, restart the game container
// like reopening the browser app, without reloading the surrounding website.
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
    // Restart a Java/app game container without reloading the parent website.
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      const replacement = applet.cloneNode(true);
      applet.parentNode.replaceChild(replacement, applet);
      return true;
    }

    // Restart a dedicated game iframe as if that game app were reopened.
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
      const replacement = gameFrame.cloneNode(true);
      gameFrame.parentNode.replaceChild(replacement, gameFrame);
      return true;
    }

    // For a browser-based game app running directly in the current document,
    // restart the game source instead of reloading the entire website.
    window.dispatchEvent(new CustomEvent("dateNowGameReopen", {
      detail: {
        reason: "dateNow-disabled",
        dateNow: originalDateNow()
      }
    }));

    return false;
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setExtensionDateNowState") return;

    const wasEnabled = extensionIsEnabled;
    extensionIsEnabled = data.enabled === true;

    // Give Date.now a fresh starting point, like reopening the game app.
    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    // Only restart the game when Date.now control changes from enabled to disabled.
    if (wasEnabled && !extensionIsEnabled && !refreshScheduled) {
      refreshScheduled = true;

      originalSetTimeout(function () {
        restartGameLikeReopen();
        refreshScheduled = false;
      }, 60);
    }
  });
})();
