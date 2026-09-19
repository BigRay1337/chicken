// Refresh only the detected Java/HTML5 game when Date.now is disabled.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  function refreshJavaGameOnly() {
    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], embed[type="application/x-java-applet"], object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      applet.parentNode.replaceChild(applet.cloneNode(true), applet);
      return true;
    }

    const frame = Array.from(document.querySelectorAll("iframe")).find((f) => {
      const value = ((f.src || "") + " " + (f.id || "") + " " +
        (typeof f.className === "string" ? f.className : "") + " " + (f.title || "")).toLowerCase();
      return value.includes("java") || value.includes("applet") || value.includes("game");
    });

    if (frame && frame.parentNode) {
      const src = frame.getAttribute("src");
      if (src) {
        frame.src = "about:blank";
        frame.src = src;
      } else {
        frame.parentNode.replaceChild(frame.cloneNode(true), frame);
      }
      return true;
    }

    return false;
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // When cbDateNowChecked becomes false, refresh only the game element/frame.
    if (enabled === false && previousEnabled !== false && !refreshScheduled) {
      refreshScheduled = true;
      window.setTimeout(function () {
        refreshJavaGameOnly();
      }, 60);
    }

    if (enabled === true) refreshScheduled = false;
    previousEnabled = enabled;
  });
})();
