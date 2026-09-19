// Independent Date.now controller.
// Refresh the game/app every time the extension is disabled.
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
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      const replacement = applet.cloneNode(true);
      applet.parentNode.replaceChild(replacement, applet);
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
        const replacement = gameFrame.cloneNode(true);
        gameFrame.parentNode.replaceChild(replacement, gameFrame);
      }

      return true;
    }

    return false;
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      if (!extensionIsEnabled) {
        // Every disable event gets a completely fresh Date.now value.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;

        // Every disable notification schedules a new game refresh.
        if (!refreshScheduled) {
          refreshScheduled = true;

          originalSetTimeout(function () {
            try {
              restartGameLikeReopen();
            } finally {
              refreshScheduled = false;
            }
          }, 60);
        }
      } else {
        // Re-enable starts Date.now from a fresh value for the next disable.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      return;
    }
  });
})();
