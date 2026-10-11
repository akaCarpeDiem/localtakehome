export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export function usd(value, digits = 2) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function num(value) {
  const n = typeof value === "string" ? Number.parseFloat(value.replace(/[$,]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function tweenNumber(el, value, format) {
  const target = Number.isFinite(value) ? value : 0;
  const first = el.dataset.seen !== "1";
  const from = Number(el.dataset.n ?? target);
  el.dataset.n = String(target);
  el.dataset.seen = "1";
  if (prefersReducedMotion() || from === target) {
    el.textContent = format(target);
    return;
  }
  const duration = first ? 240 : 150;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = format(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = format(target);
  };
  requestAnimationFrame(step);
}
