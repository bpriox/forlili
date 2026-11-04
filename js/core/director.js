import { CONFIG } from "../config.js";

export const State = Object.freeze({
  LOADING: "loading",
  READY: "ready", // پاکت روی صفحه، منتظر لمس مهر
  OPENING: "opening", // مهر شکسته، درپوش باز می‌شود، نامه بیرون می‌آید
  GALAXY: "galaxy",
  MOON: "moon",
  LYRICS: "lyrics", // ماه قابل چرخاندن + ترانه با موسیقی
  FINALE: "finale", // آهنگ تمام شد
});

/* مدیر مراحل: ترتیب اتفاقات را تعیین می‌کند و تعامل‌ها را در هر مرحله باز یا قفل می‌کند.
   فقط اینجا مشخص می‌شود چه چیزی کی اتفاق بیفتد؛ ماژول‌ها خودشان از هم خبر ندارند. */
export class Director {
  constructor({ galaxy, moon, music, ui, stage, sfx, finale }) {
    Object.assign(this, { galaxy, moon, music, ui, stage, sfx, finale });
    this.state = State.LOADING;

    /* آهنگ تمام شد → پیام تولد */
    this.music.onEnded(() => {
      if (this.state === State.LYRICS) {
        this.state = State.FINALE;
        this.finale.show();
      }
    });
  }

  async run({ skip = false } = {}) {
    this.state = State.READY;

    if (skip) {
      /* حالت آزمایشی (?skip): بدون پاکت مستقیم برو سراغ آسمان */
      this.ui.hideLoader();
      this.ui.showSound((m) => this._mute(m));
      this.music.play();
      this._revealSky();
      return;
    }

    this.stage.show();
    this.ui.hideLoader();

    /* موسیقی و صدا با همان لمس مهر شروع می‌شوند (محدودیت autoplay مرورگرها) */
    await this.stage.waitForOpen(() => {
      this.sfx.unlock();
      this.sfx.crack();
      this.music.play({ fade: 3 });
      this.ui.showSound((m) => this._mute(m));
    });

    this.state = State.OPENING;
    await this.stage.play({ onDissolve: () => this._revealSky() });
  }

  _mute(m) {
    this.music.setMuted(m);
    this.sfx.setMuted(m);
  }

  /* کهکشان و بعد ماه به‌تدریج ظاهر می‌شوند */
  _revealSky() {
    const gsap = window.gsap;
    const T = CONFIG.timeline;
    this.state = State.GALAXY;
    gsap
      .timeline()
      .to(this.galaxy, { opacity: 1, duration: T.galaxyFadeIn, ease: "sine.inOut" }, 0)
      .call(() => (this.state = State.MOON), null, T.moonDelay)
      .to(this.moon, { opacity: 1, duration: T.moonFadeIn, ease: "sine.inOut" }, T.moonDelay)
      .call(() => {
        this.moon.setInteractive(true);
        if (this.state !== State.FINALE) this.state = State.LYRICS;
      });
  }

  /* «یک بار دیگه» در پیام پایانی */
  replay() {
    this.state = State.LYRICS;
    this.music.restart();
  }
}
