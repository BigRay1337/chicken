// Refresh only the Java game/applet, not the surrounding website.
// This file stays separate from pageScript.js.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  const originalDateNow = Date.now;
  const originalSetTimeout = window.setTimeout;

  let extensionIsEnabled = true;
  let dateNowValue = null;
  let previusDateNowValue = null;

  Date.now = () => {
    const originalValue = originalDateNow();

    if (dateNowValue !== null) {
      if (!extensionIsEnabled) {
        dateNowValue = originalValue;
      }
    } else {
      dateNowValue = originalValue;
    }

    previusDateNowValue = originalValue;

    return Math.floor(0 + dateNowValue);
  };

  // Refresh the Java game itself without reloading the surrounding website.
  function refreshJavaGame() {
    // Old Java applets.
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet) {
      const parent = applet.parentNode;
      if (!parent) return;

      const replacement = applet.cloneNode(true);
      parent.replaceChild(replacement, applet);
      return;
    }

    // Java games may be hosted inside a dedicated game iframe.
    const gameFrame = Array.from(document.querySelectorAll("iframe")).find((frame) => {
      const source = (frame.src || frame.getAttribute("src") || "").toLowerCase();
      const id = (frame.id || "").toLowerCase();
      const className = (typeof frame.className === "string" ? frame.className : "").toLowerCase();
      const title = (frame.title || "").toLowerCase();

      return (
        source.includes("java") ||
        source.includes("applet") ||
        source.includes("jagex") ||
        id.includes("java") ||
        id.includes("game") ||
        className.includes("java") ||
        className.includes("game") ||
        title.includes("java") ||
        title.includes("game")
      );
    });

    if (gameFrame && gameFrame.contentWindow) {
      try {
        gameFrame.contentWindow.location.reload();
      } catch (error) {
        // Cross-origin Java game frames cannot be controlled directly.
        // Reloading the iframe element itself still refreshes the game only.
        const parent = gameFrame.parentNode;
        if (parent) {
          const replacement = gameFrame.cloneNode(true);
          parent.replaceChild(replacement, gameFrame);
        }
      }
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setExtensionDateNowState") {
      extensionIsEnabled = data.enabled === true;

      if (!extensionIsEnabled) {
        dateNowValue = originalDateNow();
        previusDateNowValue = dateNowValue;
      }
      return;
    }

    if (data.command !== "setSpeedConfig" || !data.config) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Only refresh the Java game when Date.now changes from enabled to disabled.
    // Never reload the surrounding website.
    if (previousEnabled === true && enabled === false && !refreshScheduled) {
      refreshScheduled = true;
      originalSetTimeout(function () {
        refreshJavaGame();
        refreshScheduled = false;
      }, 60);
    }

    previousEnabled = enabled;
  });
})();
