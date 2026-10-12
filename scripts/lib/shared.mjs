/** Helpers the page builders share: figures from the engine, tables, links. */
import { calculateTakeHome, keepOfNext, stateBrackets } from "../../src/js/engine.mjs";
import { commas, esc, pct, slugify, usd, usd0 } from "../../src/js/format.mjs";
import { defaults, hoursPerYear, shellHTML, toEngineInput, whatIfHTML } from "../../src/js/calc-form.mjs";
import { renderResult } from "../../src/js/view.mjs";
import { renderTool, toolValues } from "../../src/js/tools.mjs";

export { commas, esc, pct, slugify, usd, usd0 };

export const SALARY_STEPS = [30000, 40000, 50000, 60000, 75000, 85000, 100000, 125000, 150000, 200000, 250000];
export const STATE_SALARY_PAGES = [30000, 40000, 50000, 60000, 70000, 75000, 80000, 90000, 100000, 120000, 150000, 200000];
export const NATIONAL_SALARY_PAGES = [20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 130000, 140000, 150000, 175000, 200000, 250000, 300000, 400000, 500000];
export const HOURLY_PAGES = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 32, 35, 38, 40, 45, 50, 55, 60, 75, 100];

export const NEIGHBORS = {
  AL: ["FL", "GA", "MS", "TN"], AK: ["WA", "OR", "HI"], AZ: ["CA", "NV", "NM", "UT", "CO"], AR: ["LA", "MS", "MO", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR", "WA", "TX"], CO: ["KS", "NE", "NM", "OK", "UT", "WY"], CT: ["MA", "NY", "RI", "NJ"], DE: ["MD", "NJ", "PA"],
  DC: ["MD", "VA"], FL: ["AL", "GA", "TX", "NC"], GA: ["AL", "FL", "NC", "SC", "TN"], HI: ["CA", "WA", "NV"], ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IN", "IA", "KY", "MO", "WI"], IN: ["IL", "KY", "MI", "OH"], IA: ["IL", "MN", "MO", "NE", "SD", "WI"], KS: ["CO", "MO", "NE", "OK"],
  KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"], LA: ["AR", "MS", "TX"], ME: ["NH", "MA", "VT"], MD: ["DE", "DC", "PA", "VA", "WV"],
  MA: ["CT", "NH", "NY", "RI", "VT"], MI: ["IN", "OH", "WI", "IL"], MN: ["IA", "ND", "SD", "WI"], MS: ["AL", "AR", "LA", "TN"],
  MO: ["AR", "IL", "IA", "KS", "KY", "NE", "OK", "TN"], MT: ["ID", "ND", "SD", "WY"], NE: ["CO", "IA", "KS", "MO", "SD", "WY"], NV: ["AZ", "CA", "ID", "OR", "UT"],
  NH: ["ME", "MA", "VT"], NJ: ["DE", "NY", "PA", "CT"], NM: ["AZ", "CO", "OK", "TX", "UT"], NY: ["CT", "MA", "NJ", "PA", "VT"],
  NC: ["GA", "SC", "TN", "VA"], ND: ["MN", "MT", "SD"], OH: ["IN", "KY", "MI", "PA", "WV"], OK: ["AR", "CO", "KS", "MO", "NM", "TX"],
  OR: ["CA", "ID", "NV", "WA"], PA: ["DE", "MD", "NJ", "NY", "OH", "WV"], RI: ["CT", "MA", "NY"], SC: ["GA", "NC", "FL"], SD: ["IA", "MN", "MT", "NE", "ND", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MS", "MO", "NC", "VA"], TX: ["AR", "LA", "NM", "OK", "FL"], UT: ["AZ", "CO", "ID", "NV", "NM", "WY"], VT: ["MA", "NH", "NY"],
  VA: ["DC", "KY", "MD", "NC", "TN", "WV"], WA: ["ID", "OR", "CA"], WV: ["KY", "MD", "OH", "PA", "VA"], WI: ["IL", "IA", "MI", "MN"], WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

export function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function stateSlug(state) {
  return `${slugify(state.name)}-paycheck-calculator`;
}

export function statePath(state) {
  return `/${stateSlug(state)}/`;
}

/** "$60,000" -> "60000"; used in /salary/60000/ */
export function salaryPath(amount, state) {
  return state ? `/salary/${amount}/${slugify(state.name)}/` : `/salary/${amount}/`;
}

export function hourlyPath(rate) {
  return `/hourly/${rate}/`;
}

export function kLabel(amount) {
  return usd0(amount);
}

/** Everything the page builders need, made once per build. */
export function makeContext(tables) {
  const states = [...tables.states.states].sort((a, b) => a.name.localeCompare(b.name));
  const byId = Object.fromEntries(states.map((state) => [state.id, state]));
  const slugs = Object.fromEntries(states.map((state) => [state.id, stateSlug(state)]));
  const locals = tables.local.jurisdictions.filter((row) => row.method !== "reference");
  const run = (input) => calculateTakeHome({ payType: "salary", frequency: "biweekly", filingStatus: "single", ...input }, tables);
  const verified = [tables.federal.lastVerified, tables.states.lastVerified, tables.local.lastVerified].sort().at(-1);
  return { tables, states, byId, slugs, locals, run, verified, verifiedLong: longDate(verified) };
}

/** The calculator, pre-rendered with a preset. The browser picks it up from the same markup. */
export function calculatorBlock(ctx, preset = {}, { examples = true } = {}) {
  const v = defaults(preset);
  const input = toEngineInput(v, { sample: true });
  const result = calculateTakeHome(input, ctx.tables);
  const resultHTML = renderResult(result, { sample: true, keepNext: keepOfNext(input, ctx.tables), hoursPerYear: hoursPerYear(v) });
  const presetAttr = Object.keys(preset).length ? ` data-preset="${esc(JSON.stringify(preset))}"` : "";
  return `<noscript><p class="noscript">The calculator needs JavaScript to update. The example below and the tables on this page still show real 2026 figures.</p></noscript>
<div id="calculator"${presetAttr}${examples ? "" : ' data-examples="off"'}>${shellHTML(ctx.tables, v, resultHTML, whatIfHTML(ctx.tables, v, result, null), { examples })}</div>`;
}

export function toolBlock(ctx, id, overrides = {}) {
  const v = { ...toolValues(id, null), ...overrides };
  const attr = Object.keys(overrides).length ? ` data-defaults="${esc(JSON.stringify(overrides))}"` : "";
  return `<noscript><p class="noscript">This calculator needs JavaScript to update. The example below shows real 2026 figures.</p></noscript>
<div class="tool" id="tool" data-tool="${id}"${attr}>${renderTool(id, ctx.tables, v)}</div>
<p class="tool-share"><button type="button" class="link-btn" data-tool-link>Copy a link to these numbers</button></p>`;
}

/* ───────────── tables ───────────── */

const fica = (r) => r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;

/**
 * Take-home pay at a list of salaries.
 * @param {(amount:number)=>string} [link] href for the salary cell
 */
export function takeHomeTable(ctx, base, { amounts = SALARY_STEPS, link = null, caption = "" } = {}) {
  const results = amounts.map((amount) => ({ amount, r: ctx.run({ ...base, grossAnnual: amount }) }));
  const hasPayroll = results.some(({ r }) => r.annual.statePayroll > 0.004);
  const hasLocal = results.some(({ r }) => r.annual.local > 0.004);
  const hasState = results.some(({ r }) => r.annual.stateIncome > 0.004);
  const rows = results
    .map(({ amount, r }) => {
      const label = link ? `<a href="${link(amount)}">${usd0(amount)}</a>` : usd0(amount);
      return `<tr><th scope="row">${label}</th><td class="num">${usd0(r.annual.federalIncome)}</td><td class="num">${usd0(fica(r))}</td>${hasState ? `<td class="num">${usd0(r.annual.stateIncome)}</td>` : ""}${hasPayroll ? `<td class="num">${usd0(r.annual.statePayroll)}</td>` : ""}${hasLocal ? `<td class="num">${usd0(r.annual.local)}</td>` : ""}<td class="num strong">${usd0(r.annual.net)}</td><td class="num">${usd0(r.annual.net / 12)}</td><td class="num">${usd(r.periodNet)}</td></tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table>
    ${caption ? `<caption>${caption}</caption>` : ""}
    <thead><tr><th scope="col">Salary</th><th scope="col" class="num">Federal income tax</th><th scope="col" class="num">Social Security and Medicare</th>${hasState ? '<th scope="col" class="num">State income tax</th>' : ""}${hasPayroll ? '<th scope="col" class="num">State payroll</th>' : ""}${hasLocal ? '<th scope="col" class="num">Local tax</th>' : ""}<th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th><th scope="col" class="num">Every 2 weeks</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

export function bracketRows(brackets) {
  return brackets
    .map((row, index) => {
      const next = brackets[index + 1];
      const range = next ? `${usd0(row.over)} to ${usd0(next.over)}` : `Over ${usd0(row.over)}`;
      return `<tr><th scope="row">${index === 0 && next ? `Up to ${usd0(next.over)}` : range}</th><td class="num">${pct(row.rate, 3)}</td></tr>`;
    })
    .join("");
}

export function bracketTable(brackets, caption) {
  return `<div class="table-wrap narrow"><table><caption>${esc(caption)}</caption><thead><tr><th scope="col">Taxable income</th><th scope="col" class="num">Rate</th></tr></thead><tbody>${bracketRows(brackets)}</tbody></table></div>`;
}

/** The bracket tables a state needs: one per distinct schedule. */
export function stateBracketTables(state) {
  if (!state.wageTax) return "";
  const labels = { single: "Single", mfj: "Married filing jointly", hoh: "Head of household", mfs: "Married filing separately" };
  const seen = new Map();
  for (const status of ["single", "mfj", "hoh", "mfs"]) {
    const key = JSON.stringify(stateBrackets(state, status));
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(labels[status]);
  }
  const groups = [...seen.entries()];
  if (groups.length === 1) return bracketTable(JSON.parse(groups[0][0]), `${state.name} income tax rates for 2026, all filing statuses`);
  return `<div class="table-pair">${groups.map(([key, names]) => bracketTable(JSON.parse(key), `${state.name} rates for 2026: ${names.join(", ").toLowerCase()}`)).join("")}</div>`;
}

export function sourcesList(sources) {
  return `<ul class="sources">${sources.map((src) => `<li><a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a></li>`).join("")}</ul>`;
}

/** Top marginal rate of a state's single schedule, or 0. */
export function topRate(state) {
  if (!state.wageTax) return 0;
  const rows = stateBrackets(state, "single");
  let top = Math.max(...rows.map((row) => row.rate));
  if (state.params?.surtax) top += state.params.surtax.rate;
  return top;
}

export function lowRate(state) {
  if (!state.wageTax) return 0;
  const rates = stateBrackets(state, "single").map((row) => row.rate).filter((rate) => rate > 0);
  return Math.min(...rates);
}

export function rateLabel(state) {
  if (!state.wageTax) return "No tax on wages";
  const top = topRate(state);
  const low = lowRate(state);
  return state.type === "flat" || Math.abs(top - low) < 1e-9 ? `${pct(top, 3)} flat` : `${pct(low, 3)} to ${pct(top, 3)}`;
}

export function cardGrid(items) {
  return `<div class="card-grid">${items.map((item) => `<a class="card-link" href="${item.href}"><strong>${esc(item.label)}</strong>${item.blurb ? `<span>${esc(item.blurb)}</span>` : ""}</a>`).join("")}</div>`;
}

export function linkList(items, cls = "link-cloud") {
  return `<p class="${cls}">${items.map((item) => `<a href="${item.href}">${esc(item.label)}</a>`).join(" ")}</p>`;
}

/** How each state treats the federal tips and overtime deductions, as a sentence built from the rate file. */
export function tipsOvertimeSentence(ctx) {
  const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] || "");
  const label = (state) => `${state.name}${state.params?.tipsOvertimeYears && state.params.tipsOvertimeYears !== "2026 to 2028" ? ` (${state.params.tipsOvertimeYears})` : ""}`;
  const taxed = ctx.states.filter((state) => state.wageTax);
  const both = taxed.filter((state) => state.params?.tipsOvertimeFollowFederal).map(label);
  const tipsOnly = taxed.filter((state) => state.params?.tipsFollowFederal && !state.params?.tipsOvertimeFollowFederal).map(label);
  const own = taxed.filter((state) => state.params?.ownTipsMax || state.params?.ownOvertimeMax);
  const overtimeOnly = taxed.filter((state) => state.params?.overtimePremiumDeductionMax);
  const parts = [];
  if (both.length) parts.push(`${list(both)} also take the federal deductions for tips and overtime off state taxable income.`);
  if (tipsOnly.length) parts.push(`${list(tipsOnly)} ${tipsOnly.length > 1 ? "follow" : "follows"} the tips deduction but taxes overtime in full.`.replace("follow the tips deduction but taxes", "follow the tips deduction but tax"));
  for (const state of own) parts.push(`${state.name} excludes up to ${usd0(state.params.ownTipsMax)} of tips and up to ${usd0(state.params.ownOvertimeMax)} of overtime premium pay.`);
  for (const state of overtimeOnly) parts.push(`${state.name} lets you deduct up to ${usd0(state.params.overtimePremiumDeductionMax)} of overtime premium pay.`);
  parts.push("Every other state with an income tax still taxes tips and overtime in full.");
  return parts.join(" ");
}
