(function () {
  "use strict";

  // Experimental Dodge Bob canvas heuristic. Only runs on the target game.
  if (!/spinquest\\.com\\/casino\\/games\\/iconic21_launch_spq_dodge_bob/i.test(location.href)) return;

  let freezeChicken = true;
  const lastPlayerDraw = new WeakMap();
  const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (!proto || !proto.drawImage) return;

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.command !== "setSpeedConfig") return;
    // TRUE freezes the player; FALSE restores normal player movement.
    freezeChicken = event.data.config && event.data.config.cbDateNowChecked !== false;
  });

  const originalDrawImage = proto.drawImage;
  proto.drawImage = function (image) {
    if (!freezeChicken || !this.canvas) return originalDrawImage.apply(this, arguments);

    const args = Array.prototype.slice.call(arguments);
    let x, y, w, h, xIndex, yIndex;
    if (args.length === 3) {
      xIndex = 1; yIndex = 2; x = args[1]; y = args[2];
      w = image && (image.width || image.videoWidth) || 0;
      h = image && (image.height || image.videoHeight) || 0;
    } else if (args.length === 5) {
      xIndex = 1; yIndex = 2; x = args[1]; y = args[2]; w = args[3]; h = args[4];
    } else if (args.length >= 9) {
      xIndex = 5; yIndex = 6; x = args[5]; y = args[6]; w = args[7]; h = args[8];
    } else {
      return originalDrawImage.apply(this, arguments);
    }

    const cw = this.canvas.width || 1;
    const ch = this.canvas.height || 1;
    const centerX = x + w / 2;
    const aspect = h ? w / h : 0;

    // Guess the chicken is a roughly square sprite near the center/player lane.
    // Ignore wide vehicle sprites to reduce the chance of freezing cars.
    const isLikelyChicken = w > 0 && h > 0 &&
      centerX > cw * 0.28 && centerX < cw * 0.72 &&
      aspect > 0.55 && aspect < 1.55;

    if (isLikelyChicken) {
      let saved = lastPlayerDraw.get(this.canvas);
      if (!saved) {
        saved = { x, y, w, h };
        lastPlayerDraw.set(this.canvas, saved);
      }
      args[xIndex] = saved.x;
      args[yIndex] = saved.y;
      if (args.length !== 3) {
        args[xIndex + 2] = saved.w;
        args[yIndex + 2] = saved.h;
      }
    }

    return originalDrawImage.apply(this, args);
  };
})();