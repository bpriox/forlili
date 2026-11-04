# Birthday-Leyla

تجربه‌ی تعاملی سه‌بعدی (Three.js) که روی GitHub Pages اجرا می‌شود. بدون build؛ فایل‌ها همان‌طور که هستند منتشر می‌شوند.

## اجرا روی کامپیوتر

ماژول‌های ES از `file://` کار نمی‌کنند، پس یک سرور ساده لازم است:

```
cd Birthday-Leyla
python3 -m http.server 8000
```

بعد `http://localhost:8000` را باز کن. برای دیدن جای و شکل متن‌ها قبل از زمان‌بندی واقعی: `http://localhost:8000/?demo`
(در این حالت هر خط ترانه هر ۵ ثانیه ظاهر می‌شود.)

## انتشار روی GitHub Pages

کل پوشه را در یک مخزن بگذار و در Settings → Pages شاخه‌ی main و پوشه‌ی root را انتخاب کن. همه‌ی مسیرها نسبی‌اند، پس در زیرمسیر مخزن هم کار می‌کند.

## ساختار

```
index.html
sync.html            ابزار زمان‌بندی ترانه (Tap-to-sync)
css/main.css
js/
  main.js            راه‌اندازی و بارگذاری منابع
  config.js          همه‌ی اعداد قابل تنظیم
  galaxy.js          سحابی، ستاره، شهاب‌سنگ
  moon.js            ماه، نور، چرخش و تعامل
  lyrics.js          متن ترانه روی سطح ماه
  music.js           پخش موسیقی (زمان‌بندی از audio.currentTime)
  core/              engine (یک renderer و یک حلقه)، director (ترتیب مراحل)،
                     quality (کاهش خودکار وضوح)، ui، assets، input، env
  textures/          تکسچر رویه‌ای ماه (فقط اگر عکس بارگذاری نشود)
  vendor/            three.js r160 و GSAP (محلی، بدون CDN)
assets/
  music/song.mp3
  fonts/lyrics.woff2   فقط حروف ترانه (از فونت خودت ساخته شده)
  textures/moon_1024.jpg
  data/lyrics.json     متن و زمان‌بندی ترانه
```

## زمان‌بندی ترانه

زمان هر خط در `assets/data/lyrics.json` (فیلد `start`، ثانیه) ثبت شده. برای زمان‌بندی دوباره یا تغییر متن، فایل `sync.html` را در مرورگر باز کن (با دابل‌کلیک هم کار می‌کند)، آهنگ را پخش کن و با `Space` شروع هر خط را بزن؛ در آخر `lyrics.json` را دانلود کن و جای فایل قبلی بگذار.
خطی که `start` ندارد (`null`) نمایش داده نمی‌شود. `end` اختیاری است؛ اگر ننویسی، هر خط چند ثانیه بعد از ظاهر شدن خط بعدی محو می‌شود (`lingerAfterNext`)، ولی هیچ خطی بیشتر از `maxHold` نمی‌ماند (هر دو در `config.js`).

اگر متن ترانه عوض شد، فونت را دوباره برش بزن:
`pyftsubset فونت.ttf --text-file=متن.txt --layout-features='*' --flavor=woff2 --output-file=assets/fonts/lyrics.woff2`

## نمایش پیام پایانی

متن پیام پایانی در `js/config.js` بخش `finale` است. برای دیدن مستقیم آن: `/?finale`. برای رد کردن پاکت: `/?skip`.

## وضعیت

انجام‌شده: پاکت و مهر، کهکشان، ماه، موسیقی، متن ترانه روی ماه، پیام پایانی با دکمه‌ی «یک بار دیگه».
هنوز تست نشده: گوشی واقعی (به‌ویژه iOS).
