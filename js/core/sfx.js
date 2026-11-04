/* =========================================================
   افکت‌های صوتی ساخته‌شده با WebAudio (بدون فایل صوتی):
   شکستن مهر موم، خش‌خش کاغذ، سُر خوردن نامه، و یک زنگ نرم.
   باید بعد از اولین لمس کاربر ساخته شود (محدودیت autoplay).
   ========================================================= */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noise = null;
  }

  /* داخل هندلر لمس صدا زده شود */
  unlock() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);

      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
    } catch (_) {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  _src(offset = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = this._noise;
    s.loop = true;
    s.loopStart = 0;
    s.loopEnd = 2;
    s.start(this.ctx.currentTime, offset);
    return s;
  }

  /* شکستن مهر: ضربه‌ی تیز + چند ترک ریز + یک تپ کم‌صدا */
  crack() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;

    const snap = (at, dur, freq, vol) => {
      const n = this._src(Math.random());
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t + at);
      g.gain.linearRampToValueAtTime(vol, t + at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      n.connect(hp).connect(g).connect(this.master);
      n.stop(t + at + dur + 0.05);
    };
    snap(0, 0.06, 2200, 0.55);
    snap(0.035, 0.04, 3200, 0.3);
    snap(0.075, 0.05, 1800, 0.22);
    snap(0.13, 0.03, 4200, 0.12);

    const o = c.createOscillator();
    const og = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    og.gain.setValueAtTime(0.28, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.16);
  }

  /* خش‌خش کاغذ: نویز باندپس با دامنه‌ی تصادفی */
  rustle(duration = 1.1, vol = 0.18, center = 3800) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const n = this._src(Math.random());
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = center;
    bp.Q.value = 0.7;
    const g = c.createGain();

    const steps = 48;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      const env = Math.sin(Math.PI * x) ** 0.8;
      curve[i] = env * (0.25 + Math.random() * 0.75) * vol;
    }
    g.gain.setValueCurveAtTime(curve, t, duration);
    n.connect(bp).connect(g).connect(this.master);
    n.stop(t + duration + 0.05);
  }

  /* سُر خوردن نامه از پاکت: نرم و کم‌فرکانس‌تر */
  slide(duration = 1.5) {
    this.rustle(duration, 0.14, 1800);
  }

  /* زنگ نرم هنگام محو شدن نامه به ستاره‌ها */
  chime() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    [523.25, 783.99, 1046.5, 1568].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const at = t + i * 0.09;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.035 / (1 + i * 0.4), at + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
      o.connect(g).connect(this.master);
      o.start(at);
      o.stop(at + 3.3);
    });
  }
}
