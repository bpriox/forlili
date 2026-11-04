import { CONFIG } from "../config.js";
import { IS_MOBILE } from "./env.js";

/* کاهش خودکار وضوح (pixel ratio) وقتی فریم‌ریت پایین است.
   فقط پایین می‌آورد و دوباره بالا نمی‌برد، تا نوسان ایجاد نشود. */
export class Quality {
  constructor(engine) {
    const q = CONFIG.quality;
    this.engine = engine;
    this.max = Math.min(
      window.devicePixelRatio || 1,
      IS_MOBILE ? q.maxDprMobile : q.maxDprDesktop,
    );
    this.pixelRatio = Math.max(q.minDpr, this.max);
    this._acc = 0;
    this._frames = 0;
    this._elapsed = 0;
  }

  /* dt = زمان واقعی بین دو فریم (ثانیه) */
  update(dt) {
    const q = CONFIG.quality;
    this._elapsed += dt;
    if (this._elapsed < q.warmupSeconds) return;
    if (dt > 0.5) return; // تب پنهان بوده یا پرش زمانی
    if (this.pixelRatio <= q.minDpr) return;

    this._acc += dt;
    this._frames++;
    if (this._frames < q.sampleFrames) return;

    const avg = this._acc / this._frames;
    this._acc = 0;
    this._frames = 0;

    if (avg > q.slowFrameSeconds) {
      this.pixelRatio = Math.max(q.minDpr, this.pixelRatio - 0.25);
      this.engine.resize();
    }
  }
}
