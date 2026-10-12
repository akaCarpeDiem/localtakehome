/** Small formatting and DOM helpers shared by the browser code and the page generator. */

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** $1,234.56 */
export function usd(value, digits = 2) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** $1,235 */
export function usd0(value) {
  return usd(Math.round(Number.isFinite(value) ? value : 0), 0);
}

/** +$1,235 or −$1,235 (a real minus sign) */
export function signed(value, digits = 0) {
  const n = Number.isFinite(value) ? value : 0;
  const body = usd(Math.abs(n), digits);
  if (Math.abs(n) < (digits ? 0.005 : 0.5)) return usd(0, digits);
  return `${n < 0 ? "−" : "+"}${body}`;
}

/** 0.0495 -> "4.95%" */
export function pct(rate, maxDigits = 2) {
  const n = Number.isFinite(rate) ? rate * 100 : 0;
  return `${Number(n.toFixed(maxDigits)).toLocaleString("en-US", { maximumFractionDigits: maxDigits })}%`;
}

/** 85000 -> "85,000" */
export function commas(value, maxDigits = 2) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
}

/** Reads "85,000", "$85k", "1.2m", "85 000". Returns 0 for anything unreadable. */
export function num(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!text) return 0;
  const match = /^(-?\d*\.?\d+)([km])?$/.exec(text);
  if (match) {
    const scale = match[2] === "k" ? 1e3 : match[2] === "m" ? 1e6 : 1;
    const n = Number.parseFloat(match[1]) * scale;
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number.parseFloat(text);
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
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts a figure up or down to its new value. */
export function tweenNumber(el, value, format) {
  const target = Number.isFinite(value) ? value : 0;
  const from = Number(el.dataset.n ?? target);
  el.dataset.n = String(target);
  if (prefersReducedMotion() || from === target) {
    el.textContent = format(target);
    return;
  }
  const duration = 220;
  const start = performance.now();
  const token = String(start);
  el.dataset.tween = token;
  const step = (now) => {
    if (el.dataset.tween !== token) return;
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = format(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = format(target);
  };
  requestAnimationFrame(step);
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
