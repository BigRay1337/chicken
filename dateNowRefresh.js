// Date.now refresh layer for the Java game only.
// This file never reloads window.location or the surrounding website.
// It refreshes only a detected Java applet/object/embed or Java-game iframe.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  function findJavaGame() {
    const javaElement = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (javaElement) return javaElement;

    const frames = Array.from(document.querySelectorAll("iframe"));
    return frames.find((frame) => {
      const value = (
        (frame.src || "") + " " +
        (frame.id || "") + " " +
        (typeof frame.className === "string" ? frame.className : "") + " " +
        (frame.title || "")
      ).toLowerCase();

      return value.includes("java") ||
             value.includes("applet") ||
             value.includes("java-game") ||
             value.includes("javagame");
    });
  }

  function refreshJavaGameOnly() {
    const game = findJavaGame();

    // No Java game in this document/frame: do nothing.
    if (!game || !game.parentNode) return false;

    try {
      const replacement = game.cloneNode(true);
      game.parentNode.replaceChild(replacement, game);
      return true;
    } catch (error) {
      console.debug("Java game refresh failed", error);
      return false;
    }
  }

  function scheduleJavaGameRefresh() {
    if (refreshScheduled) return;

    refreshScheduled = true;

    // Keep the refresh local to the Java game element.
    window.setTimeout(function () {
      refreshJavaGameOnly();
      refreshScheduled = false;
    }, 60);
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data) return;

    if (data.command === "setSpeedConfig" && data.config) {
      const enabled = data.config.cbDateNowChecked === true;

      // Ignore the first configuration sent during startup.
      if (previousEnabled === null) {
        previousEnabled = enabled;
        return;
      }

      // Date.now enabled -> disabled: refresh the Java game only.
      if (previousEnabled === true && enabled === false) {
        scheduleJavaGameRefresh();
      }

      previousEnabled = enabled;
      return;
    }

    if (data.command === "setExtensionDateNowState") {
      const enabled = data.enabled === true;

      // When the extension is disabled, refresh only the Java game.
      if (previousEnabled === true && enabled === false) {
        scheduleJavaGameRefresh();
      }

      previousEnabled = enabled;
    }
  });
})();
