/* ذرات ریز شناور (غبار در پرتو نور / جرقه‌های طلایی) روی Canvas دوبعدی.
   فقط وقتی start() شده باشد رسم می‌کند و با stop() کاملاً می‌ایستد. */
export class Dust {
  /* mode: "motes" = غبار آرام در پرتو نور، "embers" = ذرات طلایی که بالا می‌روند */
  constructor(canvas, { count = 60, mode = "motes", color = [220, 200, 255] } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mode = mode;
    this.color = color;
    this.count = count;
    this.parts = [];
    this.alpha = 1;
    this.running = false;
    this._t = 0;
    this._last = 0;
    this._raf = this._raf.bind(this);
    this.resize();
    window.addEventListener("resize", () => this.resize(), { passive: true });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.parts.length) for (let i = 0; i < this.count; i++) this.parts.push(this._make(true));
  }

  _make(initial) {
    const r = Math.random;
    const embers = this.mode === "embers";
    return {
      x: r() * this.w,
      y: initial ? r() * this.h : embers ? this.h + 10 : r() * this.h,
      z: 0.3 + r() * 0.7, // عمق: دورتر = کوچک‌تر و کم‌نورتر
      vx: (r() - 0.5) * (embers ? 14 : 6),
      vy: embers ? -(10 + r() * 26) : (r() - 0.5) * 5 + 1.5,
      ph: r() * Math.PI * 2,
      sp: 0.4 + r() * 0.9,
      tw: 0.5 + r() * 1.5,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._raf);
  }
  stop() {
    this.running = false;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  _raf(now) {
    if (!this.running) return;
    requestAnimationFrame(this._raf);
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this._t += dt;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";
    const [cr, cg, cb] = this.color;
    const embers = this.mode === "embers";
    const cx = this.w / 2;

    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      p.x += (p.vx + Math.sin(this._t * p.sp + p.ph) * 6) * dt * p.z;
      p.y += p.vy * dt * p.z;
      if (p.y < -12 || p.y > this.h + 14 || p.x < -12 || p.x > this.w + 12) {
        this.parts[i] = this._make(false);
        if (!embers) this.parts[i].y = -8;
        continue;
      }
      const flick = 0.55 + 0.45 * Math.sin(this._t * p.tw + p.ph * 2);
      let a = flick * p.z * 0.5 * this.alpha;
      if (!embers) {
        /* غبار فقط داخل پرتو نور درخشان‌تر است */
        const d = Math.abs(p.x - cx) / (this.w * 0.5);
        a *= 0.25 + 0.75 * Math.max(0, 1 - d * 1.2) * (1 - p.y / this.h * 0.7);
      }
      const rad = (embers ? 1.6 : 1.3) * (0.6 + p.z * 1.4);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 4);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${a * 0.35})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
}
