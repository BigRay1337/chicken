// Game-frame refresh only.
// Does not refresh the surrounding website.
// Active while cbDateNowChecked is false.

(function () {
  "use strict";

  let previousEnabled = null;
  let refreshTimer = null;
  let longDelay = true;

  const MIN_DELAY = 0;
  const MAX_DELAY = 1000;

  function findGameFrame() {
    const gameObject = document.querySelector(
      'applet, ' +
      'object[type="application/x-java-applet"], ' +
      'embed[type="application/x-java-applet"], ' +
      'object[classid*="java" i], ' +
      'embed[src*="java" i]'
    );

    if (gameObject) {
      return { element: gameObject, type: "game-object" };
    }

    const frames = Array.from(document.querySelectorAll("iframe"));

    const gameFrame = frames.find(function (frame) {
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
    });

    if (gameFrame) {
      return { element: gameFrame, type: "iframe" };
    }

    return null;
  }

  function refreshGameFrame() {
    const game = findGameFrame();

    if (!game || !game.element || !game.element.parentNode) {
      return;
    }

    const element = game.element;

    // Never refresh the entire page.
    if (game.type === "iframe") {
      const oldSrc = element.getAttribute("src");

      if (oldSrc) {
        element.src = "about:blank";

        window.setTimeout(function () {
          if (element.parentNode) {
            element.src = oldSrc;
          }
        }, 0);
      } else {
        element.parentNode.replaceChild(
          element.cloneNode(true),
          element
        );
      }

      return;
    }

    // Java applet/object/embed game only.
    element.parentNode.replaceChild(
      element.cloneNode(true),
      element
    );
  }

  function scheduleGameRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    // Alternate between 1000 ms and 0 ms.
    const delay = longDelay ? MAX_DELAY : MIN_DELAY;
    longDelay = !longDelay;

    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;
      refreshGameFrame();
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
      scheduleGameRefresh();
    }

    if (enabled === true) {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    }

    previousEnabled = enabled;
  });
})();
