(function () {
  "use strict";

  // Dodge Bob only. Freeze the player sprite's draw position, not the
  // canvas/game clock, so traffic and the rest of the game keep moving.
  let targetGame = false;
  try {
    const url = new URL(location.href);
    targetGame = url.hostname.endsWith("spinquest.com") &&
      url.pathname.includes("/casino/games/iconic21_launch_spq_dodge_bob");
  } catch (_) {}
  if (!targetGame) return;

  const proto = window.CanvasRenderingContext2D &&
    window.CanvasRenderingContext2D.prototype;
  if (!proto || typeof proto.drawImage !== "function") return;

  let freezeEnabled = false;
  let lockedSprite = null;

  window.addEventListener("message", function (event) {
    const data = event.data;
    if (!data || data.command !== "chickenFreezeMode") return;
    freezeEnabled = data.enabled === true;
    if (!freezeEnabled) lockedSprite = null;
  });

  const originalDrawImage = proto.drawImage;

  function getDrawInfo(args) {
    const image = args[0];
    if (!image) return null;

    let sx = 0, sy = 0, sw = 0, sh = 0;
    let dx = 0, dy = 0, dw = 0, dh = 0;
    if (args.length === 3) {
      dx = Number(args[1]); dy = Number(args[2]);
      dw = Number(image.width || image.videoWidth || 0);
      dh = Number(image.height || image.videoHeight || 0);
      sw = dw; sh = dh;
    } else if (args.length === 5) {
      dx = Number(args[1]); dy = Number(args[2]);
      dw = Number(args[3]); dh = Number(args[4]);
      sw = Number(image.width || image.videoWidth || 0);
      sh = Number(image.height || image.videoHeight || 0);
    } else if (args.length >= 9) {
      sx = Number(args[1]); sy = Number(args[2]);
      sw = Number(args[3]); sh = Number(args[4]);
      dx = Number(args[5]); dy = Number(args[6]);
      dw = Number(args[7]); dh = Number(args[8]);
    } else return null;

    if (![sx, sy, sw, sh, dx, dy, dw, dh].every(Number.isFinite) ||
        sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return null;

    return { image, sourceKey: [sx, sy, sw, sh].join(":"), dx, dy, dw, dh };
  }

  proto.drawImage = function () {
    if (!freezeEnabled || !this.canvas) {
      return originalDrawImage.apply(this, arguments);
    }

    const args = Array.prototype.slice.call(arguments);
    const info = getDrawInfo(args);
    if (!info) return originalDrawImage.apply(this, arguments);

    const cw = this.canvas.width || 1;
    const ch = this.canvas.height || 1;
    const aspect = info.dw / info.dh;

    // Lock one compact sprite drawn in the lower player lane. Matching both
    // the image and source crop avoids pinning other frames in a shared atlas.
    const candidate =
      info.dy + info.dh >= ch * 0.72 &&
      info.dw <= cw * 0.22 &&
      info.dh <= ch * 0.22 &&
      aspect >= 0.65 && aspect <= 1.35;

    if (!lockedSprite && candidate) {
      lockedSprite = {
        canvas: this.canvas,
        image: info.image,
        sourceKey: info.sourceKey,
        x: info.dx,
        y: info.dy,
        width: info.dw,
        height: info.dh
      };
    }

    if (lockedSprite &&
        lockedSprite.canvas === this.canvas &&
        lockedSprite.image === info.image &&
        lockedSprite.sourceKey === info.sourceKey) {
      if (args.length === 3) {
        args[1] = lockedSprite.x;
        args[2] = lockedSprite.y;
      } else if (args.length === 5) {
        args[1] = lockedSprite.x;
        args[2] = lockedSprite.y;
        args[3] = lockedSprite.width;
        args[4] = lockedSprite.height;
      } else {
        args[5] = lockedSprite.x;
        args[6] = lockedSprite.y;
        args[7] = lockedSprite.width;
        args[8] = lockedSprite.height;
      }
    }
    return originalDrawImage.apply(this, args);
  };
})();