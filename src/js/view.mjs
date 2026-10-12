/**
 * Turns an engine result into HTML. Pure string functions: the page generator
 * uses them to pre-render pages and the browser uses them to update the page.
 */
import { esc, pct, signed, usd, usd0 } from "./format.mjs";

export const DISCLAIMER =
  "Estimate for tax year 2026. Your real paycheck depends on your W-4, your benefits and your employer's payroll system. This is education, not tax, payroll or financial advice.";

const CHART_PARTS = [
  ["keep", "Take-home pay"],
  ["federal", "Federal income tax"],
  ["fica", "Social Security and Medicare"],
  ["state", "State taxes"],
  ["local", "Local taxes"],
  ["benefits", "Retirement and benefits"],
  ["expenses", "Business expenses"],
];

const SECTIONS = [
  ["gross", "Pay"],
  ["pretax", "Before-tax deductions"],
  ["tax", "Taxes"],
  ["posttax", "After-tax deductions"],
];

export function chartParts(result) {
  const gross = result.chart.gross || 0;
  const parts = CHART_PARTS.map(([key, label]) => {
    const amount = result.chart[key] || 0;
    return { key, label, amount, share: gross > 0 ? amount / gross : 0 };
  }).filter((part) => part.amount > 0.004);
  const sum = parts.reduce((total, part) => total + part.share, 0);
  if (sum > 1.0001) for (const part of parts) part.share /= sum;
  return parts;
}

export function resultPlace(result) {
  const state = result.state?.name || "No state selected";
  const local = result.localTaxes?.[0]?.jurisdiction;
  return local && local !== "Custom" ? `${local.replace(/,.*$/, "")}, ${state}` : state;
}

/** The big figure for a view: "period" (one paycheck), "month" or "year". */
export function netFor(result, view) {
  if (view === "year") return result.annual.net;
  if (view === "month") return result.annual.net / 12;
  return result.periodNet;
}

const VIEW_LABEL = { period: "per paycheck", month: "per month", year: "per year" };

function donut(parts) {
  // r = 15.9155 makes the circumference 100, so shares are percentages of the dash.
  let offset = 25;
  const rings = parts
    .map((part) => {
      const size = Math.max(0, part.share * 100);
      const ring = `<circle class="seg-${part.key}" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5.2" stroke-dasharray="${size.toFixed(3)} ${(100 - size).toFixed(3)}" stroke-dashoffset="${offset.toFixed(3)}"></circle>`;
      offset -= size;
      return ring;
    })
    .join("");
  return `<svg class="donut" viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9155" fill="none" class="donut-track" stroke-width="5.2"></circle>${rings}</svg>`;
}

export function renderChart(result) {
  const parts = chartParts(result);
  if (!parts.length) return "";
  const keep = parts.find((part) => part.key === "keep");
  const keepShare = keep ? keep.share : 0;
  const legend = parts
    .map(
      (part) =>
        `<li><span class="dot seg-${part.key}" aria-hidden="true"></span><span class="legend-name">${esc(part.label)}</span><span class="legend-pct">${(part.share * 100).toFixed(1)}%</span><span class="legend-amt">${usd0(part.amount)}</span></li>`,
    )
    .join("");
  const summary = parts.map((part) => `${part.label} ${(part.share * 100).toFixed(1)}%`).join(", ");
  return `<section class="where" aria-label="Where your pay goes">
    <h3>Where each dollar goes</h3>
    <div class="where-row">
      <div class="donut-wrap" role="img" aria-label="${esc(summary)}">${donut(parts)}<div class="donut-center"><strong>${(keepShare * 100).toFixed(0)}%</strong><span>kept</span></div></div>
      <ul class="legend">${legend}</ul>
    </div>
  </section>`;
}

function lineRow(line) {
  const amounts = `<span class="amt">${usd(line.period)}</span><span class="amt yr">${usd0(line.annual)}</span>`;
  const sign = line.section === "gross" ? "" : "minus";
  if (!line.why) {
    return `<div class="line ${sign}"><span class="line-name"><span class="dot tone-${esc(line.tone)}" aria-hidden="true"></span>${esc(line.label)}</span>${amounts}</div>`;
  }
  const source = line.source ? `<span class="src">${esc(line.source)}</span>` : "";
  return `<details class="line ${sign}" data-keep="line-${esc(line.id)}"><summary><span class="line-name"><span class="dot tone-${esc(line.tone)}" aria-hidden="true"></span>${esc(line.label)}</span>${amounts}</summary><p class="line-why">${esc(line.why)} ${source}</p></details>`;
}

export function renderLines(result) {
  const groups = SECTIONS.map(([section, label]) => {
    const lines = result.lines.filter((line) => (section === "pretax" ? line.section === "pretax" || line.section === "expense" : line.section === section));
    if (!lines.length) return "";
    return `<div class="line-group"><h4>${esc(label)}</h4>${lines.map(lineRow).join("")}</div>`;
  }).join("");
  const net = result.lines.find((line) => line.id === "net");
  return `<section class="lines" aria-label="Paycheck line by line">
    <div class="lines-head"><h3>Line by line</h3><span class="col">Per paycheck</span><span class="col yr">Per year</span></div>
    ${groups}
    <div class="line total"><span class="line-name">Take-home pay</span><span class="amt">${usd(net.period)}</span><span class="amt yr">${usd0(net.annual)}</span></div>
    <p class="fine">Tap a line to see how it was worked out. Each paycheck is the year's figure divided by ${result.periods} and rounded to the cent.</p>
  </section>`;
}

function stepsTable(title, steps) {
  if (!steps?.length) return "";
  const rows = steps
    .map((step) => `<tr class="${step.total ? "sum" : ""}"><th scope="row">${esc(step.label)}</th><td class="num">${step.amount < 0 ? `−${usd(Math.abs(step.amount))}` : usd(step.amount)}</td></tr>`)
    .join("");
  return `<div class="math-block"><h4>${esc(title)}</h4><table class="math"><tbody>${rows}</tbody></table></div>`;
}

export function renderMath(result) {
  const federal = stepsTable("Federal income tax for the year", result.math?.federal);
  const state = result.state?.wageTax ? stepsTable(`${result.state.name} income tax for the year`, result.math?.state) : "";
  if (!federal && !state) return "";
  return `<details class="fold math-fold" data-keep="math"><summary>Show the math</summary><div class="math-grid">${federal}${state}</div></details>`;
}

export function renderNotes(result, { limit = 6 } = {}) {
  const warnings = result.warnings.map((text) => `<li class="warn">${esc(text)}</li>`).join("");
  const notes = result.notes.slice(0, limit).map((text) => `<li>${esc(text)}</li>`).join("");
  if (!warnings && !notes) return "";
  return `<section class="notes" aria-label="Notes on this estimate"><h3>Good to know</h3><ul>${warnings}${notes}</ul></section>`;
}

export function renderSources(result) {
  if (!result.sources?.length) return "";
  const items = result.sources
    .map((src) => (src.url ? `<li><a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a></li>` : `<li>${esc(src.name)}</li>`))
    .join("");
  return `<details class="fold sources-fold" data-keep="sources"><summary>Sources for these figures</summary><ul class="sources">${items}</ul></details>`;
}

/**
 * @param {object} opts
 * @param {boolean} [opts.sample]   the figures come from the example pay, not the visitor's
 * @param {string}  [opts.view]     period | month | year
 * @param {number}  [opts.keepNext] share of the next $1,000 kept (0 to 1)
 * @param {number}  [opts.hoursPerYear] paid hours in the year, for the hourly equivalent
 */
export function renderHeadline(result, { sample = false, view = "period", keepNext = null, hoursPerYear = 2080 } = {}) {
  const place = resultPlace(result);
  const tabs = ["period", "month", "year"]
    .map((id) => `<button type="button" role="tab" aria-selected="${id === view ? "true" : "false"}" data-view="${id}">${id === "period" ? "Paycheck" : id === "month" ? "Month" : "Year"}</button>`)
    .join("");
  const gross = view === "year" ? result.annual.gross : view === "month" ? result.annual.gross / 12 : result.grossPeriod;
  const taxShare = result.effectiveTaxRate;
  const perHour = hoursPerYear > 0 ? result.annual.net / hoursPerYear : 0;
  const stats = [
    `<div class="stat"><span class="stat-label">You keep</span><strong>${usd(result.keepPer100)}</strong><span class="stat-sub">of every $100 earned</span></div>`,
    `<div class="stat"><span class="stat-label">Taxes take</span><strong>${(taxShare * 100).toFixed(1)}%</strong><span class="stat-sub">of gross pay, ${usd0(result.annual.taxes)} a year</span></div>`,
    keepNext == null
      ? ""
      : `<div class="stat"><span class="stat-label">Of your next $1,000</span><strong>${usd0(keepNext * 1000)}</strong><span class="stat-sub">is yours to keep</span></div>`,
    perHour > 0 ? `<div class="stat"><span class="stat-label">After tax, an hour is worth</span><strong>${usd(perHour)}</strong><span class="stat-sub">at ${Math.round(hoursPerYear).toLocaleString("en-US")} paid hours a year</span></div>` : "",
  ].join("");
  return `<header class="result-head">
      <div>
        <p class="eyebrow">Estimated take-home pay · 2026</p>
        <p class="result-where">${esc(result.frequencyLabel)} pay · ${esc(result.filingLabel)} · ${esc(place)}</p>
      </div>
      ${sample ? `<span class="flag">Example</span>` : ""}
    </header>
    <div class="net">
      <div class="view-tabs" role="tablist" aria-label="Show take-home pay per">${tabs}</div>
      <p class="net-figure"><span data-net>${usd(netFor(result, view))}</span> <small data-net-unit>${VIEW_LABEL[view]}</small></p>
      <p class="net-sub">from <span data-gross>${usd(gross)}</span> before taxes${view === "period" ? ` · ${result.periods} paychecks a year` : ""}</p>
    </div>
    <div class="stats">${stats}</div>`;
}

export function renderResult(result, opts = {}) {
  return `${renderHeadline(result, opts)}
    ${renderChart(result)}
    ${renderLines(result)}
    ${renderMath(result)}
    ${renderNotes(result)}
    ${renderSources(result)}`;
}

/** A two-result comparison table. `rows` picks what to show. */
export function compareTable(a, b, { labelA = "A", labelB = "B", perPeriod = true } = {}) {
  const fica = (r) => r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;
  const rows = [
    ["Gross pay", a.annual.gross, b.annual.gross],
    ["Federal income tax", a.annual.federalIncome + a.annual.extraWithholding, b.annual.federalIncome + b.annual.extraWithholding],
    ["Social Security and Medicare", fica(a), fica(b)],
    ["State income tax", a.annual.stateIncome, b.annual.stateIncome],
    ["State payroll programs", a.annual.statePayroll, b.annual.statePayroll],
    ["Local tax", a.annual.local, b.annual.local],
    ["Retirement and benefits", a.annual.pretax + a.annual.posttax, b.annual.pretax + b.annual.posttax],
  ].filter(([, x, y]) => Math.abs(x) > 0.004 || Math.abs(y) > 0.004);
  const body = rows
    .map(([label, x, y]) => `<tr><th scope="row">${esc(label)}</th><td class="num">${usd0(x)}</td><td class="num">${usd0(y)}</td><td class="num diff">${signed(y - x)}</td></tr>`)
    .join("");
  const period = perPeriod
    ? `<tr><th scope="row">Take-home per paycheck</th><td class="num">${usd(a.periodNet)}</td><td class="num">${usd(b.periodNet)}</td><td class="num diff">${signed(b.periodNet - a.periodNet, 2)}</td></tr>`
    : "";
  return `<div class="table-wrap"><table class="compare">
    <thead><tr><th scope="col">For the year</th><th scope="col" class="num">${esc(labelA)}</th><th scope="col" class="num">${esc(labelB)}</th><th scope="col" class="num">Difference</th></tr></thead>
    <tbody>${body}
      <tr class="sum"><th scope="row">Take-home pay</th><td class="num">${usd0(a.annual.net)}</td><td class="num">${usd0(b.annual.net)}</td><td class="num diff">${signed(b.annual.net - a.annual.net)}</td></tr>
      ${period}
      <tr><th scope="row">Kept of every $100</th><td class="num">${usd(a.keepPer100)}</td><td class="num">${usd(b.keepPer100)}</td><td class="num diff">${signed(b.keepPer100 - a.keepPer100, 2)}</td></tr>
    </tbody></table></div>`;
}

export function summaryText(result) {
  const lines = result.lines.map((line) => `${line.label}: ${usd(line.period)} per paycheck (${usd(line.annual)} a year)`);
  return [
    "LocalTakehome estimate, tax year 2026",
    `${result.frequencyLabel} pay · ${result.filingLabel} · ${resultPlace(result)}`,
    `Take-home pay: ${usd(result.periodNet)} per paycheck, ${usd(result.annual.net / 12)} a month, ${usd(result.annual.net)} a year`,
    `You keep ${usd(result.keepPer100)} of every $100. Taxes take ${(result.effectiveTaxRate * 100).toFixed(1)}% of gross pay.`,
    "",
    ...lines,
    "",
    ...result.warnings,
    ...result.notes,
    "",
    DISCLAIMER,
    "https://localtakehome.com/",
  ].join("\n");
}

export function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2400);
}

export { pct };
