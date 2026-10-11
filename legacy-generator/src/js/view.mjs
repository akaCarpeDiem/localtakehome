import { esc, usd } from "./format.mjs";

const CHART_ORDER = [
  ["keep", "You keep", "keep"],
  ["federal", "Federal", "federal"],
  ["fica", "FICA", "fica"],
  ["state", "State", "state"],
  ["local", "Local", "local"],
  ["benefits", "Benefits", "benefit"],
  ["expenses", "Expenses", "expense"],
];

const SECTION_LABELS = {
  gross: "Gross",
  pretax: "Pre-tax",
  expense: "Pre-tax",
  tax: "Taxes",
  posttax: "Post-tax",
  net: "Net",
};

const SECTION_ORDER = ["gross", "pretax", "expense", "tax", "posttax", "net"];

export function chartParts(result) {
  const gross = result.chart.gross || 0;
  const parts = CHART_ORDER.map(([key, label, tone]) => {
    const amount = result.chart[key] || 0;
    return {
      key,
      label,
      tone,
      amount,
      share: gross > 0 ? amount / gross : 0,
    };
  }).filter((part) => part.amount > 0.004);
  // When benefits + tax exceed gross (e.g. near-100% deferral), rescale so the donut stays valid.
  const sum = parts.reduce((total, part) => total + part.share, 0);
  if (sum > 1.0001) {
    for (const part of parts) part.share = part.share / sum;
  }
  return parts;
}

function groupLines(lines) {
  const groups = [];
  const bySection = new Map();
  for (const section of SECTION_ORDER) bySection.set(section, []);
  for (const line of lines) {
    const key = bySection.has(line.section) ? line.section : "tax";
    bySection.get(key).push(line);
  }
  // Merge expense into pretax display group when both exist, preserve order
  const pretaxLines = [...bySection.get("pretax"), ...bySection.get("expense")];
  const display = [
    ["gross", bySection.get("gross")],
    ["pretax", pretaxLines],
    ["tax", bySection.get("tax")],
    ["posttax", bySection.get("posttax")],
    ["net", bySection.get("net")],
  ];
  for (const [section, items] of display) {
    if (!items.length) continue;
    groups.push({ section, label: SECTION_LABELS[section] || section, lines: items });
  }
  return groups;
}

function renderLine(line) {
  const why = line.why ? `<div class="line-why">${esc(line.why)}</div>` : "";
  const source = line.source ? `<span class="chip-src">${esc(line.source)}</span>` : "";
  return `<div class="stub-line ${esc(line.section)}">
        <span class="tick ${esc(line.tone)}" aria-hidden="true"></span>
        <div>
          <div class="line-label">${esc(line.label)}</div>
          ${why}
          ${source}
        </div>
        <div class="amounts">
          <span class="line-amt">${usd(line.period)}</span>
          <small>${usd(line.annualized)} / yr</small>
        </div>
      </div>`;
}

export function renderStub(result, { sample = false } = {}) {
  const groups = groupLines(result.lines);
  const grouped = groups
    .map((group, index) => {
      const rule = index > 0 ? `<div class="stub-group-rule" aria-hidden="true"></div>` : "";
      const header = `<div class="stub-section" role="presentation"><span>${esc(group.label)}</span></div>`;
      return `${rule}${header}${group.lines.map(renderLine).join("")}`;
    })
    .join("");

  const sources = [];
  const seen = new Set();
  for (const line of result.lines) {
    if (!line.source || seen.has(line.source)) continue;
    seen.add(line.source);
    sources.push(line.source);
  }
  const sourceRow = sources.length
    ? `<div class="source-chips" aria-label="Sources">${sources
        .map((src) => `<span class="chip-src">${esc(src)}</span>`)
        .join("")}</div>`
    : "";

  const place = result.state?.name || "No state selected";
  const localName = result.lines.find((line) => line.tone === "local")?.label;
  const where = localName ? `${place} · ${localName}` : place;
  const flag = sample
    ? `<span class="sample-flag">Enter pay</span>`
    : `<span class="meta">Educational estimate</span>`;

  return `<article class="stub" aria-labelledby="stub-title">
    <div class="stub-head">
      <div>
        <p class="stub-kicker" id="stub-title">Estimated stub · Tax year 2026</p>
        <p class="meta">${esc(result.frequencyLabel)} · ${esc(result.filingLabel)} · ${esc(where)}</p>
      </div>
      ${flag}
    </div>
    <div class="net-block">
      <p class="net-label">Net this paycheck</p>
      <p class="net-figure" data-net>${usd(result.periodNet)}</p>
      <p class="net-sub">${usd(result.monthlyNet)} a month · ${usd(result.annualizedNet)} across ${result.periods} checks</p>
    </div>
    <div class="medal">
      <span>You keep</span>
      <strong>${usd(result.keepPer100)} of each $100</strong>
    </div>
    <p class="meta">Effective tax ${(result.effectiveTaxRate * 100).toFixed(1)}% of gross. Benefits you chose are not counted as tax.</p>
    ${grouped}
    ${sourceRow}
    <p class="meta" style="margin-top:10px">This period is the annual estimate divided by ${result.periods} and rounded to the cent. The year column is that paycheck times ${result.periods}, so the stub adds up.</p>
  </article>`;
}

export function renderChart(result) {
  const parts = chartParts(result);
  const empty = !parts.length;
  const display = empty
    ? CHART_ORDER.filter(([key]) => ["keep", "federal", "fica", "state", "local"].includes(key)).map(
        ([key, label, tone]) => ({ key, label, tone, amount: 0, share: 0 }),
      )
    : parts;
  let cursor = 0;
  const stops = empty
    ? ["var(--rule) 0% 100%"]
    : display.map((part) => {
        const start = cursor * 100;
        cursor += part.share;
        const end = cursor * 100;
        const color = `var(--${part.tone === "benefit" ? "benefit" : part.tone === "expense" ? "expense" : part.key === "keep" ? "accent" : part.key === "federal" ? "ink" : part.key === "fica" ? "fica" : part.key === "state" ? "state" : "local"})`;
        return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      });
  const legend = display
    .map(
      (part) => `<li>
        <span class="swatch ${esc(part.tone)}" aria-hidden="true"></span>
        <span>${esc(part.label)}</span>
        <span class="legend-val">${(part.share * 100).toFixed(1)}% · ${usd(part.amount)}</span>
      </li>`,
    )
    .join("");
  const bar = empty
    ? `<span class="empty" style="width:100%"></span>`
    : display.map((part) => `<span class="${esc(part.tone)}" style="width:${(part.share * 100).toFixed(3)}%"></span>`).join("");
  const keep = display.find((part) => part.key === "keep");
  const keepDollars = empty ? 0 : (keep?.share || 0) * 100;
  const label = empty
    ? "Enter pay to see where each $100 of gross goes."
    : `Where each $100 of gross goes. You keep ${usd(keepDollars)}.`;
  return `<section class="chart">
    <h3>Where each $100 goes</h3>
    <div class="chart-row">
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops.join(",")})" role="img" aria-label="${esc(label)}"></div>
        <div class="donut-label" aria-hidden="true"><span class="donut-center">${usd(keepDollars)}<small>kept</small></span></div>
      </div>
      <ul class="legend">${legend}</ul>
    </div>
    <div class="bar" aria-hidden="true">${bar}</div>
  </section>`;
}

export function renderNotes(result) {
  const warnings = result.warnings.map((text) => `<p class="warn">${esc(text)}</p>`).join("");
  const assumptionItems =
    Array.isArray(result.assumptions) && result.assumptions.length
      ? result.assumptions
      : (result.notes || []).slice(0, 4);
  const assumptions = assumptionItems.length
    ? `<aside class="assumptions" aria-labelledby="assumptions-title">
      <h3 id="assumptions-title">Assumptions</h3>
      <ul>${assumptionItems.map((text) => `<li>${esc(text)}</li>`).join("")}</ul>
    </aside>`
    : "";
  const notePool =
    Array.isArray(result.assumptions) && result.assumptions.length
      ? result.notes.filter((text) => !result.assumptions.includes(text)).slice(0, 4)
      : [];
  const notes = notePool.map((text) => `<p class="note">${esc(text)}</p>`).join("");
  const more =
    result.notes.length > 4 && !(Array.isArray(result.assumptions) && result.assumptions.length)
      ? `<p class="meta">${result.notes.length - 4} more notes are in the downloaded summary.</p>`
      : "";
  const quarterly = result.quarterlySetAside
    ? `<p class="note">A rough quarterly set-aside is ${usd(result.quarterlySetAside)}. That is income tax plus self-employment tax divided by four. It is not a 1040-ES voucher.</p>`
    : "";
  return `${warnings}${assumptions}${quarterly}${notes}${more}
    <p class="disclaimer">Estimate for tax year 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules. Not tax, payroll, or financial advice.</p>`;
}

export function resultJurisdiction(result) {
  const state = result.state?.name || "No state selected";
  const local = result.lines.find((line) => line.tone === "local")?.label;
  return local ? `${state}, ${local}` : state;
}

export function resultLineSummary(result) {
  const bits = ["federal", "FICA"];
  if ((result.annual?.stateIncome || 0) > 0.004 || (result.annual?.statePayroll || 0) > 0.004) bits.push("state");
  if ((result.annual?.local || 0) > 0.004) bits.push("local");
  return bits.join(", ");
}

export function summaryText(result) {
  const place = resultJurisdiction(result);
  const majors = resultLineSummary(result);
  const lines = result.lines.map((line) => `${line.label}: ${usd(line.period)} this check (${usd(line.annualized)} annualized)`);
  return [
    `LocalTakehome estimate · tax year 2026`,
    `${result.frequencyLabel} · ${result.filingLabel} · ${place}`,
    `Major lines: ${majors}.`,
    `Net this paycheck: ${usd(result.periodNet)}`,
    `You keep ${usd(result.keepPer100)} of each $100.`,
    `Effective tax ${(result.effectiveTaxRate * 100).toFixed(1)}%.`,
    "",
    ...lines,
    "",
    "Estimate for tax year 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules. Not tax, payroll, or financial advice.",
    ...result.notes,
  ].join("\n");
}

export function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2200);
}
