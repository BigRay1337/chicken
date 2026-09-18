// Independent Date.now controller.
// This file does not depend on pageScript.js or its speed/timer source code.
(function () {
  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = originalDateNow();
  let previusDateNowValue = dateNowValue;
  let refreshScheduled = false;

  // Date.now is controlled entirely by this file.
  Date.now = function () {
    const originalValue = originalDateNow();

    if (!extensionIsEnabled) {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  // Only the extension lifecycle controls Date.now state.
  // No speedConfig or pageScript.js code is required.
  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setExtensionDateNowState") return;

    const wasEnabled = extensionIsEnabled;
    extensionIsEnabled = data.enabled === true;

    if (!extensionIsEnabled) {
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    } else if (!wasEnabled) {
      // Start a new independent frozen Date.now value when re-enabled.
      dateNowValue = originalDateNow();
      previusDateNowValue = dateNowValue;
    }

    // Keep this refresh separate from the Date.now implementation.
    if (wasEnabled && !extensionIsEnabled && !refreshScheduled) {
      refreshScheduled = true;
      originalSetTimeout(function () {
        refreshScheduled = false;

        // Refresh only a Java/game container when one exists.
        const applet = document.querySelector(
          'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
          'object[classid*="java" i], embed[src*="java" i]'
        );

        if (applet && applet.parentNode) {
          applet.parentNode.replaceChild(applet.cloneNode(true), applet);
          return;
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
        }
      }, 60);
    }
  });
})();
