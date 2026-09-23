// Refresh only the Java/HTML5 game when Date.now is disabled.
// A screen tap temporarily disables cbDateNowChecked, refreshes the game,
// then re-enables cbDateNowChecked after the game refresh.
// Does not reload the entire website.
(function () {
  "use strict";

  let previousEnabled = null;
  let refreshScheduled = false;
  let useLongDelay = true;
  let tapLock = false;

  function setDateNowEnabled(enabled) {
    window.postMessage({
      command: "setSpeedConfig",
      config: {
        cbDateNowChecked: enabled
      }
    });

    previousEnabled = enabled;
  }

  function reenableAfterGameRefresh() {
    window.setTimeout(function () {
      setDateNowEnabled(true);
      tapLock = false;
    }, 0);
  }

  function refreshGameOnly() {
    if (refreshScheduled) return false;

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
        reenableAfterGameRefresh();
      }, 0);

      return true;
    }

    const frame = Array.from(document.querySelectorAll("iframe")).find(function (f) {
      const value = (
        (f.src || "") + " " +
        (f.id || "") + " " +
        (typeof f.className === "string" ? f.className : "") + " " +
        (f.title || "")
      ).toLowerCase();

      return (
        value.includes("java") ||
        value.includes("applet") ||
        value.includes("game")
      );
    });

    if (frame && frame.parentNode) {
      refreshScheduled = true;
      const src = frame.getAttribute("src");

      if (src) {
        frame.src = "about:blank";

        window.setTimeout(function () {
          if (frame.parentNode) {
            frame.src = src;
          }

          window.setTimeout(function () {
            refreshScheduled = false;
            reenableAfterGameRefresh();
          }, 0);
        }, 2);
      } else {
        frame.parentNode.replaceChild(frame.cloneNode(true), frame);

        window.setTimeout(function () {
          refreshScheduled = false;
          reenableAfterGameRefresh();
        }, 0);
      }

      return true;
    }

    // No game element was found, so do not leave Date.now disabled.
    refreshScheduled = false;
    reenableAfterGameRefresh();
    return false;
  }

  function scheduleGameRefresh() {
    if (refreshScheduled) return;

    // Keep the existing 0/1000 ms refresh sequence.
    const refreshDelay = useLongDelay ? 0 : 1000;
    useLongDelay = !useLongDelay;

    window.setTimeout(function () {
      refreshGameOnly();
    }, refreshDelay);
  }

  // Screen-tap listener:
  // one tap -> cbDateNowChecked=false -> game refresh -> cbDateNowChecked=true.
  function handleScreenTap(event) {
    if (tapLock || refreshScheduled) return;
    if (previousEnabled === false) return;

    tapLock = true;
    setDateNowEnabled(false);
    scheduleGameRefresh();
  }

  // pointerup covers touchscreen taps and mouse clicks without requiring
  // separate touchstart/click handlers.
  document.addEventListener("pointerup", handleScreenTap, {
    passive: true,
    capture: true
  });

  window.addEventListener("message", function (event) {
    const data = event && event.data;

    if (
      !data ||
      data.command !== "setSpeedConfig" ||
      !data.config
    ) {
      return;
    }

    const enabled = data.config.cbDateNowChecked === true;

    if (previousEnabled === null) {
      previousEnabled = enabled;
      return;
    }

    // Preserve normal checkbox/config changes.
    if (enabled === false && previousEnabled === true && !tapLock) {
      scheduleGameRefresh();
    }

    if (enabled === true && !tapLock) {
      refreshScheduled = false;
    }

    previousEnabled = enabled;
  });
})();
