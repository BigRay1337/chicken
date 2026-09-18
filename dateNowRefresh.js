// Independent Date.now controller.
// Date.now runs directly through this source file.
// When Date.now control is turned off, restart the game container
// as if the browser game app was reopened, without reloading the website.
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
        value.includes("game") ||
        value.includes("java") ||
        value.includes("applet") ||
        value.includes("play")
      );
    });

    if (gameFrame) {
      const source = gameFrame.src || gameFrame.getAttribute("src");

      if (source) {
        gameFrame.src = source;
      } else if (gameFrame.parentNode) {
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

    dateNowValue = originalDateNow();
    previusDateNowValue = dateNowValue;

    if (wasEnabled && !extensionIsEnabled && !refreshScheduled) {
      refreshScheduled = true;

      originalSetTimeout(function () {
        restartGameLikeReopen();
        refreshScheduled = false;
      }, 60);
    }
  });
})();
