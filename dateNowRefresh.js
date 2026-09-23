// Background-frame refresh only.
// Refreshes a non-game iframe in the page background.
// Does not refresh the Java/HTML5 game frame.
// Active while cbDateNowChecked is false.
// Skips exactly one animation frame between refresh attempts.

(function () {
  "use strict";

  let previousEnabled = null;
  let refreshTimer = null;
  let longDelay = true;
  let skipFrame = false;

  const MIN_DELAY = 0;
  const MAX_DELAY = 1000;

  function isGameFrame(frame) {
    const info = (
      (frame.src || "") + " " +
      (frame.id || "") + " " +
      (typeof frame.className === "string" ? frame.className : "") + " " +
      (frame.title || "") + " " +
      (frame.name || "")
    ).toLowerCase();

    return (
      info.includes("java") ||
      info.includes("applet") ||
      info.includes("game")
    );
  }

  function findBackgroundFrame() {
    const frames = Array.from(document.querySelectorAll("iframe"));

    return frames.find(function (frame) {
      return frame.parentNode && !isGameFrame(frame);
    }) || null;
  }

  function refreshBackgroundFrame() {
    const frame = findBackgroundFrame();

    if (!frame || !frame.parentNode) {
      return;
    }

    const oldSrc = frame.getAttribute("src");

    if (oldSrc) {
      frame.src = "about:blank";

      window.setTimeout(function () {
        if (frame.parentNode) {
          frame.src = oldSrc;
        }
      }, 0);
    } else {
      frame.parentNode.replaceChild(
        frame.cloneNode(true),
        frame
      );
    }
  }

  function scheduleBackgroundRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    // Skip one animation frame before each refresh.
    if (!skipFrame) {
      skipFrame = true;
      window.requestAnimationFrame(function () {
        skipFrame = false;
        scheduleBackgroundRefresh();
      });
      return;
    }

    // Keep the existing 0 ms / 1000 ms long-delay sequence.
    const delay = longDelay ? MAX_DELAY : MIN_DELAY;
    longDelay = !longDelay;

    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;
      refreshBackgroundFrame();

      // The next attempt starts by skipping one frame.
      skipFrame = false;
      scheduleBackgroundRefresh();
    }, delay);
  }

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

    if (enabled === false && previousEnabled === true) {
      skipFrame = false;
      scheduleBackgroundRefresh();
    }

    if (enabled === true && refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    previousEnabled = enabled;
  });
})();
