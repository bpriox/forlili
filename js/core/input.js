/* موقعیت نرمال‌شده‌ی اشاره‌گر (−۱ تا ۱) برای پارالاکس پس‌زمینه */
export const pointer = { nx: 0, ny: 0 };

window.addEventListener(
  "pointermove",
  (e) => {
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  },
  { passive: true },
);
