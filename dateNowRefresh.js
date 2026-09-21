// Refresh only the Java/HTML5 game when Date.now is disabled.
// Does not reload the entire website.
(function () {
  let previousEnabled = null;
  let refreshScheduled = false;

  function refreshGameOnly() {
    if (refreshScheduled) return;

    const applet = document.querySelector(
      'applet, object[type="application/x-java-applet"], ' +
      'embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], embed[src*="java" i]'
    );

    if (applet && applet.parentNode) {
      refreshScheduled = true;
      const replacement = applet.cloneNode(true);
      applet.parentNode.replaceChild(replacement, applet);
      window.setTimeout(function () {
        refreshScheduled = false;
      }, 1000);
      return;
    }

    const frame = Array.from(document.querySelectorAll("iframe")).find(function (f) {
      const value = ((f.src || "") + " " + (f.id || "") + " " +
        (typeof f.className === "string" ? f.className : "") + " " + (f.title || "")).toLowerCase();
      return value.includes("java") || value.includes("applet") || value.includes("game");
    });

    if (frame && frame.parentNode) {
      refreshScheduled = true;
      const src = frame.getAttribute("src");
      if (src) {
        frame.src = "about:blank";
        window.setTimeout(function () {
          frame.src = src;
        }, 2);
      } else {
        frame.parentNode.replaceChild(frame.cloneNode(true), frame);
      }
      window.setTimeout(function () {
        refreshScheduled = false;
      }, 1000);
    }
  }

  window.addEventListener("message", function (event) {
    const data = event && event.data;
    if (!data || data.command !== "setSpeedConfig" || !data.config) return;

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    if (enabled === false && previousEnabled === true) {
      window.setTimeout(function () {
        refreshGameOnly();
      }, 0);
    }

    if (enabled === true) {
      refreshScheduled = false;
    }

    previousEnabled = enabled;
  });
})();

































































































































