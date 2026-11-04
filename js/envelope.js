import { CONFIG } from "./config.js";
import { Dust } from "./core/dust.js";
import { pointer } from "./core/input.js";

/* =========================================================
   پاکت، مهر موم و نامه (CSS 3D + SVG + GSAP)
   - لمس مهر: مهر ترک می‌خورد؛ نیمه‌ی بالا به درپوش می‌چسبد، نیمه‌ی پایین روی پاکت می‌ماند
   - درپوش با لبه‌ی بالا لولا می‌شود و بالا و پشت پاکت می‌خوابد (آستر بنفشِ پرستاره)
   - نامه از دهانه بیرون می‌آید، جلو می‌آید و بزرگ می‌شود، بعد در نور محو می‌شود
   ========================================================= */

const SVGNS = "http://www.w3.org/2000/svg";
const gsap = () => window.gsap;

/* ---------- ابزارهای کوچک ---------- */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* منحنی بسته‌ی نرم از چند نقطه (Catmull-Rom → Bézier) */
function smoothClosedPath(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

function blobPath(base, amp, n, seed) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r =
      base +
      amp * (Math.sin(3 * a + seed) * 0.45 + Math.sin(5 * a + seed * 1.7) * 0.3 + (rnd() - 0.5) * 0.9);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return smoothClosedPath(pts);
}

/* بافت دانه‌ی کاغذ، رویه‌ای (بدون فایل تصویر) */
function makeGrainDataURL() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(S, S);
  const rnd = mulberry32(7);
  for (let i = 0; i < S * S; i++) {
    const v = rnd();
    const o = i * 4;
    if (v < 0.5) {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 40;
      img.data[o + 3] = rnd() * 20;
    } else {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = rnd() * 16;
    }
  }
  ctx.putImageData(img, 0, 0);
  /* الیاف کاغذ */
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const len = 5 + rnd() * 20;
    const a = rnd() * Math.PI;
    ctx.strokeStyle = rnd() < 0.5 ? "rgba(110,90,60,0.07)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 0.5 + rnd() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5 - 2, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  return c.toDataURL("image/png");
}

/* خط شکستگی مهر (در دستگاه مختصات SVG مهر: −۶۰ تا ۶۰) */
const CRACK = [
  [-60, 5], [-46, -2], [-36, 6], [-25, -1], [-14, 7], [-4, -3],
  [6, 6], [16, -4], [27, 4], [38, -3], [48, 5], [60, 1],
];
const pct = (v) => (((v + 60) / 120) * 100).toFixed(2) + "%";
const CLIP_TOP = `polygon(0 0, 100% 0, ${CRACK.slice().reverse().map(([x, y]) => `${pct(x)} ${pct(y)}`).join(", ")})`;
const CLIP_BOTTOM = `polygon(0 100%, 100% 100%, ${CRACK.slice().reverse().map(([x, y]) => `${pct(x)} ${pct(y)}`).join(", ")})`;

/* ---------- SVGهای مشترک (gradient، الگو) ---------- */
function defsSVG(grainURL) {
  const rnd = mulberry32(99);
  let stars = "";
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * 600).toFixed(1);
    const y = (rnd() * 400).toFixed(1);
    const r = (0.4 + rnd() * 1.1).toFixed(2);
    const o = (0.2 + rnd() * 0.6).toFixed(2);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9dcff" opacity="${o}"/>`;
  }
  return `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="e-grain" width="256" height="256" patternUnits="userSpaceOnUse">
      <image href="${grainURL}" width="256" height="256"/>
    </pattern>
    <pattern id="e-stars" width="600" height="400" patternUnits="userSpaceOnUse">${stars}</pattern>

    <!-- کاغذ جلوی پاکت -->
    <linearGradient id="e-gL" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3ecdc"/><stop offset="1" stop-color="#d9ceb7"/>
    </linearGradient>
    <linearGradient id="e-gR" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7decb"/><stop offset="1" stop-color="#c8bba2"/>
    </linearGradient>
    <linearGradient id="e-gB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f1e9d7"/><stop offset="0.55" stop-color="#e4dac4"/><stop offset="1" stop-color="#cfc3aa"/>
    </linearGradient>
    <linearGradient id="e-shadeL" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.10"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.10"/>
    </linearGradient>
    <!-- درپوش -->
    <linearGradient id="e-flapOut" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6efdf"/><stop offset="0.6" stop-color="#e9e0cb"/><stop offset="1" stop-color="#d6cab2"/>
    </linearGradient>
    <linearGradient id="e-flapEdge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.12"/><stop offset="0.18" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/>
    </linearGradient>
    <!-- آستر بنفش پرستاره -->
    <linearGradient id="e-lining" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2470"/><stop offset="1" stop-color="#1b0f3c"/>
    </linearGradient>
    <linearGradient id="e-liningBack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a1858"/><stop offset="1" stop-color="#150a30"/>
    </linearGradient>
    <linearGradient id="e-hingeShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>

    <!-- مهر موم -->
    <radialGradient id="e-waxFlange" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#8e1730"/><stop offset="1" stop-color="#3d0612"/>
    </radialGradient>
    <radialGradient id="e-waxBody" cx="0.34" cy="0.28" r="0.85">
      <stop offset="0" stop-color="#e0455c"/><stop offset="0.42" stop-color="#a91c36"/><stop offset="1" stop-color="#5a0a1a"/>
    </radialGradient>
    <linearGradient id="e-waxRim" gradientUnits="userSpaceOnUse" x1="-30" y1="-30" x2="30" y2="30">
      <stop offset="0" stop-color="#ff9fb0" stop-opacity="0.85"/><stop offset="0.45" stop-color="#c72a46" stop-opacity="0.15"/>
      <stop offset="0.6" stop-color="#4a0614" stop-opacity="0.25"/><stop offset="1" stop-color="#2a0309" stop-opacity="0.85"/>
    </linearGradient>
    <radialGradient id="e-waxField" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7d1127" stop-opacity="0.55"/><stop offset="1" stop-color="#9c1a33" stop-opacity="0.15"/>
    </radialGradient>
    <linearGradient id="e-heart" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d6354f"/><stop offset="1" stop-color="#88142b"/>
    </linearGradient>
    <filter id="e-blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="e-blur1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.9"/></filter>
  </defs>
</svg>`;
}

/* ---------- لایه‌ها ---------- */
const HEART = "M0 13 C-21 0 -14 -18 0 -7 C14 -18 21 0 0 13Z";

function sealSVG() {
  const flange = blobPath(52, 3.2, 26, 5);
  const body = blobPath(47.5, 2.4, 24, 11);
  const crack = CRACK.map(([x, y]) => `${x},${y}`).join(" ");
  return `
<svg viewBox="-60 -60 120 120" aria-hidden="true">
  <path d="${flange}" fill="url(#e-waxFlange)"/>
  <path d="${body}" fill="url(#e-waxBody)"/>
  <path d="${body}" fill="url(#e-grain)" opacity="0.9"/>
  <!-- حلقه‌ی برجسته -->
  <circle r="36.5" fill="url(#e-waxField)"/>
  <circle r="36.5" fill="none" stroke="url(#e-waxRim)" stroke-width="3.4"/>
  <circle r="30.5" fill="none" stroke="#4e0716" stroke-opacity="0.45" stroke-width="1.1" stroke-dasharray="0.8 3.1" stroke-linecap="round"/>
  <!-- قلب برجسته -->
  <g transform="translate(0 1.5)">
    <path d="${HEART}" transform="translate(1.3 1.6)" fill="#2e040d" opacity="0.8"/>
    <path d="${HEART}" transform="translate(-1 -1.1)" fill="#ff9bad" opacity="0.6"/>
    <path d="${HEART}" fill="url(#e-heart)"/>
    <path d="M-9 -7.5 C-13 -7 -15 -3 -13.5 0.5" fill="none" stroke="#ffd0d8" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round" filter="url(#e-blur1)"/>
  </g>
  <!-- بازتاب نور -->
  <ellipse cx="-19" cy="-26" rx="17" ry="7.5" transform="rotate(-38 -19 -26)" fill="#fff" opacity="0.3" filter="url(#e-blur2)"/>
  <ellipse cx="22" cy="30" rx="12" ry="4" transform="rotate(-38 22 30)" fill="#ff8aa0" opacity="0.18" filter="url(#e-blur2)"/>
  <polyline class="crack" points="${crack}" fill="none" stroke="#2a030b" stroke-opacity="0.85" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;
}

function backSVG() {
  return `
<svg viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
  <rect width="600" height="400" fill="url(#e-liningBack)"/>
  <rect width="600" height="400" fill="url(#e-stars)" opacity="0.7"/>
  <rect width="600" height="400" fill="url(#e-grain)" opacity="0.35"/>
  <rect width="600" height="70" fill="url(#e-hingeShade)"/>
</svg>`;
}

function frontSVG(address) {
  return `
<svg viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 0 L300 220 L0 400Z" fill="url(#e-gL)"/>
  <path d="M600 0 L300 220 L600 400Z" fill="url(#e-gR)"/>
  <path d="M0 400 L300 220 L600 400Z" fill="url(#e-gB)"/>
  <path d="M0 0 L300 220 L0 400Z" fill="url(#e-shadeL)"/>
  <path d="M600 0 L300 220 L600 400Z" fill="url(#e-shadeL)"/>
  <path d="M0 0 L300 220 L0 400Z M600 0 L300 220 L600 400Z M0 400 L300 220 L600 400Z" fill="url(#e-grain)"/>

  <!-- چین‌های تا -->
  <g fill="none" stroke-linecap="round">
    <path d="M0 400 L300 220 L600 400" stroke="#fff" stroke-opacity="0.65" stroke-width="1.4" transform="translate(0 -1)"/>
    <path d="M0 400 L300 220 L600 400" stroke="#5b4a32" stroke-opacity="0.28" stroke-width="1.1"/>
    <path d="M0 0 L300 220 L600 0" stroke="#5b4a32" stroke-opacity="0.32" stroke-width="1.2"/>
    <path d="M0 0 L300 220 L600 0" stroke="#fff" stroke-opacity="0.5" stroke-width="1" transform="translate(0 1.6)"/>
  </g>

  <!-- آدرس دست‌نویس -->
  <text x="300" y="356" text-anchor="middle" direction="rtl" font-family="ArefRuqaa, serif" font-size="42" font-weight="700"
        fill="#3b2a55" fill-opacity="0.86" transform="rotate(-2 300 356)">${address}</text>

  <!-- تمبر و مهر پست -->
  <g transform="translate(518 96) rotate(4)">
    <rect x="-3" y="-3" width="58" height="70" fill="#f6efdf" stroke="#c9bca3" stroke-width="0.8"/>
    <rect x="-3" y="-3" width="58" height="70" fill="none" stroke="#f6efdf" stroke-width="4" stroke-dasharray="4 3"/>
    <rect x="4" y="4" width="44" height="56" fill="#2a1858"/>
    <circle cx="26" cy="31" r="13" fill="#e9dcff"/>
    <circle cx="31" cy="27" r="12" fill="#2a1858"/>
    <path d="M14 14 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" fill="#e9dcff"/>
    <rect x="4" y="4" width="44" height="56" fill="url(#e-grain)"/>
  </g>
  <g fill="none" stroke="#3b2a55" stroke-opacity="0.42" stroke-width="1.6" transform="translate(500 138) rotate(-8)">
    <circle r="22"/><circle r="17" stroke-width="1"/>
    <path d="M-48 -8 q6 -6 12 0 t12 0 t12 0 t12 0" /><path d="M-48 2 q6 -6 12 0 t12 0 t12 0 t12 0"/><path d="M-48 12 q6 -6 12 0 t12 0 t12 0 t12 0"/>
  </g>
</svg>`;
}

function flapOutSVG() {
  return `
<svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 0 H600 L300 220Z" fill="url(#e-flapOut)" stroke-linejoin="round"/>
  <path d="M0 0 H600 L300 220Z" fill="url(#e-flapEdge)"/>
  <path d="M0 0 H600 L300 220Z" fill="url(#e-grain)"/>
  <path d="M0 0 L300 220 L600 0" fill="none" stroke="#5b4a32" stroke-opacity="0.32" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M6 1.5 H594" stroke="#fff" stroke-opacity="0.5" stroke-width="1.2"/>
  <path d="M2 2 L300 214 L598 2" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;
}

function flapInSVG() {
  return `
<svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 0 H600 L300 220Z" fill="url(#e-lining)"/>
  <path d="M0 0 H600 L300 220Z" fill="url(#e-stars)" opacity="0.75"/>
  <path d="M0 0 H600 L300 220Z" fill="url(#e-grain)" opacity="0.5"/>
  <path d="M0 0 H600 L300 220Z" fill="url(#e-flapEdge)" opacity="0.9"/>
  <path d="M0 0 L300 220 L600 0" fill="none" stroke="#c8b0ff" stroke-opacity="0.35" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;
}

/* =========================================================
   کلاس صحنه
   ========================================================= */
export class EnvelopeStage {
  constructor(root, { sfx }) {
    this.root = root;
    this.sfx = sfx;
    this.C = CONFIG.envelope;
    this.O = CONFIG.opening;
    this.crumbs = [];
    this.tiltMul = 1;
    this.floatMul = 1;
    this._tx = 0;
    this._ty = 0;
    this.opened = false;
    this._tick = this._tick.bind(this);
    this._crumbTick = this._crumbTick.bind(this);
    this._build();
  }

  /* ---------- ساخت DOM ---------- */
  _build() {
    const grain = makeGrainDataURL();
    this.root.style.setProperty("--grain", `url(${grain})`);
    const C = this.C;
    const letterBody = C.letterBody
      .split("\n")
      .map((l) => `<span style="display:block">${l}</span>`)
      .join("");

    this.root.innerHTML = `
      ${defsSVG(grain)}
      <div class="stage-light"></div>
      <canvas class="dust"></canvas>
      <div class="stage-vignette"></div>

      <div class="env-wrap">
        <div class="env-move">
          <div class="env-tilt">
            <div class="envelope">
              <div class="env-halo"></div>
              <div class="env-layer env-back">${backSVG()}</div>
              <div class="env-glow"></div>

              <div class="letter">
                <div class="letter-paper">
                  <div class="letter-title">${C.letterTitle}</div>
                  <div class="letter-body">${letterBody}</div>
                  <div class="letter-sign">${C.letterSign}</div>
                </div>
              </div>

              <div class="env-layer env-front">${frontSVG(C.address)}</div>

              <div class="seal seal-low"><div class="seal-cast"></div><div class="seal-body"><div class="half" style="position:absolute;inset:0;clip-path:${CLIP_BOTTOM}">${sealSVG()}</div></div></div>

              <div class="flap">
                <div class="flap-face flap-in">${flapInSVG()}</div>
                <div class="flap-face flap-out">${flapOutSVG()}</div>
                <div class="flap-shade"></div>
                <div class="seal seal-up"><div class="seal-body"><div class="half" style="position:absolute;inset:0;clip-path:${CLIP_TOP}">${sealSVG()}</div></div></div>
              </div>

              <div class="seal-glow"></div>
              <div class="crumbs"></div>
              <button class="seal-hit" type="button" aria-label="${C.hint}"></button>
            </div>
          </div>
        </div>
        <p class="hint">${C.hint}</p>
      </div>`;

    const q = (s) => this.root.querySelector(s);
    this.el = {
      wrap: q(".env-wrap"),
      move: q(".env-move"),
      tilt: q(".env-tilt"),
      env: q(".envelope"),
      halo: q(".env-halo"),
      glow: q(".env-glow"),
      back: q(".env-back"),
      front: q(".env-front"),
      letter: q(".letter"),
      flap: q(".flap"),
      flapShade: q(".flap-shade"),
      flapFaces: this.root.querySelectorAll(".flap-face"),
      sealLow: q(".seal-low"),
      sealUp: q(".seal-up"),
      sealLowBody: q(".seal-low .seal-body"),
      sealUpBody: q(".seal-up .seal-body"),
      sealGlow: q(".seal-glow"),
      sealCast: q(".seal-cast"),
      crumbs: q(".crumbs"),
      hit: q(".seal-hit"),
      hint: q(".hint"),
      canvas: q("canvas.dust"),
    };

    this.dust = new Dust(this.el.canvas, { count: 70, mode: "motes", color: [215, 195, 255] });

    const g = gsap();
    g.set(this.el.flap, { z: 3 });
    g.set(this.el.letter, { z: 1 });
  }

  /* ---------- نمایش اولیه ---------- */
  show() {
    const g = gsap();
    const el = this.el;
    this.root.hidden = false;
    this.dust.resize();
    this.dust.start();
    g.ticker.add(this._tick);

    g.set(el.move, { y: 46, scale: 0.96, opacity: 0 });
    g.set(el.hint, { opacity: 0 });
    g.set(el.sealGlow, { opacity: 0 });

    g.timeline()
      .to(this.root, { opacity: 1, duration: 1.4, ease: "sine.inOut" }, 0)
      .to(el.move, { y: 0, scale: 1, opacity: 1, duration: 2.0, ease: "power3.out" }, 0.2)
      .to(el.hint, { opacity: 1, duration: 1.2, ease: "sine.inOut" }, 1.6)
      .to(el.sealGlow, { opacity: 0.55, duration: 1.2, ease: "sine.inOut" }, 1.6)
      .call(() => this._idle(), null, 1.8);
  }

  _idle() {
    if (this.opened) return;
    const g = gsap();
    this._idleTweens = [
      g.to(this.el.sealGlow, { opacity: 0.95, scale: 1.18, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" }),
      g.to(this.el.hint, { opacity: 0.6, duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut" }),
    ];
  }

  /* شناوری ملایم + کج شدن با اشاره‌گر */
  _tick(time) {
    const el = this.el.tilt;
    this._tx += (pointer.nx - this._tx) * 0.06;
    this._ty += (pointer.ny - this._ty) * 0.06;
    const k = this.tiltMul;
    const f = this.floatMul;
    const y = Math.sin(time * 1.15) * 5 * f;
    const rz = Math.sin(time * 0.7) * 0.5 * f;
    const ry = this._tx * 9 * k + Math.sin(time * 0.5) * 1.2 * f;
    const rx = -this._ty * 6 * k + Math.cos(time * 0.6) * 0.9 * f;
    el.style.transform = `translate3d(0,${y.toFixed(2)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
  }

  /* ---------- منتظر لمس مهر ---------- */
  waitForOpen(onGesture) {
    const hit = this.el.hit;
    const g = gsap();
    return new Promise((resolve) => {
      const press = () => g.to([this.el.sealLowBody, this.el.sealUpBody], { scale: 0.95, duration: 0.12, ease: "power2.out" });
      const release = () => g.to([this.el.sealLowBody, this.el.sealUpBody], { scale: 1, duration: 0.25, ease: "power2.out" });
      hit.addEventListener("pointerdown", press);
      hit.addEventListener("pointerup", release);
      hit.addEventListener("pointerleave", release);
      hit.addEventListener("mouseenter", () => !this.opened && g.to(this.el.sealGlow, { scale: 1.3, duration: 0.3, overwrite: "auto" }));
      hit.addEventListener(
        "click",
        () => {
          if (this.opened) return;
          this.opened = true;
          try { onGesture?.(); } catch (_) { /* ignore */ }
          this._idleTweens?.forEach((t) => t.kill());
          resolve();
        },
        { once: true },
      );
    });
  }

  /* ---------- شکستن مهر ---------- */
  _breakSeal() {
    const g = gsap();
    const el = this.el;
    el.sealLow.classList.add("broken");
    el.sealUp.classList.add("broken");
    el.hit.style.pointerEvents = "none";

    g.killTweensOf([el.sealLowBody, el.sealUpBody, el.sealGlow]);
    g.set([el.sealLowBody, el.sealUpBody], { scale: 1 });
    g.to(el.sealGlow, { opacity: 0, duration: 0.3 });
    g.to(el.sealCast, { opacity: 0, duration: 0.2 });

    g.fromTo(el.sealLowBody, { y: 0, rotation: 0 }, { y: 2.5, x: 0.8, rotation: 1.6, duration: 0.4, ease: "power3.out" });
    g.fromTo(el.sealUpBody, { y: 0, rotation: 0 }, { y: -2, x: -0.8, rotation: -2.4, duration: 0.35, ease: "power3.out" });

    /* لرزش ریز پاکت */
    g.timeline()
      .to(el.move, { x: 2.2, rotation: 0.25, duration: 0.04 })
      .to(el.move, { x: -2, rotation: -0.2, duration: 0.05 })
      .to(el.move, { x: 1, rotation: 0.1, duration: 0.06 })
      .to(el.move, { x: 0, rotation: 0, duration: 0.14, ease: "power2.out" });

    this._spawnCrumbs();
  }

  _spawnCrumbs() {
    const ew = this.el.wrap.offsetWidth;
    const n = 13;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "crumb";
      const s = ew * (0.007 + Math.random() * 0.012);
      const r = () => 30 + Math.random() * 40;
      d.style.width = d.style.height = `${s.toFixed(1)}px`;
      d.style.borderRadius = `${r()}% ${r()}% ${r()}% ${r()}%`;
      const px = (Math.random() - 0.5) * ew * 0.17;
      this.el.crumbs.appendChild(d);
      this.crumbs.push({
        d,
        x: px,
        y: (Math.random() - 0.5) * ew * 0.01,
        vx: (Math.random() - 0.5) * ew * 0.28 + px * 1.4,
        vy: -ew * (0.1 + Math.random() * 0.34),
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 900,
        life: 0,
      });
    }
    gsap().ticker.add(this._crumbTick);
  }

  _crumbTick() {
    const dt = Math.min(0.05, gsap().ticker.deltaRatio() / 60);
    const g = this.el.wrap.offsetWidth * 2.6;
    const H = this.el.wrap.offsetHeight;
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const c = this.crumbs[i];
      c.life += dt;
      c.vy += g * dt;
      c.vx *= 1 - dt * 0.6;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      c.d.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0) rotate(${c.rot.toFixed(0)}deg)`;
      if (c.life > 0.9) c.d.style.opacity = Math.max(0, 1 - (c.life - 0.9) / 0.5).toFixed(2);
      if (c.life > 1.4 || c.y > H * 1.4) {
        c.d.remove();
        this.crumbs.splice(i, 1);
      }
    }
    if (!this.crumbs.length) gsap().ticker.remove(this._crumbTick);
  }

  /* ---------- باز شدن پاکت و بیرون آمدن نامه ---------- */
  play({ onDissolve } = {}) {
    const g = gsap();
    const el = this.el;
    const O = this.O;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const H = el.wrap.offsetHeight;
    const W = el.wrap.offsetWidth;

    return new Promise((resolve) => {
      const tl = g.timeline({ onComplete: () => { this._end(); resolve(); } });
      if (reduce) tl.timeScale(1.8);

      /* مهر می‌شکند */
      tl.call(() => this._breakSeal(), null, 0.02);
      tl.to(el.hint, { opacity: 0, duration: 0.3 }, 0);

      /* کل پاکت کمی پایین می‌آید تا درپوشِ باز شده در صفحه جا شود */
      tl.to(el.move, { y: H * 0.33, duration: O.flapDuration + 0.8, ease: "power2.inOut" }, O.flapStart - 0.1);

      /* درپوش: اول لبه‌اش کمی بلند می‌شود (کنده شدن از چسب)، بعد می‌چرخد */
      const S = O.flapStart;
      tl.call(() => this.sfx?.rustle(1.0, 0.16, 4200), null, S);
      tl.to(el.flap, { rotationX: 15, duration: 0.3, ease: "power2.out" }, S)
        .to(el.flap, { rotationX: 180, duration: O.flapDuration, ease: "power2.inOut" }, S + 0.3)
        .to(el.flap, { z: 0.5, duration: 0.15, ease: "none" }, S + 0.3 + O.flapDuration * 0.52);
      /* سایه‌ی درپوش: تیره‌تر نزدیک عمودی شدن، روشن‌تر وقتی خوابید */
      tl.to(el.flapShade, { opacity: 0.4, duration: O.flapDuration * 0.5, ease: "sine.in" }, S + 0.3)
        .to(el.flapShade, { opacity: 0, duration: O.flapDuration * 0.5, ease: "sine.out" }, S + 0.3 + O.flapDuration * 0.5);

      /* نور گرم از دهانه */
      tl.to(el.glow, { opacity: 0.9, duration: 1.0, ease: "sine.inOut" }, S + 0.5);

      /* نامه بیرون می‌آید */
      const LR = O.letterRiseStart;
      tl.call(() => this.sfx?.slide(O.letterRiseDuration), null, LR);
      tl.to(el.letter, { y: -H * 0.9, duration: O.letterRiseDuration, ease: "power1.inOut" }, LR)
        .to(el.letter, { rotation: -1.8, duration: O.letterRiseDuration * 0.5, ease: "sine.inOut" }, LR)
        .to(el.letter, { rotation: 0.6, duration: O.letterRiseDuration * 0.5, ease: "sine.inOut" }, LR + O.letterRiseDuration * 0.5);

      /* نامه جلو می‌آید و بزرگ می‌شود */
      const LF = O.letterFlyStart;
      tl.call(() => {
        g.set(el.letter, { z: 8 });
        const r = el.letter.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const targetW = Math.min(window.innerWidth * 0.88, 560);
        const scale = Math.max(1, Math.min(2.2, targetW / el.letter.offsetWidth));
        const maxH = window.innerHeight * 0.86;
        const s = Math.min(scale, maxH / el.letter.offsetHeight);
        const dx = window.innerWidth / 2 - cx;
        const dy = window.innerHeight / 2 - cy;
        g.to(el.letter, {
          x: `+=${dx}`,
          y: `+=${dy}`,
          scale: s,
          rotation: 0,
          duration: O.letterFlyDuration,
          ease: "power3.inOut",
        });
        g.to(this, { tiltMul: 0, floatMul: 0, duration: 1.0 });
        g.to([el.back, el.front, el.sealLow, el.halo, el.glow, ...el.flapFaces], {
          opacity: 0,
          duration: O.letterFlyDuration * 0.8,
          ease: "sine.inOut",
        });
        g.to(this.root.querySelector(".stage-light"), { opacity: 0.35, duration: 1.2 });
      }, null, LF);

      /* خواندن نامه */
      const D = LF + O.letterFlyDuration + O.readHold;
      tl.call(() => { this.sfx?.chime(); onDissolve?.(); }, null, D);
      tl.to(el.letter, { opacity: 0, scale: "+=0.14", filter: "blur(10px)", duration: O.dissolve * 0.75, ease: "power2.in" }, D)
        .to(this.root, { opacity: 0, duration: O.dissolve, ease: "sine.inOut" }, D + 0.25);
    });
  }

  _end() {
    const g = gsap();
    g.ticker.remove(this._tick);
    this.dust.stop();
    this.root.hidden = true;
    this.root.innerHTML = "";
  }
}
