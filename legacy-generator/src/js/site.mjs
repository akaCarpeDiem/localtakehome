import { mountCalculator } from "./calculator.mjs?v=20261004b";
import { mountTool } from "./tools.mjs";

function clearThemePreference() {
  // Theme selection is no longer supported; remove preferences from older visits.
  try {
    localStorage.removeItem("lth-theme");
    localStorage.removeItem("tth-theme");
  } catch {
    /* ignore */
  }
  delete document.documentElement.dataset.theme;
}

function initMenu() {
  const button = document.querySelector("[data-menu]");
  const nav = document.querySelector("#site-nav");
  if (!button || !nav) return;
  button.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function initKeys() {
  const dialog = document.querySelector("#keys");
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
    if (event.key === "?" && !typing) {
      event.preventDefault();
      dialog?.showModal();
    }
    if (event.key === "/" && !typing) {
      event.preventDefault();
      document.getElementById("pay-field")?.focus();
    }
    if (event.key === "Escape") dialog?.close();
  });
  document.querySelector("[data-close-keys]")?.addEventListener("click", () => dialog?.close());
}

function boot() {
  clearThemePreference();
  initMenu();
  initKeys();
  if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("embed");
  const page = document.body.dataset.page;
  if (page === "calculator") {
    const node = document.querySelector("#calculator");
    let preset = {};
    try {
      preset = JSON.parse(node?.dataset.preset || "{}");
    } catch {
      preset = {};
    }
    if (node) mountCalculator(node, { preset });
  }
  if (page === "tool") {
    const node = document.querySelector("#tool");
    if (node) mountTool(node);
  }
}

boot();
