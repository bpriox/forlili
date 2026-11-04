/* =========================================================
   موسیقی: یک المان Audio. زمان‌بندی ترانه فقط از currentTime خوانده می‌شود،
   پس توقف، ادامه یا جابه‌جایی زمان، هماهنگی را به‌هم نمی‌زند.
   ========================================================= */
export class Music {
  constructor(url) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.loop = false;
    this.audio.setAttribute("playsinline", "");
    this.url = url;
    this._pausedByHide = false;
    this._endedCbs = [];

    this.audio.addEventListener("ended", () => this._endedCbs.forEach((f) => f()));

    /* وقتی تب پنهان شد آهنگ هم بایستد (و بعد ادامه پیدا کند) */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this.playing) {
          this._pausedByHide = true;
          this.audio.pause();
        }
      } else if (this._pausedByHide) {
        this._pausedByHide = false;
        this.audio.play().catch(() => {});
      }
    });
  }

  /* پیش‌بارگذاری. روی iOS رویداد canplaythrough معمولاً قبل از لمس نمی‌آید،
     پس به canplay قانع می‌شویم و بعد از چند ثانیه هر طور شده ادامه می‌دهیم. */
  load(timeoutMs = 7000) {
    return new Promise((resolve) => {
      const a = this.audio;
      const done = () => {
        clearTimeout(timer);
        ["canplay", "loadeddata", "error"].forEach((e) => a.removeEventListener(e, done));
        resolve();
      };
      const timer = setTimeout(done, timeoutMs);
      ["canplay", "loadeddata", "error"].forEach((e) => a.addEventListener(e, done));
      a.src = this.url;
      a.load();
    });
  }

  /* باید مستقیم داخل هندلر لمس/کلیک صدا زده شود (محدودیت autoplay) */
  play({ fade = 0 } = {}) {
    try {
      if (fade > 0 && window.gsap) {
        this.audio.volume = 0;
        window.gsap.to(this.audio, { volume: 1, duration: fade, ease: "sine.inOut" });
      }
      const p = this.audio.play();
      return p && p.then ? p.then(() => true).catch(() => false) : Promise.resolve(true);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  restart() {
    this.audio.currentTime = 0;
    return this.play({ fade: 1.2 });
  }

  setMuted(m) {
    this.audio.muted = m;
  }

  onEnded(fn) {
    this._endedCbs.push(fn);
  }

  get currentTime() {
    return this.audio.currentTime;
  }
  get playing() {
    return !this.audio.paused && !this.audio.ended;
  }
}
