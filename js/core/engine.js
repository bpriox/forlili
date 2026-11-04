import * as THREE from "../vendor/three.module.min.js";
import { CONFIG } from "../config.js";
import { Quality } from "./quality.js";

/* یک renderer، یک صحنه، یک دوربین و یک حلقه‌ی رندر برای کل پروژه.
   هر «سیستم» (کهکشان، ماه، ترانه…) فقط update(dt, time) و resize(w, h) دارد. */
export class Engine {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    const r = this.renderer;
    r.setClearColor(0x000000, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.canvas = r.domElement;
    this.canvas.style.touchAction = "none";
    container.appendChild(this.canvas);

    /* اگر context گم شد، اجازه بده مرورگر بازیابی کند */
    this.canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    const c = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(
      c.fov,
      window.innerWidth / window.innerHeight,
      c.near,
      c.far,
    );
    this.camera.position.set(0, 0, 0);

    this.systems = [];
    this.time = 0;
    this._prev = 0;
    this._running = false;
    this.quality = new Quality(this);

    this._frame = this._frame.bind(this);

    let t = null;
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(t);
        t = setTimeout(() => this.resize(), 100);
      },
      { passive: true },
    );
    window.addEventListener(
      "orientationchange",
      () => setTimeout(() => this.resize(), 180),
      { passive: true },
    );

    this._applySize();
  }

  _applySize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get pixelRatio() {
    return this.renderer.getPixelRatio();
  }

  resize() {
    this._applySize();
    for (const s of this.systems) s.resize?.(this.width, this.height);
  }

  addSystem(system) {
    this.systems.push(system);
    system.resize?.(this.width, this.height);
    return system;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._prev = performance.now();
    requestAnimationFrame(this._frame);
  }

  _frame(now) {
    requestAnimationFrame(this._frame);

    const real = (now - this._prev) / 1000;
    this._prev = now;
    const dt = Math.min(real, 0.05);

    this.quality.update(real);
    this.time += dt;

    for (const s of this.systems) s.update?.(dt, this.time);
    this.renderer.render(this.scene, this.camera);
  }
}
