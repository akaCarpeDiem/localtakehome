/**
 * The calculator's form model: field values, the link format, the conversion
 * to engine input, and the form markup. No DOM access, so the page generator
 * can pre-render the same markup the browser uses.
 */
import { PERIODS, calculateTakeHome } from "./engine.mjs";
import { esc, num, signed, usd, usd0 } from "./format.mjs";

function localsForState(tables, stateId) {
  return (tables.local.jurisdictions || []).filter((row) => row.state === stateId && row.method !== "reference").sort((a, b) => a.name.localeCompare(b.name));
}

function sortedStates(tables) {
  return [...tables.states.states].sort((a, b) => a.name.localeCompare(b.name));
}

export const SAMPLE = { salary: 85000, hourly: 25 };

export const EXAMPLES = [
  { label: "$60k in Texas", values: { gross: "60000", state: "TX" } },
  { label: "$85k in California", values: { gross: "85000", state: "CA" } },
  { label: "$85k, lives in NYC", values: { gross: "85000", state: "NY", local: "nyc" } },
  { label: "$75k in Philadelphia", values: { gross: "75000", state: "PA", local: "philadelphia" } },
  { label: "$22 an hour in Florida", values: { payType: "hourly", rate: "22", state: "FL" } },
  { label: "$120k with 10% to a 401(k)", values: { gross: "120000", state: "TX", k401: "10" } },
  { label: "Married, two kids, $110k in Ohio", values: { gross: "110000", state: "OH", status: "mfj", kids: "2" } },
];

const STATUS_OPTIONS = [
  ["single", "Single"],
  ["mfj", "Married filing jointly"],
  ["mfs", "Married filing separately"],
  ["hoh", "Head of household"],
];

const FREQ_OPTIONS = [
  ["weekly", "Weekly", "Weekly"],
  ["biweekly", "Every 2 weeks", "2 weeks"],
  ["semimonthly", "Twice a month", "2× month"],
  ["monthly", "Monthly", "Monthly"],
];

/** Every field with its default. Strings stay strings so the form shows what was typed. */
export function defaults(preset = {}) {
  return {
    payType: "salary",
    unit: "year",
    gross: "",
    rate: "",
    hours: "40",
    weeks: "52",
    ot: "",
    otm: "1.5",
    hoursBasis: "week",
    blocks: [],
    frequency: "biweekly",
    status: "single",
    state: "CA",
    local: "",
    lives: true,
    kids: "",
    deps: "",
    k401: "",
    k401mode: "percent",
    roth: "",
    rothmode: "percent",
    hsa: "",
    health: "",
    dental: "",
    vision: "",
    fsa: "",
    commuter: "",
    pretax: "",
    pretaxfica: false,
    union: "",
    posttax: "",
    bonus: "",
    tips: "",
    otp: "",
    wd: true,
    extra: "",
    jobs: false,
    credits: "",
    oinc: "",
    oded: "",
    custom: "",
    workState: "",
    emp: "w2",
    exp: "",
    ...preset,
  };
}

/* ───────────── rate blocks in a link ───────────── */

export function encodeBlocks(blocks) {
  return blocks
    .map((block) => `${block.hours}x${block.rate}${block.overtime ? "o" : ""}${block.differential ? "d" : ""}:${encodeURIComponent(block.label || "Base")}`)
    .join(";");
}

export function decodeBlocks(raw) {
  if (!raw) return [];
  return String(raw)
    .split(";")
    .map((part) => {
      const colon = part.indexOf(":");
      const left = colon === -1 ? part : part.slice(0, colon);
      const labelEnc = colon === -1 ? "Base" : part.slice(colon + 1);
      const match = /^([0-9.]+)x([0-9.]+)([od]*)$/.exec(left);
      if (!match) return null;
      let label = labelEnc || "Base";
      try {
        label = decodeURIComponent(labelEnc) || "Base";
      } catch {
        /* keep the raw label */
      }
      return { label: label.slice(0, 40), hours: match[1], rate: match[2], overtime: match[3].includes("o"), differential: match[3].includes("d") };
    })
    .filter(Boolean)
    .slice(0, 24);
}

/* ───────────── link <-> values ───────────── */

// [link key, field, default]. Older links used the same keys, so they keep working.
const TEXT_PARAMS = [
  ["hours", "hours", "40"],
  ["weeks", "weeks", "52"],
  ["ot", "ot", ""],
  ["otm", "otm", "1.5"],
  ["freq", "frequency", "biweekly"],
  ["status", "status", "single"],
  ["local", "local", ""],
  ["kids", "kids", ""],
  ["deps", "deps", ""],
  ["k401", "k401", ""],
  ["k401mode", "k401mode", "percent"],
  ["roth", "roth", ""],
  ["rothmode", "rothmode", "percent"],
  ["hsa", "hsa", ""],
  ["health", "health", ""],
  ["dental", "dental", ""],
  ["vision", "vision", ""],
  ["fsa", "fsa", ""],
  ["commuter", "commuter", ""],
  ["pretax", "pretax", ""],
  ["union", "union", ""],
  ["posttax", "posttax", ""],
  ["bonus", "bonus", ""],
  ["tips", "tips", ""],
  ["otp", "otp", ""],
  ["extra", "extra", ""],
  ["depcredit", "credits", ""],
  ["oinc", "oinc", ""],
  ["oded", "oded", ""],
  ["custom", "custom", ""],
  ["exp", "exp", ""],
  ["work", "workState", ""],
];

const INPUT_KEYS = new Set(["pay", "type", "blocks", "basis", "unit", "state", "live", "emp", "pretaxfica", "jobs", "wd", ...TEXT_PARAMS.map(([key]) => key)]);

/** True when the link carries calculator inputs (and not just ?embed=1 or a campaign tag). */
export function queryHasInputs(q) {
  for (const key of q.keys()) if (INPUT_KEYS.has(key)) return true;
  return false;
}

function clean(text, max = 24) {
  return String(text ?? "").slice(0, max);
}

export function fromQuery(q, preset = {}) {
  const v = defaults(preset);
  const blocks = decodeBlocks(q.get("blocks") || "");
  if (blocks.length) {
    v.blocks = blocks;
    v.payType = "hourly";
  } else if (q.get("type") === "hourly" || q.get("type") === "salary") v.payType = q.get("type");
  const pay = q.get("pay");
  if (pay != null) {
    if (v.payType === "hourly") v.rate = clean(pay);
    else v.gross = clean(pay);
  }
  const basis = q.get("basis");
  if (basis === "period") {
    v.hoursBasis = "period";
    v.unit = "period";
  }
  if (["year", "month", "period"].includes(q.get("unit"))) v.unit = q.get("unit");
  for (const [key, field] of TEXT_PARAMS) {
    if (q.has(key)) v[field] = clean(q.get(key), field === "local" ? 60 : 24);
  }
  if (q.get("state")) v.state = clean(q.get("state"), 2).toUpperCase();
  if (q.get("live") === "0") v.lives = false;
  if (q.get("live") === "1") v.lives = true;
  if (q.get("emp") === "contractor") v.emp = "contractor";
  if (q.get("pretaxfica") === "1") v.pretaxfica = true;
  if (q.get("jobs") === "1") v.jobs = true;
  if (q.get("wd") === "0") v.wd = false;
  if (!PERIODS[v.frequency]) v.frequency = "biweekly";
  if (!STATUS_OPTIONS.some(([id]) => id === v.status)) v.status = "single";
  return v;
}

export function toQuery(v) {
  const base = defaults();
  const q = new URLSearchParams();
  if (v.payType === "hourly") {
    q.set("type", "hourly");
    if (v.blocks?.length) q.set("blocks", encodeBlocks(v.blocks));
    else if (num(v.rate)) q.set("pay", String(num(v.rate)));
    if (v.hoursBasis === "period") q.set("basis", "period");
  } else {
    if (num(v.gross)) q.set("pay", String(num(v.gross)));
    if (v.unit !== "year") q.set("unit", v.unit);
  }
  if (v.state) q.set("state", v.state);
  for (const [key, field, fallback] of TEXT_PARAMS) {
    const value = String(v[field] ?? "").trim();
    if (!value || value === fallback || value === String(base[field])) continue;
    if (v.payType !== "hourly" && ["hours", "weeks", "ot", "otm"].includes(key)) continue;
    if (v.blocks?.length && ["hours", "ot", "otm"].includes(key)) continue;
    q.set(key, value);
  }
  if (v.local && !v.lives) q.set("live", "0");
  if (v.emp === "contractor") q.set("emp", "contractor");
  if (v.pretaxfica) q.set("pretaxfica", "1");
  if (v.jobs) q.set("jobs", "1");
  if (v.wd === false) q.set("wd", "0");
  return q;
}

/* ───────────── values -> engine ───────────── */

export function isBlank(v) {
  if (v.payType === "hourly") {
    if (v.blocks?.length) return !v.blocks.some((block) => num(block.hours) > 0 && num(block.rate) > 0);
    return !(num(v.rate) > 0);
  }
  return !(num(v.gross) > 0) && !(num(v.bonus) > 0) && !(num(v.tips) > 0);
}

/** Paid hours in a year, for the "an hour is worth" figure. */
export function hoursPerYear(v) {
  if (v.payType !== "hourly") return 2080;
  const periods = PERIODS[v.frequency] || 26;
  const scale = v.hoursBasis === "period" ? periods : num(v.weeks) || 52;
  if (v.blocks?.length) return v.blocks.reduce((sum, block) => sum + num(block.hours), 0) * scale;
  return (num(v.hours) + num(v.ot)) * scale;
}

/**
 * @param {object} v form values
 * @param {{sample?: boolean}} [opts] sample: fill the example pay when the pay field is empty
 */
export function toEngineInput(v, { sample = false } = {}) {
  const periods = PERIODS[v.frequency] || 26;
  const retirement = (value, mode) => ({ mode: mode === "dollar" ? "dollar" : "percent", value: mode === "dollar" ? num(value) : Math.min(100, num(value)) });
  const input = {
    payType: v.payType === "hourly" ? "hourly" : "salary",
    employment: v.emp === "contractor" ? "contractor" : "w2",
    frequency: v.frequency,
    filingStatus: v.status,
    state: v.state,
    localId: v.local,
    livesInPlace: v.lives !== false,
    customLocalPercent: Math.min(100, num(v.custom)),
    workState: v.workState || "",
    childrenUnder17: Math.min(20, num(v.kids)),
    otherDependents: Math.min(20, num(v.deps)),
    bonusAnnual: num(v.bonus),
    tipsAnnual: num(v.tips),
    workerDeductions: v.wd !== false,
    contractorExpensesAnnual: num(v.exp),
    deductions: {
      traditional401k: retirement(v.k401, v.k401mode),
      roth401k: retirement(v.roth, v.rothmode),
      hsa: num(v.hsa),
      health: num(v.health),
      dental: num(v.dental),
      vision: num(v.vision),
      fsa: num(v.fsa),
      commuter: num(v.commuter),
      customPretax: num(v.pretax),
      customPretaxReducesFica: Boolean(v.pretaxfica),
      union: num(v.union),
      customPosttax: num(v.posttax),
    },
    w4: {
      multipleJobs: Boolean(v.jobs),
      dependentsCredit: num(v.credits),
      otherIncome: num(v.oinc),
      deductions: num(v.oded),
      extraWithholdingPerPeriod: num(v.extra),
    },
  };

  if (input.payType === "hourly") {
    const rate = num(v.rate) || (sample ? SAMPLE.hourly : 0);
    const multiplier = num(v.otm) > 0 ? num(v.otm) : 1.5;
    if (v.blocks?.length) {
      input.rateBlocks = v.blocks.map((block) => ({ label: block.label, hours: num(block.hours), rate: num(block.rate), overtime: Boolean(block.overtime), differential: Boolean(block.differential) }));
      input.rateBlockUnit = v.hoursBasis === "period" ? "period" : "week";
      input.weeksPerYear = num(v.weeks) || 52;
    } else if (v.hoursBasis === "period") {
      // Hours typed for one paycheck: repeat that paycheck for the year.
      const hours = num(v.hours);
      const overtime = num(v.ot);
      input.payType = "salary";
      input.grossAnnual = (rate * hours + rate * multiplier * overtime) * periods;
      input.overtimePremiumAnnual = rate * Math.min(0.5, Math.max(0, multiplier - 1)) * overtime * periods;
    } else {
      input.hourlyRate = rate;
      input.hoursPerWeek = v.hours === "" ? 40 : num(v.hours);
      input.weeksPerYear = num(v.weeks) || 52;
      input.overtimeHoursPerWeek = num(v.ot);
      input.overtimeMultiplier = multiplier;
    }
  } else {
    const amount = num(v.gross) || (sample ? SAMPLE.salary : 0);
    const scale = v.unit === "month" ? 12 : v.unit === "period" ? periods : 1;
    input.grossAnnual = num(v.gross) ? amount * scale : amount;
    if (v.otp !== "" && num(v.otp) > 0) input.overtimePremiumAnnual = num(v.otp);
  }
  return input;
}

/* ───────────── markup ───────────── */

function option(value, label, selected) {
  return `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`;
}

function radio(name, value, current, label) {
  return `<label><input type="radio" name="${name}" value="${value}"${current === value ? " checked" : ""}><span>${label}</span></label>`;
}

function money(name, label, value, { hint = "", suffix = "", id = "" } = {}) {
  return `<label class="field"><span class="label">${label}</span><span class="control"><span class="affix">$</span><input name="${name}"${id ? ` id="${id}"` : ""} inputmode="decimal" autocomplete="off" value="${esc(value)}">${suffix ? `<span class="affix">${suffix}</span>` : ""}</span>${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}

export function stateOptions(tables, selected) {
  return sortedStates(tables)
    .map((state) => option(state.id, state.name, selected))
    .join("");
}

export function localOptions(tables, stateId, selected) {
  const locals = localsForState(tables, stateId);
  if (!locals.length) return "";
  return `<option value="">None</option>${locals.map((row) => option(row.id, row.name.replace(/, (Indiana|Maryland|Ohio|Missouri|Delaware)$/, ""), selected)).join("")}`;
}

export function blockRowHTML(block, index, perPeriod) {
  const presets = ["Base", "Night", "Weekend", "Holiday", "Hazard", "OT", "Night + OT"];
  const known = presets.includes(block.label);
  return `<div class="block" data-block="${index}">
    <div class="block-top">
      <label class="field"><span class="label">What it is</span><select data-block-label>${presets.map((name) => option(name, name === "OT" ? "Overtime" : name === "Night + OT" ? "Night overtime" : name, known ? block.label : "")).join("")}${option("Custom", "Something else", known ? "" : "Custom")}</select></label>
      <button type="button" class="link-btn" data-block-remove aria-label="Remove this line">Remove</button>
    </div>
    <label class="field"${known ? " hidden" : ""} data-block-custom-wrap><span class="label">Name</span><span class="control"><input data-block-custom maxlength="40" autocomplete="off" value="${esc(known ? "" : block.label)}"></span></label>
    <div class="grid-2">
      <label class="field"><span class="label">${perPeriod ? "Hours this paycheck" : "Hours a week"}</span><span class="control"><input data-block-hours inputmode="decimal" autocomplete="off" value="${esc(block.hours ?? "")}"><span class="affix">hr</span></span></label>
      <label class="field"><span class="label">Pay for those hours</span><span class="control"><span class="affix">$</span><input data-block-rate inputmode="decimal" autocomplete="off" value="${esc(block.rate ?? "")}"><span class="affix">/hr</span></span></label>
    </div>
    <div class="block-flags">
      <label class="check"><input type="checkbox" data-block-ot${block.overtime ? " checked" : ""}><span>Overtime</span></label>
      <label class="check"><input type="checkbox" data-block-diff${block.differential ? " checked" : ""}><span>Shift differential</span></label>
    </div>
  </div>`;
}

export function formHTML(tables, v) {
  const hourly = v.payType === "hourly";
  const perPeriod = v.hoursBasis === "period";
  const locals = localOptions(tables, v.state, v.local);
  const state = tables.states.states.find((row) => row.id === v.state);
  const local = (tables.local.jurisdictions || []).find((row) => row.id === v.local);
  const showLives = Boolean(local) && local.appliesWhen !== "work" && (local.appliesWhen === "resident-or-work" || v.lives === false);
  const blocksOn = hourly && v.blocks?.length > 0;
  const openBenefits = [v.k401, v.roth, v.hsa, v.health, v.dental, v.vision, v.fsa, v.commuter, v.pretax, v.union, v.posttax].some((x) => String(x || "") !== "");
  const openExtra = [v.bonus, v.tips, v.otp].some((x) => String(x || "") !== "") || v.wd === false;
  const openW4 = [v.extra, v.credits, v.oinc, v.oded, v.custom, v.workState, v.exp].some((x) => String(x || "") !== "") || v.jobs || v.emp === "contractor" || v.openW4 === true;
  return `<form class="calc-form" id="calc-form" novalidate autocomplete="off">
    <div class="seg" role="radiogroup" aria-label="How you are paid">
      ${radio("payType", "salary", v.payType, "Salary")}
      ${radio("payType", "hourly", v.payType, "Hourly")}
    </div>

    <div data-when="salary"${hourly ? " hidden" : ""}>
      <label class="field big">
        <span class="label" id="pay-label">Your pay before taxes</span>
        <span class="control"><span class="affix">$</span><input name="gross" id="pay-field" inputmode="decimal" autocomplete="off" placeholder="${SAMPLE.salary.toLocaleString("en-US")}" value="${esc(v.gross)}" aria-labelledby="pay-label">
          <select name="unit" aria-label="Pay period for this amount">${option("year", "a year", v.unit)}${option("month", "a month", v.unit)}${option("period", "a paycheck", v.unit)}</select></span>
        <span class="error" data-error="gross" role="alert"></span>
      </label>
    </div>

    <div data-when="hourly"${hourly ? "" : " hidden"}>
      <div data-when="single-rate"${blocksOn ? " hidden" : ""}>
        <div class="grid-2">
          <label class="field big"><span class="label">Hourly pay</span><span class="control"><span class="affix">$</span><input name="rate" id="rate-field" inputmode="decimal" autocomplete="off" placeholder="${SAMPLE.hourly}" value="${esc(v.rate)}"><span class="affix">/hr</span></span></label>
          <label class="field big"><span class="label" data-hours-label>${perPeriod ? "Hours this paycheck" : "Hours a week"}</span><span class="control"><input name="hours" inputmode="decimal" autocomplete="off" value="${esc(v.hours)}"><span class="affix">hr</span></span></label>
        </div>
        <div class="grid-2">
          <label class="field"><span class="label" data-ot-label>${perPeriod ? "Overtime hours this paycheck" : "Overtime hours a week"}</span><span class="control"><input name="ot" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v.ot)}"><span class="affix">hr</span></span></label>
          <label class="field"><span class="label">Overtime pays</span><span class="control"><input name="otm" inputmode="decimal" autocomplete="off" value="${esc(v.otm)}"><span class="affix">× rate</span></span></label>
        </div>
      </div>
      <div class="blocks" data-when="blocks"${blocksOn ? "" : " hidden"}>
        <p class="hint">One line for each rate you are paid: regular hours, nights, weekends, overtime. Each line is hours times its own dollar rate.</p>
        <div data-block-list>${blocksOn ? v.blocks.map((block, index) => blockRowHTML(block, index, perPeriod)).join("") : ""}</div>
        <p class="block-total" data-block-total></p>
        <div class="row-actions"><button type="button" class="btn ghost small" data-block-add>Add another rate</button><button type="button" class="link-btn" data-block-off>Use one rate instead</button></div>
      </div>
      <div class="grid-2">
        <label class="field" data-when="weeks"${perPeriod ? " hidden" : ""}><span class="label">Paid weeks a year</span><span class="control"><input name="weeks" inputmode="decimal" autocomplete="off" value="${esc(v.weeks)}"><span class="affix">wk</span></span></label>
        <label class="field"><span class="label">Hours above are for</span><select name="hoursBasis">${option("week", "One week", v.hoursBasis)}${option("period", "One paycheck", v.hoursBasis)}</select></label>
      </div>
      <button type="button" class="link-btn" data-block-on${blocksOn ? " hidden" : ""}>Paid different rates for nights, weekends or overtime? Add them line by line</button>
      <span class="error" data-error="hourly" role="alert"></span>
    </div>

    <fieldset class="field">
      <legend class="label">How often you are paid</legend>
      <div class="seg four" role="radiogroup" aria-label="How often you are paid">${FREQ_OPTIONS.map(([id, label, short]) => radio("frequency", id, v.frequency, label === short ? label : `<span class="long">${label}</span><span class="short" aria-hidden="true">${short}</span>`)).join("")}</div>
    </fieldset>

    <div class="grid-2">
      <label class="field"><span class="label">State you live in</span><select name="state">${stateOptions(tables, v.state)}</select></label>
      <label class="field"><span class="label">Filing status</span><select name="status">${STATUS_OPTIONS.map(([id, label]) => option(id, label, v.status)).join("")}</select></label>
    </div>

    <div data-local-wrap${locals ? "" : " hidden"}>
      <label class="field"><span class="label">City or county income tax</span><select name="local">${locals}</select>
        <span class="hint" data-local-hint>${locals ? "Local income tax is added only when you pick a place." : ""}</span></label>
      <label class="check" data-lives-wrap${showLives ? "" : " hidden"}><input type="checkbox" name="lives"${v.lives !== false ? " checked" : ""}><span>I live there. Untick if you only work there.</span></label>
    </div>
    <p class="hint quiet" data-nolocal${locals ? " hidden" : ""}><span data-nolocal-state>${state ? `${esc(state.name)} has no city or county income tax in this calculator.` : ""}</span> If yours has one, add the percent under “W-4 and other details”.</p>

    <div class="grid-2">
      <label class="field"><span class="label">Children under 17</span><span class="control"><input name="kids" inputmode="numeric" autocomplete="off" placeholder="0" value="${esc(v.kids)}"></span></label>
      <label class="field"><span class="label">Other dependents</span><span class="control"><input name="deps" inputmode="numeric" autocomplete="off" placeholder="0" value="${esc(v.deps)}"></span></label>
    </div>

    <details class="fold" data-fold="benefits"${openBenefits ? " open" : ""}>
      <summary>Retirement and benefits <span class="fold-sub">401(k), HSA, health insurance</span></summary>
      <div class="grid-2">
        <label class="field"><span class="label">Traditional 401(k)</span><span class="control"><input name="k401" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v.k401)}"><select name="k401mode" aria-label="401(k) amount is">${option("percent", "% of pay", v.k401mode)}${option("dollar", "$ a year", v.k401mode)}</select></span></label>
        <label class="field"><span class="label">Roth 401(k)</span><span class="control"><input name="roth" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v.roth)}"><select name="rothmode" aria-label="Roth amount is">${option("percent", "% of pay", v.rothmode)}${option("dollar", "$ a year", v.rothmode)}</select></span></label>
      </div>
      <p class="hint">A 403(b), 457 or TSP works the same way as a 401(k) here. Amounts below are for the whole year.</p>
      <div class="grid-2">
        ${money("health", "Health insurance premium", v.health)}
        ${money("hsa", "HSA", v.hsa)}
        ${money("dental", "Dental premium", v.dental)}
        ${money("vision", "Vision premium", v.vision)}
        ${money("fsa", "Health FSA", v.fsa)}
        ${money("commuter", "Commuter benefits", v.commuter)}
        ${money("pretax", "Other before-tax deduction", v.pretax)}
        ${money("union", "Union dues", v.union)}
        ${money("posttax", "Other after-tax deduction", v.posttax)}
      </div>
      <label class="check"><input type="checkbox" name="pretaxfica"${v.pretaxfica ? " checked" : ""}><span>The other before-tax deduction also lowers Social Security and Medicare</span></label>
    </details>

    <details class="fold" data-fold="extra"${openExtra ? " open" : ""}>
      <summary>Bonus, tips and overtime <span class="fold-sub">including the new federal deductions</span></summary>
      <div class="grid-2">
        ${money("bonus", "Bonus this year", v.bonus)}
        ${money("tips", "Tips this year", v.tips)}
      </div>
      <div data-when="salary"${hourly ? " hidden" : ""}>${money("otp", "Overtime premium this year", v.otp, { hint: "Only the extra half of time-and-a-half. For hourly pay it is worked out from your overtime hours." })}</div>
      <label class="check"><input type="checkbox" name="wd"${v.wd !== false ? " checked" : ""}><span>Apply the federal deductions for tips and overtime (2025 to 2028)</span></label>
    </details>

    <details class="fold" data-fold="w4"${openW4 ? " open" : ""}>
      <summary>W-4 and other details <span class="fold-sub">second job, extra withholding, contractor</span></summary>
      <label class="check"><input type="checkbox" name="jobs"${v.jobs ? " checked" : ""}><span>Two jobs, or a spouse who also works (W-4 Step 2 box)</span></label>
      <div class="grid-2">
        ${money("extra", "Extra federal withholding", v.extra, { suffix: "/check" })}
        ${money("credits", "Other tax credits this year", v.credits)}
        ${money("oinc", "Other income this year", v.oinc)}
        ${money("oded", "Deductions above the standard", v.oded)}
      </div>
      <label class="field"><span class="label">A local income tax that is not in the list</span><span class="control"><input name="custom" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(v.custom)}"><span class="affix">% of pay</span></span><span class="hint">Replaces the city or county above.</span></label>
      <label class="field"><span class="label">State you work in, if different</span><select name="workState"><option value="">Same state</option>${stateOptions(tables, v.workState)}</select></label>
      <div class="seg" role="radiogroup" aria-label="Type of work">
        ${radio("emp", "w2", v.emp, "Employee (W-2)")}
        ${radio("emp", "contractor", v.emp, "Contractor (1099)")}
      </div>
      <div data-when="contractor"${v.emp === "contractor" ? "" : " hidden"}>${money("exp", "Business expenses this year", v.exp)}</div>
    </details>

    <details class="fold" data-fold="saved">
      <summary>Saved on this device</summary>
      <div class="save-row"><label class="field"><span class="label">Name this estimate</span><span class="control"><input name="scenarioName" autocomplete="off" maxlength="40" placeholder="Austin offer"></span></label><button type="button" class="btn ghost small" data-save>Save</button></div>
      <div data-saved class="saved-list"></div>
      <p class="hint">Saved in this browser only. Nothing is sent anywhere.</p>
    </details>
  </form>`;
}

/** Small "what if" answers under the result, worked out with the same engine. */
export function whatIfHTML(tables, v, result, elsewhereId) {
  const base = toEngineInput(v, { sample: true });
  const run = (patch) => calculateTakeHome({ ...base, ...patch }, tables);
  const cards = [];
  const contractor = base.employment === "contractor";

  // A raise of $5,000 (or $1 an hour).
  if (base.payType === "hourly" && !base.rateBlocks?.length) {
    const more = run({ hourlyRate: base.hourlyRate + 1 });
    const gain = more.annual.net - result.annual.net;
    const grossGain = more.annual.gross - result.annual.gross;
    if (grossGain > 0) cards.push(["A $1 an hour raise", `${signed(gain)} a year`, `You keep ${usd0((gain / grossGain) * 100)} of each extra $100.`]);
  } else if (!base.rateBlocks?.length) {
    const more = run({ grossAnnual: (base.grossAnnual || 0) + 5000 });
    const gain = more.annual.net - result.annual.net;
    cards.push(["A $5,000 raise", `${signed(gain)} a year`, `You keep ${usd0(gain / 50)} of each extra $100.`]);
  }

  if (!contractor) {
    const k = base.deductions.traditional401k;
    const step = result.annual.gross * 0.01;
    if (step > 0) {
      const current = k.mode === "percent" ? (result.annual.gross * k.value) / 100 : k.value;
      const more = run({ deductions: { ...base.deductions, traditional401k: { mode: "dollar", value: current + step } } });
      const cost = result.annual.net - more.annual.net;
      cards.push(["1% more into a 401(k)", `${usd0(step)} saved a year`, `Take-home falls by only ${usd(cost / result.periods)} a paycheck, because the tax bill drops too.`]);
    }
    const bonus = run({ bonusAnnual: (base.bonusAnnual || 0) + 5000 });
    cards.push(["A $5,000 bonus", `${usd0(bonus.annual.net - result.annual.net)} after tax`, "Employers often withhold more than this up front; the difference comes back at tax time."]);
  }

  const other = elsewhereId && elsewhereId !== v.state ? elsewhereId : v.state === "TX" ? "CA" : "TX";
  const there = run({ state: other, localId: "", customLocalPercent: 0, workState: "" });
  const diff = there.annual.net - result.annual.net;
  const otherName = tables.states.states.find((row) => row.id === other)?.name || other;
  const q = new URLSearchParams();
  q.set("a.state", v.state);
  if (v.local) q.set("a.local", v.local);
  q.set("b.state", other);
  if (base.payType !== "hourly" && base.grossAnnual) q.set("salary", String(Math.round(base.grossAnnual)));
  if (v.status !== "single") q.set("status", v.status);

  return `<section class="whatif" aria-label="What if">
    <h3>What if</h3>
    <div class="whatif-grid">${cards.map(([title, figure, text]) => `<div class="whatif-card"><span class="whatif-title">${esc(title)}</span><strong>${esc(figure)}</strong><span class="whatif-text">${esc(text)}</span></div>`).join("")}
      <div class="whatif-card else"><label class="whatif-title" for="elsewhere">The same pay in</label><select id="elsewhere" data-elsewhere>${stateOptions(tables, other)}</select><strong class="${diff >= 0 ? "pos" : "neg"}">${Math.abs(diff) < 0.5 ? "the same take-home" : `${signed(diff)} a year`}</strong><span class="whatif-text">${esc(otherName)}, with no city tax. <a href="/compare/?${esc(q.toString())}">Compare side by side</a></span></div>
    </div>
  </section>`;
}

export function actionsHTML() {
  return `<div class="actions">
    <button type="button" class="btn solid" data-copy-link>Copy a link to this estimate</button>
    <button type="button" class="btn ghost" data-copy-text>Copy as text</button>
    <button type="button" class="btn ghost" data-print>Print</button>
    <button type="button" class="link-btn" data-reset>Start over</button>
  </div>`;
}

export function shellHTML(tables, v, resultHTML, afterHTML, opts = {}) {
  const examples = opts.examples === false ? "" : `<div class="examples" role="group" aria-label="Try an example">${EXAMPLES.map((example, index) => `<button type="button" class="chip" data-example="${index}">${esc(example.label)}</button>`).join("")}</div>`;
  return `${examples}<div class="calc">
    <div class="calc-in">${formHTML(tables, v)}</div>
    <div class="calc-out" id="result">
      <div data-result>${resultHTML}</div>
      <div data-whatif>${afterHTML}</div>
      ${actionsHTML()}
      <p class="disclaimer">Estimate for tax year 2026. Your real paycheck depends on your W-4, your benefits and your employer's payroll system. This is education, not tax, payroll or financial advice.</p>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-live></p>`;
}
