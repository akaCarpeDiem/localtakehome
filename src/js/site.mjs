/** Page start-up: menu, embed mode, and whichever calculator the page carries. */

function initMenu() {
  const button = document.querySelector("[data-menu]");
  const nav = document.querySelector("#site-nav");
  if (button && nav) {
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  // Close the tools list when clicking elsewhere or pressing Escape.
  const tools = document.querySelector(".tools-menu");
  if (tools) {
    document.addEventListener("click", (event) => {
      if (tools.open && !tools.contains(event.target)) tools.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && tools.open) {
        tools.open = false;
        tools.querySelector("summary").focus();
      }
    });
  }
}

function initShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
    const field = document.querySelector("#pay-field:not([hidden])") || document.querySelector(".tool-form input");
    if (!field || field.closest("[hidden]")) return;
    event.preventDefault();
    field.focus();
    field.select?.();
  });
}

function initCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        const label = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => (button.textContent = label), 1600);
      } catch {
        /* the text is visible and can be selected by hand */
      }
    });
  });
}

function parse(json) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

async function boot() {
  // Preferences from an older version of the site that no longer apply.
  try {
    localStorage.removeItem("lth-theme");
    localStorage.removeItem("tth-theme");
  } catch {
    /* ignore */
  }
  initMenu();
  initShortcuts();
  initCopyButtons();
  if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("embed");

  const calculator = document.querySelector("#calculator");
  if (calculator) {
    const { mountCalculator } = await import("./calculator.mjs");
    mountCalculator(calculator, { preset: parse(calculator.dataset.preset), examples: calculator.dataset.examples !== "off" });
  }
  const tool = document.querySelector("#tool");
  if (tool) {
    const [{ mountTool }, { getTables }] = await Promise.all([import("./tools.mjs"), import("./data.mjs")]);
    mountTool(tool, getTables());
  }
}

boot();
