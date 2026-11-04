/* رابط کاربری عمومی: نوار بارگذاری، دکمه‌ی صدا، پیام خطا */
export class UI {
  constructor() {
    this.loader = document.getElementById("loader");
    this.fill = document.querySelector("#loadbar span");
    this.soundBtn = document.getElementById("sound");
    this.fatalEl = document.getElementById("fatal");
  }

  setProgress(p) {
    this.fill.style.width = `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
  }

  /* نوار بارگذاری محو می‌شود و صحنه‌ی بعدی دیده می‌شود */
  hideLoader() {
    this.setProgress(1);
    this.loader.classList.add("done");
    setTimeout(() => (this.loader.hidden = true), 1000);
  }

  /* دکمه‌ی صدا بعد از شروع نمایش داده می‌شود */
  showSound(onToggle) {
    const b = this.soundBtn;
    b.hidden = false;
    requestAnimationFrame(() => b.classList.add("show"));
    b.addEventListener("click", () => {
      const muted = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(muted));
      onToggle(muted);
    });
  }

  fatal() {
    this.loader.hidden = true;
    this.fatalEl.hidden = false;
  }
}
