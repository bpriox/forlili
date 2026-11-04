import { CONFIG } from "./config.js";
import { Dust } from "./core/dust.js";

const HEART_SVG = `<svg viewBox="-24 -22 48 44" aria-hidden="true"><path d="M0 18 C-26 0 -17 -20 0 -8 C17 -20 26 0 0 18Z" fill="#ff6f8e"/></svg>`;

/* =========================================================
   پیام پایانی تولد: بعد از تمام شدن آهنگ، روی ماه ظاهر می‌شود.
   متن‌ها در config.js → finale
   ========================================================= */
export class Finale {
  constructor(root, { onReplay } = {}) {
    this.root = root;
    this.onReplay = onReplay;
    this.F = CONFIG.finale;
    this.shown = false;
    this._build();
  }

  _build() {
    const F = this.F;
    const words = F.title
      .split(/\s+/)
      .map((w) => `<span class="w">${w}</span>`)
      .join(" ");
    const lines = F.lines.map((l) => `<p class="finale-line">${l}</p>`).join("");
    this.root.innerHTML = `
      <canvas class="embers"></canvas>
      <div class="finale-card">
        <h2 class="finale-title">${words}</h2>
        <div class="finale-lines">${lines}</div>
        <div class="finale-sign">${F.sign} ${HEART_SVG}</div>
        <div class="finale-actions"><button type="button" class="finale-btn">${F.replay}</button></div>
      </div>`;
    this.embers = new Dust(this.root.querySelector("canvas.embers"), {
      count: 46,
      mode: "embers",
      color: [255, 214, 150],
    });
    this.root.querySelector(".finale-btn").addEventListener("click", () => this.hide());
  }

  show() {
    if (this.shown) return;
    this.shown = true;
    const g = window.gsap;
    const r = this.root;
    r.hidden = false;
    r.classList.add("on");
    this.embers.resize();
    this.embers.alpha = 0;
    this.embers.start();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const words = r.querySelectorAll(".finale-title .w");
    const lines = r.querySelectorAll(".finale-line");
    const sign = r.querySelector(".finale-sign");
    const btn = r.querySelector(".finale-actions");

    g.set([words, lines, sign, btn], { opacity: 0, y: 14, filter: reduce ? "none" : "blur(10px)" });
    this._tl?.kill();
    this._tl = g
      .timeline()
      .to(r, { opacity: 1, duration: 2.2, ease: "sine.inOut" }, 0)
      .to(this.embers, { alpha: 1, duration: 4, ease: "sine.inOut" }, 0.5)
      .to(words, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.35, ease: "power2.out" }, 1.0);
    lines.forEach((l, i) => {
      this._tl.to(l, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power2.out" }, 3.2 + i * 1.7);
    });
    const t = 3.2 + lines.length * 1.7 + 0.2;
    this._tl
      .to(sign, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power2.out" }, t)
      .to(btn, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, t + 1.2);
  }

  hide() {
    if (!this.shown) return;
    this.shown = false;
    this._tl?.kill();
    const g = window.gsap;
    g.to(this.root, {
      opacity: 0,
      duration: 1.2,
      ease: "sine.inOut",
      onComplete: () => {
        this.root.classList.remove("on");
        this.root.hidden = true;
        this.embers.stop();
      },
    });
    this.onReplay?.();
  }
}
