import * as THREE from "./vendor/three.module.min.js";
import { CONFIG } from "./config.js";
import { IS_MOBILE } from "./core/env.js";
import { pointer } from "./core/input.js";

/* =========================================================
   پس‌زمینه‌ی کهکشانی: سحابی‌ها، ستاره‌ها و شهاب‌سنگ‌ها
   (منتقل‌شده از پروتوتایپ stars-back-ground.html)
   تفاوت‌ها: همه‌چیز داخل یک Group است، ظاهر شدن با uFade کنترل
   می‌شود، و دوربین ثابت می‌ماند و پارالاکس روی Group اعمال می‌شود
   تا ماه تحت تأثیر قرار نگیرد.
   ========================================================= */

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform float uScale;
  uniform vec2  uSeed;
  uniform float uOpacity;
  uniform float uFade;
  uniform vec3  uColA;
  uniform vec3  uColB;
  uniform vec3  uColC;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < OCTAVES; i++) {
      v += amp * vnoise(p);
      p = m * p * 2.03 + 7.31;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * uScale + uSeed;
    float t = uTime * 0.017;

    vec2 q;
    q.x = fbm(p + vec2(0.0, t * 0.85));
    q.y = fbm(p + vec2(4.7, 1.3) - t * 0.62);

    float f = fbm(p + 2.35 * q + vec2(1.7, 9.2) + vec2(t * 0.55, -t * 0.37));

    float d = smoothstep(0.32, 0.84, f);
    d = pow(d, 1.35);

    vec2 c = (vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.34, 1.15, length(c));
    edge = pow(max(edge, 0.0), 1.45);

    float core  = smoothstep(0.56, 0.96, f);
    float veins = smoothstep(0.42, 0.78, abs(q.x - q.y) * 1.55);

    vec3 col = mix(uColA, uColB, smoothstep(0.04, 0.78, d));
    col = mix(col, uColC, pow(core, 2.0) * 0.85);
    col += uColC * veins * 0.10;

    col *= d * edge * uOpacity * uFade;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const NEBULA_LAYERS = [
  { z: -1250, scale: 2.45, opacity: 0.6, seed: [13.7, 4.2], colA: 0x030008, colB: 0x150030, colC: 0x3d1668 },
  { z: -780, scale: 3.3, opacity: 0.52, seed: [41.2, 17.9], colA: 0x05000f, colB: 0x1e0742, colC: 0x5c2599 },
  { z: -400, scale: 4.1, opacity: 0.4, seed: [88.4, 61.3], colA: 0x04000c, colB: 0x24083f, colC: 0x7a2f8f },
];

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3  aColor;

  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(-mv.z, 1.0);

    float tw = 0.68 + 0.32 * sin(uTime * aSpeed + aPhase);
    tw *= 0.88 + 0.12 * sin(uTime * aSpeed * 2.37 + aPhase * 1.7);
    vAlpha = tw;

    vColor = aColor;

    float depthScale = clamp(900.0 / dist, 0.35, 2.2);
    gl_PointSize = aSize * uPixelRatio * depthScale;

    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  precision mediump float;

  uniform float uFade;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float r = length(c) * 2.0;
    if (r > 1.0) discard;

    float core = pow(1.0 - r, 2.2);
    float halo = pow(max(1.0 - r, 0.0), 0.6) * 0.16;
    float a = (core + halo) * vAlpha * uFade;

    gl_FragColor = vec4(vColor, a);
  }
`;

const TRAIL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TRAIL_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3  uColor;
  uniform float uOpacity;

  void main() {
    float along  = pow(clamp(1.0 - vUv.x, 0.0, 1.0), 2.6);
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    across = pow(clamp(across, 0.0, 1.0), 1.7);

    float a = along * across * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`;

/* رنگ‌های shader همان مقادیر خام پروتوتایپ (r128) هستند، نه تبدیل‌شده */
function rawColor(hex) {
  return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1.00)");
  g.addColorStop(0.14, "rgba(228,214,255,0.72)");
  g.addColorStop(0.38, "rgba(160,120,235,0.24)");
  g.addColorStop(1.0, "rgba(80,40,160,0.00)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Galaxy {
  constructor(engine) {
    this.engine = engine;
    this.cfg = CONFIG.galaxy;
    this.fade = { value: 0 }; // مشترک بین همه‌ی متریال‌ها
    this._opacity = 0;

    this.root = new THREE.Group();
    this.root.visible = false;
    engine.scene.add(this.root);

    this.nebulaMeshes = [];
    this._buildNebula();
    this._buildStars();
    this._buildShootingStars();

    this.camX = 0;
    this.camY = 0;
  }

  /* ---------- ظاهر شدن تدریجی ---------- */
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    this._opacity = v;
    this.fade.value = v;
    this.root.visible = v > 0.001;
  }

  /* ---------- سحابی ---------- */
  _buildNebula() {
    const octaves = IS_MOBILE ? this.cfg.nebulaOctaves.mobile : this.cfg.nebulaOctaves.desktop;
    const aspect = this.engine.camera.aspect;

    for (const cfg of NEBULA_LAYERS) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAspect: { value: aspect },
          uScale: { value: cfg.scale },
          uSeed: { value: new THREE.Vector2(cfg.seed[0], cfg.seed[1]) },
          uOpacity: { value: cfg.opacity },
          uFade: this.fade,
          uColA: { value: rawColor(cfg.colA) },
          uColB: { value: rawColor(cfg.colB) },
          uColC: { value: rawColor(cfg.colC) },
        },
        vertexShader: NEBULA_VERT,
        fragmentShader: NEBULA_FRAG,
        defines: { OCTAVES: octaves },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true, // پشت ماه پنهان شود
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.position.set(0, 0, cfg.z);
      mesh.frustumCulled = false;
      mesh.renderOrder = -10;
      this.root.add(mesh);
      this.nebulaMeshes.push(mesh);
    }
  }

  /* ---------- ستاره‌ها ---------- */
  _buildStars() {
    const cam = this.engine.camera;
    const count = IS_MOBILE ? this.cfg.starCount.mobile : this.cfg.starCount.desktop;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    const fovRad = (cam.fov * Math.PI) / 180;
    /* حداقل نسبت تصویر ۱٫۷۸ تا با چرخاندن گوشی هم کناره‌ها خالی نماند */
    const spreadAspect = Math.max(cam.aspect, 1.78);

    for (let i = 0; i < count; i++) {
      const z = -(25 + Math.pow(Math.random(), 1.7) * 2400);
      const dist = -z;
      const halfH = Math.tan(fovRad * 0.5) * dist;
      const halfW = halfH * spreadAspect * 1.3;

      positions[i * 3 + 0] = (Math.random() * 2 - 1) * halfW;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * halfH * 1.18;
      positions[i * 3 + 2] = z;

      const t = Math.random();
      let r, g, b;
      if (t < 0.58) { r = 1.0; g = 0.97; b = 0.99; }
      else if (t < 0.78) { r = 0.78; g = 0.86; b = 1.0; }
      else if (t < 0.92) { r = 1.0; g = 0.88; b = 0.76; }
      else { r = 0.84; g = 0.74; b = 1.0; }

      const bright = 0.45 + Math.random() * 0.55;
      colors[i * 3 + 0] = r * bright;
      colors[i * 3 + 1] = g * bright;
      colors[i * 3 + 2] = b * bright;

      sizes[i] = 0.55 + Math.pow(Math.random(), 2.4) * 2.0;
      phases[i] = Math.random() * Math.PI * 2.0;
      speeds[i] = 0.35 + Math.random() * 2.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

    this.starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.engine.pixelRatio },
        uFade: this.fade,
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    const points = new THREE.Points(geo, this.starMat);
    points.frustumCulled = false;
    this.root.add(points);
  }

  /* ---------- شهاب‌سنگ‌ها ---------- */
  _buildShootingStars() {
    const glow = makeGlowTexture();
    const galaxy = this;

    this.trailGeometry = new THREE.PlaneGeometry(1, 1);
    this.trailGeometry.translate(0.5, 0, 0);

    function ShootingStar() {
      this.group = new THREE.Group();
      this.group.visible = false;

      this.uniforms = {
        uColor: { value: rawColor(0xcbb8ff) },
        uOpacity: { value: 0.0 },
      };
      this.trailMat = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: TRAIL_VERT,
        fragmentShader: TRAIL_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.trail = new THREE.Mesh(galaxy.trailGeometry, this.trailMat);
      this.trail.frustumCulled = false;
      this.group.add(this.trail);

      this.headMat = new THREE.SpriteMaterial({
        map: glow,
        color: 0xded2ff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
        opacity: 0.0,
      });
      this.head = new THREE.Sprite(this.headMat);
      this.group.add(this.head);

      galaxy.root.add(this.group);

      this.alive = false;
      this.dist = 0;
      this.travel = 1;
      this.speed = 1;
      this.x0 = 0;
      this.y0 = 0;
      this.dx = 0;
      this.dy = 0;
      this.z = -500;
    }

    ShootingStar.prototype.spawn = function () {
      const cam = galaxy.engine.camera;
      const fovRad = (cam.fov * Math.PI) / 180;

      const z = -(250 + Math.random() * 780);
      const halfH = Math.tan(fovRad * 0.5) * -z;
      const halfW = halfH * cam.aspect;

      const theta = -Math.PI * (0.12 + Math.random() * 0.76);
      const dx = Math.cos(theta);
      const dy = Math.sin(theta);

      const screenSpan = Math.max(halfH * 2.0, halfW * 2.0);
      this.travel = screenSpan * 2.0;
      this.speed = this.travel / (0.9 + Math.random() * 0.9);

      const cx = (Math.random() - 0.5) * halfW * 1.25;
      const cy = (Math.random() - 0.5) * halfH * 1.25;

      this.x0 = cx - dx * this.travel * 0.5;
      this.y0 = cy - dy * this.travel * 0.5;
      this.dx = dx;
      this.dy = dy;
      this.z = z;

      const trailLen = halfH * (0.42 + Math.random() * 0.45);
      const trailW = Math.max(trailLen * 0.032, halfH * 0.011);

      this.trail.scale.set(trailLen, trailW, 1);
      this.head.scale.setScalar(trailW * 4.5);

      this.uniforms.uColor.value.setHex(
        Math.random() < 0.55 ? 0xc7b2ff : 0xe8ddff,
        THREE.LinearSRGBColorSpace,
      );
      this.headMat.color.setHex(0xffffff);

      this.uniforms.uOpacity.value = 0.0;
      this.headMat.opacity = 0.0;

      this.dist = 0;
      this.alive = true;
      this.group.visible = true;
      this.group.position.set(this.x0, this.y0, this.z);
      this.group.rotation.z = Math.atan2(-dy, -dx);
    };

    ShootingStar.prototype.update = function (dt, master) {
      if (!this.alive) return;

      this.dist += this.speed * dt;
      const p = this.dist / this.travel;

      if (p >= 1.0) {
        this.alive = false;
        this.group.visible = false;
        return;
      }

      this.group.position.set(this.x0 + this.dx * this.dist, this.y0 + this.dy * this.dist, this.z);

      let fade = 1.0;
      if (p < 0.1) fade = p / 0.1;
      else if (p > 0.82) fade = (1.0 - p) / 0.18;
      fade = Math.max(0.0, Math.min(1.0, fade));
      fade *= fade;

      this.uniforms.uOpacity.value = 0.95 * fade * master;
      this.headMat.opacity = fade * master;
    };

    this._ShootingStar = ShootingStar;
    this.starPool = [];
    this.activeStars = [];
    this.nextSpawn = this.cfg.shooting.first;
  }

  _updateShootingStars(dt, time) {
    const s = this.cfg.shooting;
    if (time >= this.nextSpawn) {
      if (this.activeStars.length < s.maxActive) {
        const star = this.starPool.length ? this.starPool.pop() : new this._ShootingStar();
        star.spawn();
        this.activeStars.push(star);
      }
      this.nextSpawn = time + s.min + Math.random() * (s.max - s.min);
    }
    for (let i = this.activeStars.length - 1; i >= 0; i--) {
      const star = this.activeStars[i];
      star.update(dt, this.fade.value);
      if (!star.alive) {
        this.activeStars.splice(i, 1);
        this.starPool.push(star);
      }
    }
  }

  /* ---------- سیستم ---------- */
  resize() {
    const cam = this.engine.camera;
    const fovRad = (cam.fov * Math.PI) / 180;

    for (const mesh of this.nebulaMeshes) {
      const d = Math.abs(mesh.position.z);
      const ph = 2.0 * Math.tan(fovRad * 0.5) * d * 1.65;
      const pw = ph * cam.aspect * 1.15;
      mesh.scale.set(pw, ph, 1);
      mesh.material.uniforms.uAspect.value = cam.aspect;
    }
    this.starMat.uniforms.uPixelRatio.value = this.engine.pixelRatio;
  }

  update(dt, time) {
    if (!this.root.visible) return;

    /* پارالاکس: به‌جای حرکت دوربین، پس‌زمینه برعکس حرکت می‌کند */
    const p = this.cfg.parallax;
    const targetX = pointer.nx * p.x;
    const targetY = -pointer.ny * p.y;
    const k = Math.min(1.0, dt * p.ease);
    this.camX += (targetX - this.camX) * k;
    this.camY += (targetY - this.camY) * k;

    this.root.position.x = -(this.camX + Math.sin(time * 0.07) * 6.0);
    this.root.position.y = -(this.camY + Math.cos(time * 0.055) * 4.0);
    this.root.rotation.z = -(Math.sin(time * 0.04) * 0.012);

    for (const mesh of this.nebulaMeshes) mesh.material.uniforms.uTime.value = time;
    this.starMat.uniforms.uTime.value = time;

    this._updateShootingStars(dt, time);
  }
}
