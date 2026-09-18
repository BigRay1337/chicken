// Independent Date.now controller.
// cbDateNowChecked is the only setting that enables or disables Date.now control.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let cbDateNowChecked = false;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;

  Date.now = function () {
    const originalValue = originalDateNow();

    // Checkbox ON: use the controlled Date.now value.
    // Checkbox OFF: use the browser's current Date.now value.
    if (!cbDateNowChecked) {
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
      gameFrame.parentNode.replaceChild(gameFrame.cloneNode(true), gameFrame);
      return true;
    }

    window.dispatchEvent(new CustomEvent("dateNowGameReopen", {
      detail: {
        reason: "cbDateNowChecked-disabled",
        dateNow: originalDateNow()
      }
    }));

    return false;
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    // cbDateNowChecked directly controls Date.now.
    if (data.command === "setSpeedConfig" && data.config) {
      const newChecked = data.config.cbDateNowChecked === true;
      const wasChecked = cbDateNowChecked;

      cbDateNowChecked = newChecked;

      if (cbDateNowChecked) {
        // Start a fresh controlled value when enabled.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      } else {
        // Return Date.now to the browser's current time when disabled.
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }

      // When the checkbox is turned OFF, restart only the game container.
      if (wasChecked && !cbDateNowChecked && !refreshScheduled) {
        refreshScheduled = true;

        originalSetTimeout(function () {
          restartGameLikeReopen();
          refreshScheduled = false;
        }, 60);
      }

      return;
    }

    // Keep compatibility with extension lifecycle messages without allowing
    // them to override cbDateNowChecked.
  });
})();
