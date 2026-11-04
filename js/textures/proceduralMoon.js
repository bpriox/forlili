/* تکسچر رویه‌ای ماه — فقط وقتی استفاده می‌شود که فایل تکسچر واقعی بارگذاری نشود.
   (منتقل‌شده از پروتوتایپ moon-3D.html بدون تغییر در الگوریتم) */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================================================
   تکسچر رویه‌ای (Fallback)
   ========================================================= */
export function createProceduralMoonTextures(opts = {}) {
  const W = opts.width ?? 2048;
  const H = opts.height ?? 1024;
  const TAU = Math.PI * 2;
  const rand = mulberry32((opts.seed ?? 20240607));

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = W;
  colorCanvas.height = H;
  const ctx = colorCanvas.getContext("2d", { alpha: false });

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bctx = bumpCanvas.getContext("2d", { alpha: false });

  ctx.fillStyle = "#918d87";
  ctx.fillRect(0, 0, W, H);
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 100; i++) {
    const x = rand() * W,
      y = rand() * H;
    const r = W * (0.02 + rand() * 0.15);
    const bright = rand() > 0.45;
    const rgb = bright ? "212,208,200" : "56,54,52";
    const a = 0.03 + rand() * 0.06;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a.toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  for (let m = 0; m < 13; m++) {
    const mx = W * (0.08 + rand() * 0.84);
    const my = H * (0.18 + rand() * 0.64);
    const mrx = W * (0.025 + rand() * 0.075);
    const mry = H * (0.05 + rand() * 0.15);
    const blobs = 26 + Math.floor(rand() * 26);
    for (let i = 0; i < blobs; i++) {
      const ang = rand() * TAU;
      const d = Math.pow(rand(), 0.6);
      const bx = mx + Math.cos(ang) * mrx * d * 0.9;
      const by = my + Math.sin(ang) * mry * d * 0.9;
      const br = (0.18 + rand() * 0.35) * mrx;
      const cg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      cg.addColorStop(0, "rgba(58,56,54,0.22)");
      cg.addColorStop(1, "rgba(58,56,54,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.fill();
      const hg = bctx.createRadialGradient(bx, by, 0, bx, by, br);
      hg.addColorStop(0, "rgba(118,118,118,0.25)");
      hg.addColorStop(1, "rgba(118,118,118,0)");
      bctx.fillStyle = hg;
      bctx.beginPath();
      bctx.arc(bx, by, br, 0, TAU);
      bctx.fill();
    }
  }

  function paintCrater(x, y, r, stretch) {
    const fresh = rand();
    const rimA = 0.1 + fresh * 0.22;
    const floorA = 0.1 + fresh * 0.16;
    const alpha = 0.6 + rand() * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretch, 1);

    if (r > 6) {
      const eg = ctx.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 2.1);
      eg.addColorStop(
        0,
        "rgba(216,212,203," + (0.1 * alpha).toFixed(3) + ")",
      );
      eg.addColorStop(1, "rgba(216,212,203,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.1, 0, TAU);
      ctx.fill();
    }

    if (r > 24) {
      const rayCount = 9 + Math.floor(rand() * 15);
      for (let i = 0; i < rayCount; i++) {
        const ang = rand() * TAU;
        const len = r * (1.5 + rand() * 5.0);
        const spread = 0.015 + rand() * 0.05;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(ang - spread) * len,
          Math.sin(ang - spread) * len,
        );
        ctx.lineTo(
          Math.cos(ang + spread) * len,
          Math.sin(ang + spread) * len,
        );
        ctx.closePath();
        ctx.fillStyle =
          "rgba(232,229,220," + (0.02 + rand() * 0.05).toFixed(3) + ")";
        ctx.fill();
      }
    }

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(
      0.0,
      "rgba(44,42,40," + (floorA * alpha).toFixed(3) + ")",
    );
    g.addColorStop(
      0.55,
      "rgba(58,56,53," + (floorA * alpha).toFixed(3) + ")",
    );
    g.addColorStop(
      0.82,
      "rgba(96,93,88," + (floorA * 0.55 * alpha).toFixed(3) + ")",
    );
    g.addColorStop(
      0.93,
      "rgba(214,210,199," + (rimA * alpha).toFixed(3) + ")",
    );
    g.addColorStop(1.0, "rgba(214,210,199,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();

    bctx.save();
    bctx.translate(x, y);
    bctx.scale(stretch, 1);
    const hg = bctx.createRadialGradient(0, 0, 0, 0, 0, r);
    hg.addColorStop(0.0, "rgba(74,74,74,0.95)");
    hg.addColorStop(0.55, "rgba(96,96,96,0.90)");
    hg.addColorStop(0.84, "rgba(112,112,112,0.55)");
    hg.addColorStop(0.93, "rgba(214,214,214,0.90)");
    hg.addColorStop(1.0, "rgba(128,128,128,0)");
    bctx.fillStyle = hg;
    bctx.beginPath();
    bctx.arc(0, 0, r, 0, TAU);
    bctx.fill();
    bctx.restore();
  }

  for (let i = 0; i < (opts.craterCount ?? 1400); i++) {
    const t = Math.pow(rand(), 3.0);
    const r = 1.6 + t * 62;
    const x = rand() * W;
    const v = 0.055 + rand() * 0.89;
    const y = v * H;
    const lat = (0.5 - v) * Math.PI;
    const stretch = Math.min(4.5, 1 / Math.max(0.22, Math.cos(lat)));
    paintCrater(x, y, r, stretch);
    if (x - r * stretch < 0) paintCrater(x + W, y, r, stretch);
    if (x + r * stretch > W) paintCrater(x - W, y, r, stretch);
  }

  const gs = 256;
  const gc = document.createElement("canvas");
  gc.width = gc.height = gs;
  const gx = gc.getContext("2d");
  const gd = gx.createImageData(gs, gs);
  for (let i = 0; i < gd.data.length; i += 4) {
    const v = 96 + Math.floor(rand() * 128);
    gd.data[i] = v;
    gd.data[i + 1] = v;
    gd.data[i + 2] = v;
    gd.data[i + 3] = 255;
  }
  gx.putImageData(gd, 0, 0);
  const pat = ctx.createPattern(gc, "repeat");
  if (pat) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  return { colorCanvas, bumpCanvas };
}
