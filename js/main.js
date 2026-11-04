import { CONFIG } from "./config.js";
import { Engine } from "./core/engine.js";
import { Director } from "./core/director.js";
import { UI } from "./core/ui.js";
import { Sfx } from "./core/sfx.js";
import { loadJSON, loadFont, loadTexture } from "./core/assets.js";
import { Galaxy } from "./galaxy.js";
import { Moon } from "./moon.js";
import { Music } from "./music.js";
import { Lyrics } from "./lyrics.js";
import { EnvelopeStage } from "./envelope.js";
import { Finale } from "./finale.js";

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

async function boot() {
  const ui = new UI();
  const params = new URLSearchParams(location.search);
  const demo = params.has("demo");
  const skip = params.has("skip");

  if (!webglOK()) {
    ui.fatal();
    return;
  }

  const engine = new Engine(document.getElementById("app"));
  const music = new Music(CONFIG.paths.music);
  const sfx = new Sfx();

  /* بارگذاری همه‌ی منابع با نوار پیشرفت.
     هر منبع جدا حساب می‌شود تا خرابی یکی (مثلاً فونت) کل صفحه را متوقف نکند. */
  const tasks = [
    loadJSON(CONFIG.paths.lyrics),
    loadFont(CONFIG.lyrics.fontFamily, CONFIG.paths.font),
    loadTexture(CONFIG.paths.moonTexture),
    music.load(),
    document.fonts.load("700 24px ArefRuqaa", "برای لیلا"),
    document.fonts.load("400 16px Vazirmatn", "لیلا"),
  ];
  let done = 0;
  tasks.forEach((t) => t.finally(() => ui.setProgress(++done / tasks.length)));
  const results = await Promise.allSettled(tasks);
  const val = (i, fallback = null) => (results[i].status === "fulfilled" ? results[i].value : fallback);
  const doc = val(0, { cues: [] });
  const moonTexture = val(2);

  /* ساخت سیستم‌ها: ترتیب افزودن = ترتیب update */
  const galaxy = engine.addSystem(new Galaxy(engine));
  const moon = engine.addSystem(new Moon(engine, { texture: moonTexture }));
  engine.addSystem(new Lyrics({ engine, moon, music, doc, demo }));

  const stage = new EnvelopeStage(document.getElementById("stage"), { sfx });
  const director = new Director({ galaxy, moon, music, ui, stage, sfx, finale: null });
  director.finale = new Finale(document.getElementById("finale"), { onReplay: () => director.replay() });

  /* پیش‌نمایش پیام پایانی: ?finale */
  if (params.has("finale")) {
    ui.hideLoader();
    stage.root.hidden = true;
    galaxy.opacity = 1;
    moon.opacity = 1;
    engine.start();
    director.finale.show();
    return;
  }

  engine.start();
  director.run({ skip });
}

boot().catch((err) => {
  console.error(err);
  document.getElementById("fatal")?.removeAttribute("hidden");
  document.getElementById("loader")?.setAttribute("hidden", "");
});
