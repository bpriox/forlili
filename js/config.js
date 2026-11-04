/* =========================================================
   تنظیمات مرکزی پروژه
   همه‌ی اعداد قابل تنظیم اینجا هستند.
   ========================================================= */
export const CONFIG = {
  paths: {
    music: "assets/music/song.mp3",
    lyrics: "assets/data/lyrics.json",
    font: "assets/fonts/lyrics.woff2",
    moonTexture: "assets/textures/moon_1024.jpg",
  },

  camera: { fov: 35, near: 0.1, far: 6000 },

  /* متن‌های پاکت و نامه (قابل ویرایش) */
  envelope: {
    address: "برای لیلا", // روی پاکت
    hint: "برای باز کردن نامه، مهر را لمس کن",
    letterTitle: "لیلا جان،",
    letterBody: "امشب یه آسمون کامل برات ساختم؛\nبیا با هم تماشاش کنیم.",
    letterSign: "✦ ✦ ✦",
  },

  /* پیام پایانی: بعد از تمام شدن آهنگ نمایش داده می‌شود */
  finale: {
    title: "تولدت مبارک، لیلا",
    lines: [
      "از وقتی تو هستی، آسمونِ من یه ماه داره.",
      "هر قدر هم که کهکشان بزرگ باشه، من تو رو بین همه‌ی ستاره‌ها پیدا می‌کنم.",
      "امیدوارم امسال به اندازه‌ی همه‌ی ستاره‌های این آسمون خوش بگذره، و من کنارت باشم تا خندیدنت رو ببینم.",
    ],
    sign: "دوستت دارم",
    replay: "یک بار دیگه",
  },

  /* زمان‌بندی باز شدن پاکت (ثانیه، نسبت به لمس مهر) */
  opening: {
    flapStart: 0.5,
    flapDuration: 1.25,
    letterRiseStart: 1.55,
    letterRiseDuration: 1.7,
    letterFlyStart: 3.5,
    letterFlyDuration: 1.5,
    readHold: 2.6, // مدت ماندن نامه‌ی بزرگ روی صفحه
    dissolve: 1.8,
  },

  /* زمان‌بندی نمایش بعد از باز شدن مهر (ثانیه) */
  timeline: {
    galaxyFadeIn: 3.0,
    moonDelay: 2.0, // نسبت به شروع ظاهر شدن کهکشان
    moonFadeIn: 3.0,
  },

  quality: {
    maxDprDesktop: 2,
    maxDprMobile: 1.5,
    minDpr: 1,
    slowFrameSeconds: 0.026, // میانگین فریم کندتر از این → کاهش وضوح
    sampleFrames: 90,
    warmupSeconds: 3,
  },

  moon: {
    radius: 1,
    widthSegments: { desktop: 192, mobile: 96 },
    heightSegments: { desktop: 128, mobile: 64 },
    axialTiltDeg: 6.68,
    initialYaw: -0.7,
    autoRotationSpeed: 0.08,
    autoResumeDelay: 3.0,
    fillRatio: 0.62,
    sun: { position: [-7, 1.6, 0.4], color: 0xffffff, intensity: 4.5 },
    /* 0 = نیمه‌ی تاریک کاملاً سیاه. (پروتوتایپ 0.1 بود) */
    darkSideFill: 0,
    interaction: {
      rotPerScreen: Math.PI * 2 * 0.55,
      inertiaDamping: 0.4,
      maxVelocity: 15,
      minVelocity: 0.02,
    },
  },

  galaxy: {
    starCount: { desktop: 4200, mobile: 1800 },
    nebulaOctaves: { desktop: 4, mobile: 3 },
    parallax: { x: 14, y: 10, ease: 1.6 },
    shooting: { first: 1.8, min: 3.0, max: 7.5, maxActive: 3 },
  },

  lyrics: {
    fontFamily: "LyricsFont",
    fontPx: 96, // اندازه‌ی رسم روی Canvas (وضوح)
    color: "#d9b8ff", // بنفش روشن
    glow: "#9d5cff",
    fadeIn: 1.4,
    fadeOut: 1.8,
    lingerAfterNext: 3.0, // خط قبلی چند ثانیه بعد از ظاهر شدن خط بعدی می‌ماند
    lastHold: 6.0, // مدت ماندن آخرین خط
    maxHold: 11.0, // سقف ماندن هر خط (برای وقفه‌ی بین بندها، مثل بین خط ۹ و ۱۰)
    rowOffsetDeg: 26, // فاصله‌ی ردیف بالا/پایین از ردیف میانی
    emDeg: { desktop: 7.2, portrait: 8.6 }, // اندازه‌ی زاویه‌ای حروف روی ماه
    maxWidthDeg: 84,
    lineHeight: 1.55,
    surfaceOffset: 0.004, // فاصله‌ی متن از سطح ماه
  },
};
