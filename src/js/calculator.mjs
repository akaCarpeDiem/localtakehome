/** The calculator in the browser: reads the form, runs the engine, paints the result. */
import { PERIODS, calculateTakeHome, keepOfNext } from "./engine.mjs";
import { findLocal, getTables } from "./data.mjs";
import { debounce, esc, num, tweenNumber, usd } from "./format.mjs";
import { EXAMPLES, blockRowHTML, defaults, fromQuery, hoursPerYear, isBlank, localOptions, queryHasInputs, shellHTML, toEngineInput, toQuery, whatIfHTML } from "./calc-form.mjs";
import { netFor, renderResult, resultPlace, showToast, summaryText } from "./view.mjs";

const LAST_KEY = "lth-last";
const SCENARIO_KEY = "lth-scenarios";
const VIEW_LABEL = { period: "per paycheck", month: "per month", year: "per year" };
const TEXT_FIELDS = ["gross", "unit", "rate", "hours", "weeks", "ot", "otm", "hoursBasis", "status", "state", "local", "kids", "deps", "k401", "k401mode", "roth", "rothmode", "hsa", "health", "dental", "vision", "fsa", "commuter", "pretax", "union", "posttax", "bonus", "tips", "otp", "extra", "credits", "oinc", "oded", "custom", "workState", "exp"];
const CHECK_FIELDS = ["lives", "pretaxfica", "wd", "jobs"];
const RADIO_FIELDS = ["payType", "frequency", "emp"];

function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: the calculator works without it */
  }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Scenarios saved by the previous version of the site stored a few named fields. */
function upgradeScenario(item) {
  if (item?.q != null) return item;
  const old = item?.values || {};
  const q = new URLSearchParams();
  if (old.payType === "hourly") {
    q.set("type", "hourly");
    if (old.rate) q.set("pay", old.rate);
    if (old.hours && old.hours !== "40") q.set("hours", old.hours);
  } else if (old.gross) q.set("pay", old.gross);
  if (old.state) q.set("state", old.state);
  if (old.local) q.set("local", old.local);
  if (old.lives === false) q.set("live", "0");
  if (old.frequency) q.set("freq", old.frequency);
  if (old.status) q.set("status", old.status);
  if (old.k401) q.set("k401", old.k401);
  if (old.k401mode === "dollar") q.set("k401mode", "dollar");
  if (old.bonus) q.set("bonus", old.bonus);
  if (old.extra) q.set("extra", old.extra);
  if (old.employment === "contractor") q.set("emp", "contractor");
  return { name: item?.name || "Saved estimate", q: q.toString() };
}

function readBlocks(form) {
  return [...form.querySelectorAll("[data-block]")].map((row) => {
    const preset = row.querySelector("[data-block-label]").value;
    const custom = row.querySelector("[data-block-custom]").value.trim();
    return {
      label: preset === "Custom" ? custom || "Other" : preset,
      hours: row.querySelector("[data-block-hours]").value,
      rate: row.querySelector("[data-block-rate]").value,
      overtime: row.querySelector("[data-block-ot]").checked,
      differential: row.querySelector("[data-block-diff]").checked,
    };
  });
}

function readForm(form, blocksOn) {
  const v = defaults();
  for (const name of TEXT_FIELDS) if (form.elements[name]) v[name] = form.elements[name].value;
  for (const name of CHECK_FIELDS) if (form.elements[name]) v[name] = form.elements[name].checked;
  for (const name of RADIO_FIELDS) v[name] = form.querySelector(`[name="${name}"]:checked`)?.value || v[name];
  v.blocks = v.payType === "hourly" && blocksOn ? readBlocks(form) : [];
  return v;
}

function writeForm(form, v) {
  for (const name of TEXT_FIELDS) if (form.elements[name] && name !== "local") form.elements[name].value = v[name] ?? "";
  for (const name of CHECK_FIELDS) if (form.elements[name]) form.elements[name].checked = Boolean(v[name]);
  for (const name of RADIO_FIELDS) {
    const el = form.querySelector(`[name="${name}"][value="${v[name]}"]`);
    if (el) el.checked = true;
  }
}

export function mountCalculator(root, options = {}) {
  const tables = getTables();
  const preset = options.preset || {};
  const q = new URLSearchParams(location.search);
  const fromLink = queryHasInputs(q);
  let restored = false;
  let values;
  if (fromLink) values = fromQuery(q, preset);
  else {
    const last = load(LAST_KEY, null);
    if (last?.q) {
      // A page about one place keeps its place; the rest of what you typed last time comes back.
      const lastValues = fromQuery(new URLSearchParams(last.q));
      values = preset.state ? { ...lastValues, state: preset.state, local: preset.local || "", lives: preset.lives !== false, custom: "", workState: "" } : lastValues;
      // A page about hourly pay opens in hourly mode even if a salary was typed last time.
      if (preset.payType) values.payType = preset.payType;
      if (preset.openW4) values.openW4 = true;
      restored = !isBlank(values);
    } else values = defaults(preset);
  }

  const ui = { view: "period", elsewhere: null, last: null, sample: true, blocksOn: values.blocks.length > 0 };
  const untouched = !fromLink && !restored && root.querySelector(".calc");
  if (!untouched) {
    const sample = isBlank(values);
    const input = toEngineInput(values, { sample });
    const result = calculateTakeHome(input, tables);
    root.innerHTML = shellHTML(tables, values, renderResult(result, { sample, keepNext: keepOfNext(input, tables), hoursPerYear: hoursPerYear(values) }), whatIfHTML(tables, values, result, null), { examples: options.examples !== false });
  }

  const form = root.querySelector("#calc-form");
  const out = root.querySelector("[data-result]");
  const whatIf = root.querySelector("[data-whatif]");
  const live = root.querySelector("[data-live]");
  const announce = debounce((text) => {
    if (live) live.textContent = text;
  }, 700);
  const remember = debounce((v) => store(LAST_KEY, { q: toQuery(v).toString() }), 600);

  if (restored) {
    const note = document.createElement("p");
    note.className = "restored";
    note.innerHTML = `Your last inputs are back, from this device only. <button type="button" class="link-btn" data-forget>Clear them</button>`;
    form.before(note);
    note.querySelector("[data-forget]").addEventListener("click", () => {
      store(LAST_KEY, null);
      note.remove();
      reset();
    });
  }

  /* sticky figure for small screens */
  let bar = document.querySelector(".netbar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "netbar";
    bar.hidden = true;
    bar.innerHTML = `<div><span class="netbar-label">Take-home</span><strong data-netbar></strong> <span class="netbar-unit" data-netbar-unit></span></div><a href="#result" class="btn solid small">See the breakdown</a>`;
    document.body.append(bar);
  }
  if ("IntersectionObserver" in window) {
    const figureGone = new IntersectionObserver(
      ([entry]) => {
        bar.hidden = entry.isIntersecting || ui.sample;
        document.body.classList.toggle("has-netbar", !bar.hidden);
      },
      { rootMargin: "-80px 0px 0px 0px" },
    );
    ui.observe = () => {
      const figure = out.querySelector(".net");
      figureGone.disconnect();
      if (figure) figureGone.observe(figure);
    };
  }

  function syncVisibility(v) {
    const hourly = v.payType === "hourly";
    const perPeriod = v.hoursBasis === "period";
    const show = (selector, on) => form.querySelectorAll(selector).forEach((el) => (el.hidden = !on));
    show('[data-when="salary"]', !hourly);
    show('[data-when="hourly"]', hourly);
    show('[data-when="single-rate"]', !ui.blocksOn);
    show('[data-when="blocks"]', ui.blocksOn);
    show("[data-block-on]", !ui.blocksOn);
    show('[data-when="weeks"]', !perPeriod);
    show('[data-when="contractor"]', v.emp === "contractor");
    const hoursLabel = form.querySelector("[data-hours-label]");
    if (hoursLabel) hoursLabel.textContent = perPeriod ? "Hours this paycheck" : "Hours a week";
    const otLabel = form.querySelector("[data-ot-label]");
    if (otLabel) otLabel.textContent = perPeriod ? "Overtime hours this paycheck" : "Overtime hours a week";
    const local = findLocal(tables, v.local);
    const livesWrap = form.querySelector("[data-lives-wrap]");
    livesWrap.hidden = !(local && local.appliesWhen !== "work" && (local.appliesWhen === "resident-or-work" || v.lives === false));
    const hint = form.querySelector("[data-local-hint]");
    if (hint) hint.textContent = local ? local.sourceLabel || "" : "Local income tax is added only when you pick a place.";
  }

  function syncLocalList(stateId, selected) {
    const options = localOptions(tables, stateId, selected);
    const wrap = form.querySelector("[data-local-wrap]");
    const none = form.querySelector("[data-nolocal]");
    form.elements.local.innerHTML = options;
    wrap.hidden = !options;
    none.hidden = Boolean(options);
    const state = tables.states.states.find((row) => row.id === stateId);
    none.querySelector("[data-nolocal-state]").textContent = state ? `${state.name} has no city or county income tax in this calculator.` : "";
  }

  function renderBlocks(blocks) {
    const perPeriod = form.elements.hoursBasis.value === "period";
    form.querySelector("[data-block-list]").innerHTML = blocks.map((block, index) => blockRowHTML(block, index, perPeriod)).join("");
  }

  function blockTotal(v) {
    const host = form.querySelector("[data-block-total]");
    if (!host) return;
    if (!ui.blocksOn) {
      host.textContent = "";
      return;
    }
    const sum = v.blocks.reduce((total, block) => total + num(block.hours) * num(block.rate), 0);
    const perPeriod = v.hoursBasis === "period";
    const scale = perPeriod ? PERIODS[v.frequency] || 26 : num(v.weeks) || 52;
    host.textContent = sum > 0 ? `${usd(sum)} ${perPeriod ? "this paycheck" : "a week"}, ${usd(sum * scale)} a year before bonus and tips` : "";
  }

  function validate(v) {
    const set = (key, text) => {
      const el = form.querySelector(`[data-error="${key}"]`);
      if (el) el.textContent = text;
    };
    let hourlyError = "";
    if (v.payType === "hourly") {
      if (v.hoursBasis !== "period" && num(v.hours) + num(v.ot) > 168) hourlyError = "A week has 168 hours. Check the hours.";
      else if (num(v.weeks) > 53) hourlyError = "A year has at most 53 paid weeks.";
    }
    set("hourly", hourlyError);
    set("gross", num(v.gross) < 0 ? "Enter an amount of zero or more." : "");
  }

  function paint({ animate = true, force = false } = {}) {
    const v = readForm(form, ui.blocksOn);
    syncVisibility(v);
    validate(v);
    blockTotal(v);
    const sample = isBlank(v);
    const input = toEngineInput(v, { sample });
    // Leaving a field fires a second event with nothing new to show. Re-drawing then would
    // swallow a click that is already on its way to a button in the result.
    const signature = JSON.stringify([input, sample, ui.view, ui.elsewhere]);
    if (signature === ui.signature && !force) return;
    ui.signature = signature;
    const result = calculateTakeHome(input, tables);
    const open = new Set([...out.querySelectorAll("details[open][data-keep]")].map((el) => el.dataset.keep));
    const before = ui.last ? netFor(ui.last, ui.view) : null;
    out.innerHTML = renderResult(result, { sample, view: ui.view, keepNext: keepOfNext(input, tables), hoursPerYear: hoursPerYear(v) });
    for (const el of out.querySelectorAll("details[data-keep]")) if (open.has(el.dataset.keep)) el.open = true;
    whatIf.innerHTML = whatIfHTML(tables, v, result, ui.elsewhere);
    const figure = out.querySelector("[data-net]");
    if (figure && animate && before != null) {
      figure.dataset.n = String(before);
      tweenNumber(figure, netFor(result, ui.view), usd);
    }
    bar.querySelector("[data-netbar]").textContent = usd(netFor(result, ui.view));
    bar.querySelector("[data-netbar-unit]").textContent = VIEW_LABEL[ui.view];
    ui.last = result;
    ui.values = v;
    ui.sample = sample;
    if (sample) bar.hidden = true;
    ui.observe?.();
    if (!sample) remember(v);
    announce(sample ? `Example shown. Enter your pay to see your own take-home pay.` : `Take-home pay ${usd(result.periodNet)} per paycheck in ${resultPlace(result)}.`);
  }

  function apply(v) {
    ui.blocksOn = v.blocks.length > 0;
    writeForm(form, v);
    syncLocalList(v.state, v.local);
    renderBlocks(v.blocks);
    paint();
  }

  function reset() {
    ui.elsewhere = null;
    apply(defaults(preset));
  }

  const update = debounce(() => paint(), 90);

  form.addEventListener("input", update);
  form.addEventListener("change", (event) => {
    const name = event.target.name;
    if (name === "state") syncLocalList(event.target.value, "");
    if (name === "hoursBasis" && ui.blocksOn) renderBlocks(readBlocks(form));
    if (event.target.matches("[data-block-label]")) {
      const row = event.target.closest("[data-block]");
      row.querySelector("[data-block-custom-wrap]").hidden = event.target.value !== "Custom";
      const flags = { OT: [true, false], "Night + OT": [true, true], Night: [false, true], Weekend: [false, true], Holiday: [false, true], Hazard: [false, true], Base: [false, false] }[event.target.value];
      if (flags) {
        row.querySelector("[data-block-ot]").checked = flags[0];
        row.querySelector("[data-block-diff]").checked = flags[1];
      }
    }
    paint();
  });
  form.addEventListener("submit", (event) => event.preventDefault());

  // Show typed dollar amounts with thousands separators once the field is left.
  form.addEventListener("focusout", (event) => {
    const el = event.target;
    if (!el.matches?.('input[name="gross"], input[name="bonus"], input[name="tips"]')) return;
    const n = num(el.value);
    if (n >= 1000) el.value = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  });

  form.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.matches("[data-block-on]")) {
      const rate = form.elements.rate.value;
      const blocks = [{ label: "Base", hours: form.elements.hours.value || "40", rate, overtime: false, differential: false }];
      const overtime = num(form.elements.ot.value);
      if (overtime > 0) blocks.push({ label: "OT", hours: String(overtime), rate: num(rate) ? String(Math.round(num(rate) * (num(form.elements.otm.value) || 1.5) * 100) / 100) : "", overtime: true, differential: false });
      ui.blocksOn = true;
      renderBlocks(blocks);
      paint();
      form.querySelector("[data-block-hours]")?.focus();
    } else if (target.matches("[data-block-off]")) {
      const first = readBlocks(form)[0];
      if (first) {
        form.elements.rate.value = first.rate;
        form.elements.hours.value = first.hours;
      }
      ui.blocksOn = false;
      renderBlocks([]);
      paint();
    } else if (target.matches("[data-block-add]")) {
      const blocks = readBlocks(form);
      const next = ["Night", "Weekend", "OT", "Night + OT", "Holiday"][Math.min(blocks.length - 1, 4)] || "Night";
      blocks.push({ label: next, hours: "", rate: "", overtime: next.includes("OT"), differential: next !== "OT" });
      renderBlocks(blocks);
      paint();
      [...form.querySelectorAll("[data-block-hours]")].at(-1)?.focus();
    } else if (target.matches("[data-block-remove]")) {
      const blocks = readBlocks(form);
      blocks.splice(Number(target.closest("[data-block]").dataset.block), 1);
      if (!blocks.length) ui.blocksOn = false;
      renderBlocks(blocks);
      paint();
    } else if (target.matches("[data-save]")) {
      const name = form.elements.scenarioName.value.trim() || resultPlace(ui.last);
      const items = load(SCENARIO_KEY, []).map(upgradeScenario).filter((item) => item.name !== name);
      items.unshift({ name, q: toQuery(readForm(form, ui.blocksOn)).toString() });
      store(SCENARIO_KEY, items.slice(0, 12));
      form.elements.scenarioName.value = "";
      renderSaved();
      showToast("Saved on this device");
    } else if (target.matches("[data-load]")) {
      const item = load(SCENARIO_KEY, []).map(upgradeScenario)[Number(target.dataset.load)];
      if (item) apply(fromQuery(new URLSearchParams(item.q)));
    } else if (target.matches("[data-delete]")) {
      const items = load(SCENARIO_KEY, []).map(upgradeScenario);
      items.splice(Number(target.dataset.delete), 1);
      store(SCENARIO_KEY, items.length ? items : null);
      renderSaved();
    }
  });

  function renderSaved() {
    const host = form.querySelector("[data-saved]");
    const items = load(SCENARIO_KEY, []).map(upgradeScenario);
    host.innerHTML = items.length
      ? items.map((item, index) => `<span class="saved"><button type="button" class="chip" data-load="${index}">${esc(item.name)}</button><button type="button" class="link-btn" data-delete="${index}" aria-label="Delete ${esc(item.name)}">Delete</button></span>`).join("")
      : "";
  }

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("button");
    if (!target || target.closest("#calc-form")) return;
    if (target.dataset.example != null) {
      const example = EXAMPLES[Number(target.dataset.example)];
      apply({ ...defaults(), ...example.values });
      if (window.matchMedia("(max-width: 899px)").matches) root.querySelector("#result").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (target.dataset.view) {
      ui.view = target.dataset.view;
      paint({ animate: false });
      out.querySelector(`[data-view="${ui.view}"]`)?.focus();
    } else if (target.matches("[data-copy-link]")) {
      const link = `${location.origin}${location.pathname}?${toQuery(readForm(form, ui.blocksOn)).toString()}`;
      // Phones get their own share sheet; everything else copies the link.
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.share) {
        try {
          await navigator.share({ title: document.title, text: `Take-home pay estimate: ${usd(ui.last.periodNet)} per paycheck`, url: link });
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(link);
        showToast("Link copied. Anyone who opens it sees these inputs.");
      } catch {
        window.prompt("Copy this link", link);
      }
    } else if (target.matches("[data-copy-text]")) {
      try {
        await navigator.clipboard.writeText(summaryText(ui.last));
        showToast("Summary copied");
      } catch {
        showToast("Your browser blocked the copy");
      }
    } else if (target.matches("[data-print]")) window.print();
    else if (target.matches("[data-reset]")) {
      store(LAST_KEY, null);
      root.querySelector(".restored")?.remove();
      reset();
    }
  });

  root.addEventListener("change", (event) => {
    if (!event.target.matches("[data-elsewhere]")) return;
    ui.elsewhere = event.target.value;
    paint({ animate: false });
    root.querySelector("[data-elsewhere]")?.focus();
  });

  renderSaved();
  paint({ animate: false, force: true });
}
