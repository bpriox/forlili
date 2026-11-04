import * as THREE from "./vendor/three.module.min.js";
import { CONFIG } from "./config.js";

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const DEG = Math.PI / 180;

/* =========================================================
   متن‌های ترانه روی سطح ماه
   - هر خط یک «تکه‌ی کروی» جداست که از روی سطح ماه برش خورده و
     با ماه می‌چرخد (فرزند mesh ماه است).
   - متن همیشه افقی است (خط پایه موازی افق صفحه). جای هر خط یکی از سه ردیف است: بالا، روبه‌رو، پایین.
   - زمان‌بندی فقط از music.currentTime می‌آید.
   ========================================================= */

/* ---------- ساخت تکسچر متن (Canvas) ----------
   مرورگر خودش حروف فارسی را به هم می‌چسباند و راست‌به‌چپ می‌نویسد. */
function renderLineTexture(text, { emDeg, maxWidthDeg }) {
  const L = CONFIG.lyrics;
  const fontPx = L.fontPx;
  const font = `${fontPx}px ${L.fontFamily}, sans-serif`;
  const pad = Math.round(fontPx * 0.6);
  const lineH = Math.round(fontPx * L.lineHeight);

  const probe = document.createElement("canvas").getContext("2d");
  probe.font = font;
  const widthOf = (s) => probe.measureText(s).width;
  const pxToDeg = emDeg / fontPx;

  let lines = [text];
  let maxW = widthOf(text);

  /* خط بلند → دو خط متعادل (بر اساس کلمه) */
  if (maxW * pxToDeg > maxWidthDeg) {
    const words = text.split(/\s+/).filter(Boolean);
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(" ");
      const b = words.slice(k).join(" ");
      const w = Math.max(widthOf(a), widthOf(b));
      if (!best || w < best.w) best = { lines: [a, b], w };
    }
    if (best) {
      lines = best.lines;
      maxW = best.w;
    }
  }

  /* هنوز پهن است → کوچک‌تر کن */
  let scale = 1;
  if (maxW * pxToDeg > maxWidthDeg) scale = maxWidthDeg / (maxW * pxToDeg);

  const W = Math.ceil(maxW + pad * 2);
  const H = Math.ceil(lines.length * lineH + pad * 2);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line, i) => {
    const x = W / 2;
    const y = pad + lineH * (i + 0.5);
    ctx.shadowColor = L.glow;
    ctx.shadowBlur = fontPx * 0.32;
    ctx.fillStyle = L.color;
    ctx.fillText(line, x, y);
    ctx.shadowBlur = 0;
    ctx.fillText(line, x, y); // یک بار دیگر بدون سایه برای وضوح
  });

  return {
    canvas,
    lineCount: lines.length,
    widthDeg: W * pxToDeg * scale,
    heightDeg: H * pxToDeg * scale,
  };
}

/* ---------- هندسه‌ی تکه‌ی کروی ----------
   frame = { x, y, z } در مختصات محلی ماه (راست، بالا، سمت دوربین).
   هر نقطه با عرض جغرافیایی φ و طول جغرافیایی α روی کره می‌نشیند، پس
   خط پایه‌ی متن موازی افق صفحه است (کج نمی‌شود) و روی انحنای ماه می‌ماند.
   latRad = عرض مرکز تکه (ردیف بالا مثبت، پایین منفی). */
export function buildPatchGeometry(radius, frame, latRad, widthDeg, heightDeg) {
  const segX = Math.min(48, Math.max(8, Math.ceil(widthDeg / 2.5)));
  const segY = Math.min(24, Math.max(4, Math.ceil(heightDeg / 2.5)));

  const positions = new Float32Array((segX + 1) * (segY + 1) * 3);
  const uvs = new Float32Array((segX + 1) * (segY + 1) * 2);
  const indices = [];
  const { x, y, z } = frame;

  /* روی مدار عرض φ، هر درجه‌ی طول کوتاه‌تر است؛ برای حفظ نسبت حروف جبران می‌کنیم */
  const lonSpan = (widthDeg * DEG) / Math.max(0.35, Math.cos(latRad));

  let p = 0;
  let t = 0;
  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    const phi = latRad + (v - 0.5) * heightDeg * DEG;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const alpha = (u - 0.5) * lonSpan;
      const ca = Math.cos(alpha) * cp;
      const sa = Math.sin(alpha) * cp;

      positions[p++] = (x.x * sa + y.x * sp + z.x * ca) * radius;
      positions[p++] = (x.y * sa + y.y * sp + z.y * ca) * radius;
      positions[p++] = (x.z * sa + y.z * sp + z.z * ca) * radius;
      uvs[t++] = u;
      uvs[t++] = v;
    }
  }

  const row = segX + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export class Lyrics {
  constructor({ engine, moon, music, doc, demo = false }) {
    this.engine = engine;
    this.moon = moon;
    this.music = music;
    this.L = CONFIG.lyrics;

    let cues = (doc.cues || []).map((c) => ({ ...c }));
    if (demo) {
      /* حالت آزمایشی (?demo): خط‌ها را هر ۵ ثانیه پشت‌سرهم نشان بده */
      cues.forEach((c, i) => (c.start = 2 + i * 5));
    }
    cues = cues
      .filter((c) => Number.isFinite(c.start) && c.text)
      .sort((a, b) => a.start - b.start);

    cues.forEach((c, i) => {
      const next = cues[i + 1];
      c.outStart = Number.isFinite(c.end)
        ? c.end
        : next
          ? Math.min(next.start + this.L.lingerAfterNext, c.start + this.L.maxHold)
          : c.start + this.L.lastHold;
    });

    this.cues = cues;
    this.active = new Map(); // id → { mesh, row }
    this.lastRow = -1;
    this.maxAniso = engine.renderer.capabilities.getMaxAnisotropy();
  }

  /* ردیف‌ها: ۰ بالا، ۱ روبه‌رو، ۲ پایین */
  _pickRow() {
    const used = new Set([...this.active.values()].map((a) => a.row));
    let free = [0, 1, 2].filter((r) => !used.has(r));
    if (!free.length) free = [0, 1, 2];
    const notLast = free.filter((r) => r !== this.lastRow);
    if (notLast.length) free = notLast;
    return free[Math.floor(Math.random() * free.length)];
  }

  _create(cue) {
    const L = this.L;
    const portrait = window.innerHeight > window.innerWidth;
    const emDeg = portrait ? L.emDeg.portrait : L.emDeg.desktop;

    const row = this._pickRow();
    this.lastRow = row;
    const rowRad = (1 - row) * L.rowOffsetDeg * DEG; // ۰→بالا، ۱→میانه، ۲→پایین

    const tex = renderLineTexture(cue.text, { emDeg, maxWidthDeg: L.maxWidthDeg });
    const frame = this.moon.getFacingFrame();
    const geo = buildPatchGeometry(
      this.moon.radius + L.surfaceOffset,
      frame,
      rowRad,
      tex.widthDeg,
      tex.heightDeg,
    );

    const map = new THREE.CanvasTexture(tex.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, this.maxAniso);

    const mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    this.moon.mesh.add(mesh);
    this.active.set(cue.id, { mesh, row });
  }

  _remove(id) {
    const a = this.active.get(id);
    if (!a) return;
    a.mesh.removeFromParent();
    a.mesh.geometry.dispose();
    a.mesh.material.map.dispose();
    a.mesh.material.dispose();
    this.active.delete(id);
  }

  update() {
    const L = this.L;
    const t = this.music.currentTime;

    for (const cue of this.cues) {
      const inWindow = t >= cue.start && t <= cue.outStart + L.fadeOut;
      if (!inWindow) {
        if (this.active.has(cue.id)) this._remove(cue.id);
        continue;
      }
      if (!this.active.has(cue.id)) this._create(cue);

      const fadeIn = smooth((t - cue.start) / L.fadeIn);
      const fadeOut = smooth((t - cue.outStart) / L.fadeOut);
      this.active.get(cue.id).mesh.material.opacity =
        fadeIn * (1 - fadeOut) * this.moon.opacity;
    }
  }
}
