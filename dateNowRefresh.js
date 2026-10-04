(() => {
  const HOLD_MS = 350;
  const MAX_MOVE_PX = 0;

  let press = null;

  function setDateNowCheckedFalse() {
    window.postMessage({
      command: "setDateNowChecked",
      checked: false
    }, "*");
  }

  function refreshGameOnly(x, y) {
    // Refresh only an embedded game layer when one is present.
    const element = document.elementFromPoint(x, y);
    const frame = element && element.closest("iframe");

    if (frame) {
      try {
        frame.contentWindow.location.reload();
        return;
      } catch (_) {}
    }

    // Give the game a chance to handle a layer-only refresh without
    // reloading the containing page.
    window.dispatchEvent(new CustomEvent("game-only-refresh", {
      detail: { x, y }
    }));
  }

  function start(x, y) {
    press = { x, y, startedAt: performance.now() };
  }

  function move(x, y) {
    if (!press) return;
    if (Math.abs(x - press.x) > MAX_MOVE_PX ||
        Math.abs(y - press.y) > MAX_MOVE_PX) {
      press = null;
    }
  }

  function end(x, y) {
    if (!press) return;

    const heldFor = performance.now() - press.startedAt;
    const noMovement =
      Math.abs(x - press.x) <= MAX_MOVE_PX &&
      Math.abs(y - press.y) <= MAX_MOVE_PX;

    const startX = press.x;
    const startY = press.y;
    press = null;

    if (heldFor >= HOLD_MS && noMovement) {
      setDateNowCheckedFalse();
      refreshGameOnly(startX, startY);
    }
  }

  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    start(touch.clientX, touch.clientY);
  }, { passive: true, capture: true });

  document.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    move(touch.clientX, touch.clientY);
  }, { passive: true, capture: true });

  document.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    if (touch) end(touch.clientX, touch.clientY);
  }, { passive: true, capture: true });

  document.addEventListener("touchcancel", () => {
    press = null;
  }, { passive: true, capture: true });
})();