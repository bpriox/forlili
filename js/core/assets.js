import * as THREE from "../vendor/three.module.min.js";

export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/* فونت باید قبل از رسم متن روی Canvas کاملاً آماده باشد */
export async function loadFont(family, url, descriptors = {}) {
  const face = new FontFace(family, `url(${url}) format("woff2")`, descriptors);
  await face.load();
  document.fonts.add(face);
}

/* اگر بارگذاری نشد null برمی‌گرداند تا ماه از تکسچر رویه‌ای استفاده کند */
export async function loadTexture(url) {
  try {
    return await new THREE.TextureLoader().loadAsync(url);
  } catch (_) {
    return null;
  }
}
