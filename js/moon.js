import * as THREE from "./vendor/three.module.min.js";
import { CONFIG } from "./config.js";
import { IS_MOBILE } from "./core/env.js";
import { createProceduralMoonTextures } from "./textures/proceduralMoon.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const _qY = new THREE.Quaternion();
const _qX = new THREE.Quaternion();
const _qAuto = new THREE.Quaternion();
const _inv = new THREE.Matrix4();

/* =========================================================
   ماه سه‌بعدی: نورپردازی، تکسچر، چرخش خودکار و چرخاندن با ماوس/لمس
   (منتقل‌شده از پروتوتایپ moon-3D.html)
   ماه داخل یک rig قرار دارد که جلوی دوربین ثابت است.
   ========================================================= */
export class Moon {
  constructor(engine, { texture = null } = {}) {
    this.engine = engine;
    const cfg = (this.cfg = CONFIG.moon);
    this.radius = cfg.radius;
    this._opacity = 0;
    this.interactive = false;

    this.rig = new THREE.Group();
    this.rig.visible = false;

    /* نور اصلی از یک سمت */
    const sun = new THREE.DirectionalLight(cfg.sun.color, cfg.sun.intensity);
    sun.position.set(...cfg.sun.position);
    sun.target.position.set(0, 0, 0);
    this.rig.add(sun, sun.target);

    /* نور محیطی فقط اگر خواسته شده باشد؛ پیش‌فرض صفر تا نیمه‌ی تاریک سیاه بماند */
    if (cfg.darkSideFill > 0) {
      this.rig.add(new THREE.AmbientLight(0xffffff, cfg.darkSideFill));
    }

    const seg = IS_MOBILE ? "mobile" : "desktop";
    const geometry = new THREE.SphereGeometry(
      cfg.radius,
      cfg.widthSegments[seg],
      cfg.heightSegments[seg],
    );

    this.material = new THREE.MeshStandardMaterial({
      color: 0x8a8782,
      roughness: 1.0,
      metalness: 0.0,
      bumpScale: 0.012,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 1;
    this.mesh.quaternion.setFromAxisAngle(Y_AXIS, cfg.initialYaw);

    const tilt = new THREE.Group();
    tilt.rotation.z = THREE.MathUtils.degToRad(cfg.axialTiltDeg);
    tilt.add(this.mesh);
    this.rig.add(tilt);
    engine.scene.add(this.rig);

    this._applyTexture(texture);
    this._initInteraction();
  }

  /* ---------- ظاهر شدن تدریجی ---------- */
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    this._opacity = v;
    this.rig.visible = v > 0.001;
    const m = this.material;
    m.opacity = v;
    const transparent = v < 0.999;
    if (m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
  }

  /* ---------- تکسچر ---------- */
  _applyTexture(tex) {
    const maxAniso = this.engine.renderer.capabilities.getMaxAnisotropy();
    const m = this.material;

    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = Math.min(16, maxAniso);
      m.map = tex;
      m.bumpMap = tex;
      m.bumpScale = 0.009;
    } else {
      /* فایل تکسچر بارگذاری نشد → تکسچر رویه‌ای */
      const { colorCanvas, bumpCanvas } = createProceduralMoonTextures();
      const colorTex = new THREE.CanvasTexture(colorCanvas);
      colorTex.colorSpace = THREE.SRGBColorSpace;
      const bumpTex = new THREE.CanvasTexture(bumpCanvas);
      for (const t of [colorTex, bumpTex]) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.anisotropy = Math.min(8, maxAniso);
      }
      m.map = colorTex;
      m.bumpMap = bumpTex;
      m.bumpScale = 0.02;
    }
    m.color.set(0xffffff);
    m.needsUpdate = true;
  }

  /* ---------- جای ماه جلوی دوربین ---------- */
  resize() {
    const cam = this.engine.camera;
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const minFov = Math.min(vFov, hFov);
    const angularRadius = (minFov * this.cfg.fillRatio) / 2;
    const distance = this.radius / Math.sin(angularRadius);
    this.rig.position.set(0, 0, -distance);
  }

  /* ---------- چارچوب سطح ماه که الان روبه‌روی دوربین است ----------
     محورهای دنیا در مختصات محلی ماه: x = راست صفحه، y = بالای صفحه،
     z = جهت دوربین. چون این چارچوب محلی ماه است، هر چیزی که با آن
     ساخته شود (مثل تکه‌ی متن) با چرخش ماه حرکت می‌کند، ولی لحظه‌ی ساخت
     دقیقاً روبه‌روی دوربین و افقی است → متن بدون کجی. */
  getFacingFrame() {
    this.mesh.updateWorldMatrix(true, false);
    _inv.copy(this.mesh.matrixWorld).invert();
    return {
      x: new THREE.Vector3(1, 0, 0).transformDirection(_inv),
      y: new THREE.Vector3(0, 1, 0).transformDirection(_inv),
      z: new THREE.Vector3(0, 0, 1).transformDirection(_inv),
    };
  }

  /* ---------- تعامل ---------- */
  setInteractive(on) {
    this.interactive = on;
    if (!on) this._cancelPointer();
    this.engine.canvas.style.cursor = on ? "grab" : "default";
  }

  _cancelPointer() {
    this.pointerId = null;
    this.velX = 0;
    this.velY = 0;
  }

  _rotate(rotY, rotX) {
    if (rotY !== 0) {
      _qY.setFromAxisAngle(Y_AXIS, rotY);
      this.mesh.quaternion.premultiply(_qY);
    }
    if (rotX !== 0) {
      _qX.setFromAxisAngle(X_AXIS, rotX);
      this.mesh.quaternion.premultiply(_qX);
    }
  }

  _initInteraction() {
    const canvas = this.engine.canvas;
    const I = this.cfg.interaction;

    this.pointerId = null;
    this.velX = 0;
    this.velY = 0;
    this.autoResume = 0;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    canvas.addEventListener("pointerdown", (e) => {
      if (!this.interactive || this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      this.velX = 0;
      this.velY = 0;
      this.autoResume = this.cfg.autoResumeDelay;
      canvas.style.cursor = "grabbing";
    });

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.pointerId) return;
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const k = I.rotPerScreen / Math.min(window.innerWidth, window.innerHeight);
      const rotY = dx * k;
      const rotX = dy * k;
      this._rotate(rotY, rotX);

      this.velX = clamp(rotY / dt, -I.maxVelocity, I.maxVelocity);
      this.velY = clamp(rotX / dt, -I.maxVelocity, I.maxVelocity);
      this.autoResume = this.cfg.autoResumeDelay;
    });

    const end = (e) => {
      if (e.pointerId !== this.pointerId) return;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this.pointerId = null;
      if (this.interactive) canvas.style.cursor = "grab";
      this.autoResume = this.cfg.autoResumeDelay;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("lostpointercapture", (e) => {
      if (e.pointerId === this.pointerId) {
        this.pointerId = null;
        if (this.interactive) canvas.style.cursor = "grab";
      }
    });
  }

  /* ---------- سیستم ---------- */
  update(dt) {
    if (!this.rig.visible) return;
    const I = this.cfg.interaction;

    if (this.pointerId === null) {
      if (Math.abs(this.velX) > I.minVelocity || Math.abs(this.velY) > I.minVelocity) {
        this._rotate(this.velX * dt, this.velY * dt);
        const decay = Math.exp(-dt / I.inertiaDamping);
        this.velX *= decay;
        this.velY *= decay;
      } else {
        this.velX = 0;
        this.velY = 0;
      }
    }

    if (this.autoResume > 0) {
      this.autoResume = Math.max(0, this.autoResume - dt);
    } else if (this.pointerId === null) {
      _qAuto.setFromAxisAngle(Y_AXIS, this.cfg.autoRotationSpeed * dt);
      this.mesh.quaternion.multiply(_qAuto);
    }
  }
}
