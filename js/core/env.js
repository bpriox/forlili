const ua = navigator.userAgent || "";

/* iPadOS خودش را Mac معرفی می‌کند، پس لمسی بودن هم بررسی می‌شود */
export const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
  (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
