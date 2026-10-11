import { calculateTakeHome, PERIODS } from "./engine.mjs?v=20261004b";
import { getTables, localsForState, sortedStates } from "./data.mjs";
import { debounce, esc, num, tweenNumber, usd } from "./format.mjs";
import { adSlot, renderPartners } from "./partners.mjs";
import { renderChart, renderNotes, renderStub, resultJurisdiction, resultLineSummary, showToast, summaryText } from "./view.mjs";

const SCENARIO_KEY = "lth-scenarios";
const SCENARIO_KEY_LEGACY = "tth-scenarios";

const EXAMPLES = [
  { label: "$60k · Texas", values: { payType: "salary", gross: "60000", state: "TX", local: "" } },
  { label: "$85k · California", values: { payType: "salary", gross: "85000", state: "CA", local: "" } },
  { label: "$85k · NYC resident", values: { payType: "salary", gross: "85000", state: "NY", local: "nyc", lives: true } },
  { label: "$75k · Philadelphia", values: { payType: "salary", gross: "75000", state: "PA", local: "philadelphia", lives: true } },
  { label: "$20/hr · Florida", values: { payType: "hourly", rate: "20", hours: "40", state: "FL", local: "" } },
  { label: "$120k · 10% 401(k)", values: { payType: "salary", gross: "120000", state: "TX", local: "", k401: "10", k401mode: "percent" } },
  { label: "$200k · California", values: { payType: "salary", gross: "200000", state: "CA", local: "" } },
];

function params() {
  return new URLSearchParams(window.location.search);
}

function checked(name, value, current) {
  return `<input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}>`;
}

function stateOptions(tables, selected) {
  return sortedStates(tables)
    .map((state) => `<option value="${esc(state.id)}" ${state.id === selected ? "selected" : ""}>${esc(state.name)}</option>`)
    .join("");
}

function shell(tables, initial) {
  const states = stateOptions(tables, initial.state || "CA");
  return `<div class="examples" role="group" aria-label="Examples">${EXAMPLES.map(
    (example, index) => `<button type="button" class="chip" data-example="${index}">${esc(example.label)}</button>`,
  ).join("")}</div>
  <div class="product">
    <form class="inputs" id="calc-form" novalidate>
      <div class="seg" role="radiogroup" aria-label="Pay type">
        <label>${checked("payType", "salary", initial.payType)}<span>Salary</span></label>
        <label>${checked("payType", "hourly", initial.payType)}<span>Hourly</span></label>
      </div>
      <div class="seg" role="radiogroup" aria-label="Employment">
        <label>${checked("employment", "w2", initial.employment)}<span>W-2</span></label>
        <label>${checked("employment", "contractor", initial.employment)}<span>Contractor</span></label>
      </div>
      <div class="seg" role="radiogroup" aria-label="Estimate basis">
        <label>${checked("basis", "annual", initial.basis)}<span>Annual projection</span></label>
        <label>${checked("basis", "period", initial.basis)}<span>This pay period</span></label>
      </div>
      <p class="hint" data-basis-hint hidden>Enter hours and pay for one paycheck. LocalTakehome annualizes by your pay frequency for brackets, then shows this period.</p>
      <label class="field" data-salary>
        <span data-salary-label>Annual salary</span>
        <span class="control"><span class="prefix">$</span><input id="pay-field" name="gross" inputmode="decimal" autocomplete="off" value="${esc(initial.gross)}" aria-describedby="gross-error"></span>
        <span class="error" id="gross-error"></span>
      </label>
      <div data-hourly hidden>
        <div class="grid-2">
          <label class="field" data-rate-field><span>Hourly rate</span><span class="control"><span class="prefix">$</span><input name="rate" inputmode="decimal" autocomplete="off" value="${esc(initial.rate)}"></span></label>
          <label class="field" data-hours-field><span data-hours-label>Hours per week</span><span class="control"><input name="hours" inputmode="decimal" value="${esc(initial.hours)}"><span class="suffix">hr</span></span></label>
        </div>
        <div class="grid-2" data-ot-row>
          <label class="field" data-weeks><span>Paid weeks</span><span class="control"><input name="weeks" inputmode="decimal" value="${esc(initial.weeks)}"><span class="suffix">/ yr</span></span></label>
          <label class="field" data-ot-field><span data-ot-label>OT hours / week</span><span class="control"><input name="ot" inputmode="decimal" value="${esc(initial.ot)}"></span></label>
        </div>
        <label class="field" data-otm><span>Overtime multiplier</span><span class="control"><input name="otm" inputmode="decimal" value="${esc(initial.otm)}"><span class="suffix">×</span></span></label>
        <div class="rate-blocks" data-rate-blocks hidden>
          <p class="hint blocks-lead">One line per rate for the whole paycheck or week — not each shift. A 14-hour shift might be 8 hours base, 4 hours night, and 2 hours night plus overtime. Gross is hours times the dollar rate on that line. Check both boxes when those hours are overtime and a differential.</p>
          <div data-block-list></div>
          <p class="block-total" data-block-total></p>
          <div class="actions blocks-actions">
            <button type="button" class="ghost" data-add-block>Add rate block</button>
            <button type="button" class="text-btn" data-single-rate>Use one rate</button>
          </div>
        </div>
        <button type="button" class="text-btn blocks-disclose" data-open-blocks>Add rate blocks <span class="meta">night, weekend, hazard, OT</span></button>
      </div>
      <fieldset class="field" style="border:0;padding:0;margin:0 0 12px">
        <legend class="label" style="color:var(--muted);font-size:13px;margin-bottom:6px">Pay frequency</legend>
        <div class="seg four" role="radiogroup" aria-label="Pay frequency">
          ${["weekly", "biweekly", "semimonthly", "monthly"]
            .map(
              (id) =>
                `<label>${checked("frequency", id, initial.frequency)}<span>${id === "semimonthly" ? "Semi-mo" : id[0].toUpperCase() + id.slice(1)}</span></label>`,
            )
            .join("")}
        </div>
      </fieldset>
      <div class="grid-2">
        <label class="field"><span>State</span><select class="bare" name="state">${states}</select></label>
        <label class="field"><span>Filing status</span>
          <select class="bare" name="status">
            <option value="single" ${initial.status === "single" ? "selected" : ""}>Single</option>
            <option value="mfj" ${initial.status === "mfj" ? "selected" : ""}>Married filing jointly</option>
            <option value="mfs" ${initial.status === "mfs" ? "selected" : ""}>Married filing separately</option>
            <option value="hoh" ${initial.status === "hoh" ? "selected" : ""}>Head of household</option>
          </select>
        </label>
      </div>
      <label class="field"><span>City or county</span><select class="bare" name="local"></select></label>
      <p class="hint" id="local-hint"></p>
      <p class="hint" data-local-edu>Not every state has a city or county wage tax on top of state income tax. Many people only discover this when they move to or work in a place that does. Where we model them: New York (NYC, Yonkers), Pennsylvania (Philadelphia, Pittsburgh — PA has many more localities; use the custom percent for others), Ohio (Columbus, Cleveland, Cincinnati, Toledo, Akron, Dayton), Maryland (most counties plus Baltimore City; Anne Arundel is tiered; Frederick is custom), Michigan (Detroit and several other cities), Indiana (Marion and other large counties), Missouri (Kansas City, St. Louis), Delaware (Wilmington), Kentucky (Louisville / Jefferson, Lexington / Fayette), and Oregon (Portland / Multnomah). D.C. is its own income-tax jurisdiction in the state list, not a second local layer. Local rates change — if yours differs from the rate we last verified for a named place, use the custom local rate field under Local details.</p>
      <label class="switch"><input type="checkbox" name="lives" ${initial.lives ? "checked" : ""}><span>I live in this city. Uncheck if you only work there.</span></label>
      <label class="field"><span>Tax year</span><select class="bare" name="year" aria-label="Tax year"><option value="2026" selected>2026</option></select></label>
      <details class="fold" data-fold="extras" ${initial.openExtras ? "open" : ""}>
        <summary>Deductions and W-4</summary>
        <div class="grid-2">
          <label class="field"><span>Traditional 401(k)</span>
            <span class="control"><input name="k401" inputmode="decimal" value="${esc(initial.k401)}"><select name="k401mode" aria-label="401(k) units"><option value="percent" ${initial.k401mode !== "dollar" ? "selected" : ""}>%</option><option value="dollar" ${initial.k401mode === "dollar" ? "selected" : ""}>$ / yr</option></select></span>
          </label>
          <label class="field"><span>Roth 401(k)</span>
            <span class="control"><input name="roth" inputmode="decimal" value="${esc(initial.roth)}"><select name="rothmode" aria-label="Roth units"><option value="percent">%</option><option value="dollar">$ / yr</option></select></span>
          </label>
        </div>
        <div class="grid-2">
          <label class="field"><span>HSA, annual</span><span class="control"><span class="prefix">$</span><input name="hsa" inputmode="decimal" value="${esc(initial.hsa)}"></span></label>
          <label class="field"><span>Health premium, annual</span><span class="control"><span class="prefix">$</span><input name="health" inputmode="decimal" value="${esc(initial.health)}"></span></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Health FSA, annual</span><span class="control"><span class="prefix">$</span><input name="fsa" inputmode="decimal" value="${esc(initial.fsa)}"></span></label>
          <label class="field"><span>Union dues, annual</span><span class="control"><span class="prefix">$</span><input name="union" inputmode="decimal" value="${esc(initial.union)}"></span></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Dental premium, annual</span><span class="control"><span class="prefix">$</span><input name="dental" inputmode="decimal" value="${esc(initial.dental)}"></span></label>
          <label class="field"><span>Vision premium, annual</span><span class="control"><span class="prefix">$</span><input name="vision" inputmode="decimal" value="${esc(initial.vision)}"></span></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Commuter benefits, annual</span><span class="control"><span class="prefix">$</span><input name="commuter" inputmode="decimal" value="${esc(initial.commuter)}"></span></label>
          <label class="field"><span>Other pre-tax, annual</span><span class="control"><span class="prefix">$</span><input name="pretax" inputmode="decimal" value="${esc(initial.pretax)}"></span></label>
        </div>
        <label class="switch"><input type="checkbox" name="pretaxfica" ${initial.pretaxfica ? "checked" : ""}><span>Other pre-tax reduces FICA. Leave this off if it only cuts income tax.</span></label>
        <label class="field"><span>Extra federal withholding, per paycheck</span><span class="control"><span class="prefix">$</span><input name="extra" inputmode="decimal" value="${esc(initial.extra)}"></span></label>
        <label class="field"><span>W-4 Step 3 dependents credit, annual dollars</span><span class="control"><span class="prefix">$</span><input name="depcredit" inputmode="decimal" value="${esc(initial.depcredit)}"></span></label>
        <label class="switch"><input type="checkbox" name="jobs" ${initial.jobs ? "checked" : ""}><span>W-4 Step 2: multiple jobs or spouse works</span></label>
        <div class="grid-2">
          <label class="field"><span>Other income, annual</span><span class="control"><span class="prefix">$</span><input name="otherincome" inputmode="decimal" value="${esc(initial.otherincome)}"></span></label>
          <label class="field"><span>Other deductions, annual</span><span class="control"><span class="prefix">$</span><input name="otherded" inputmode="decimal" value="${esc(initial.otherded)}"></span></label>
        </div>
        <label class="field"><span>State dependent exemptions</span><span class="control"><input name="dependents" inputmode="numeric" value="${esc(initial.dependents)}"></span></label>
        <p class="hint">Health premiums are modeled as Section 125 amounts. They reduce income tax and FICA. Traditional 401(k) does not reduce FICA.</p>
      </details>
      <details class="fold" data-fold="local" ${initial.openLocal ? "open" : ""}>
        <summary>Local details, bonus, contractor</summary>
        <label class="field"><span>Custom local rate</span><span class="control"><input name="custom" inputmode="decimal" value="${esc(initial.custom)}"><span class="suffix">%</span></span></label>
        <p class="hint">Use this when your city is not in the list. It replaces the selected city and applies to gross wages.</p>
        <div class="grid-2">
          <label class="field"><span>Bonus this year</span><span class="control"><span class="prefix">$</span><input name="bonus" inputmode="decimal" value="${esc(initial.bonus)}"></span></label>
          <label class="field"><span>Tips this year</span><span class="control"><span class="prefix">$</span><input name="tips" inputmode="decimal" value="${esc(initial.tips)}"></span></label>
        </div>
        <label class="field" data-expenses><span>Contractor expenses, annual</span><span class="control"><span class="prefix">$</span><input name="expenses" inputmode="decimal" value="${esc(initial.expenses)}"></span></label>
        <label class="switch"><input type="checkbox" name="workdiff" ${initial.work ? "checked" : ""}><span>I work in a different state than I live</span></label>
        <label class="field" data-work ${initial.work ? "" : "hidden"}><span>Work state</span><select class="bare" name="workState">${stateOptions(tables, initial.workState || "")}</select></label>
      </details>
      <details class="fold">
        <summary>Saved on this browser</summary>
        <label class="field"><span>Scenario name</span><span class="control"><input name="scenarioName" autocomplete="off" placeholder="Austin offer"></span></label>
        <div class="actions" style="margin-top:0">
          <button type="button" class="ghost" data-save>Save scenario</button>
          <button type="button" class="text-btn" data-clear-scenarios>Clear all</button>
        </div>
        <div data-saved class="examples" style="margin-top:10px"></div>
      </details>
    </form>
    <div class="stub-pane">
      <div data-stub></div>
      <div data-chart></div>
      <div class="whatif" role="group" aria-label="What if">
        <button type="button" class="chip" data-what="k401">+1% 401(k)</button>
        <button type="button" class="chip" data-what="extra">+$50 withholding</button>
        <button type="button" class="chip" data-what="bonus">Bonus $5,000</button>
        <button type="button" class="chip" data-what="raise">Raise 10%</button>
        <a class="chip" data-compare href="/compare/">Compare a city</a>
        <button type="button" class="text-btn" data-reset hidden>Reset what-if</button>
      </div>
      <div class="actions">
        <button type="button" class="solid" data-copy-link>Copy link</button>
        <button type="button" class="ghost" data-copy-text>Copy summary</button>
        <button type="button" class="ghost" data-download>Download stub</button>
        <button type="button" class="ghost" data-print>Print</button>
      </div>
      <p class="meta whatif" role="navigation" aria-label="Related tools">
        <a href="/compare/">Compare offers</a> ·
        <a href="/bonus-calculator/">Bonus</a> ·
        <a href="/hourly-paycheck-calculator/">Hourly</a> ·
        <a href="/raise-calculator/">Raise</a> ·
        <a href="/401k-calculator/">401(k) impact</a> ·
        <a href="/employer-cost-calculator/">Employer cost</a>
      </p>
      <div data-notes></div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" id="calc-live"></p>`;
}

const BLOCK_PRESETS = ["Base", "Night", "Weekend", "Hazard", "OT", "Night + OT", "Custom"];
const PRESET_FLAGS = {
  Base: { overtime: false, differential: false },
  Night: { overtime: false, differential: true },
  Weekend: { overtime: false, differential: true },
  Hazard: { overtime: false, differential: true },
  OT: { overtime: true, differential: false },
  "Night + OT": { overtime: true, differential: true },
};
const ADD_ORDER = ["Night", "Weekend", "OT", "Night + OT", "Hazard", "Custom"];

function encodeBlocks(blocks) {
  return blocks
    .map((block) => {
      const flags = `${block.overtime ? "o" : ""}${block.differential ? "d" : ""}`;
      return `${block.hours}x${block.rate}${flags}:${encodeURIComponent(block.label || "Base")}`;
    })
    .join(";");
}

function decodeBlocks(raw) {
  if (!raw) return [];
  return String(raw)
    .split(";")
    .map((part) => {
      const colon = part.indexOf(":");
      const left = colon === -1 ? part : part.slice(0, colon);
      const labelEnc = colon === -1 ? "Base" : part.slice(colon + 1);
      const match = /^([0-9.]+)x([0-9.]+)([od]*)$/.exec(left);
      if (!match) return null;
      let label = "Base";
      try {
        label = decodeURIComponent(labelEnc) || "Base";
      } catch {
        label = labelEnc || "Base";
      }
      return {
        label,
        hours: match[1],
        rate: match[2],
        overtime: match[3].includes("o"),
        differential: match[3].includes("d"),
      };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function blocksOn(form) {
  return Boolean(form._blocksOn);
}

function hoursCaption(form) {
  return new FormData(form).get("basis") === "period" ? "Hours this period" : "Hours per week";
}

function readBlocks(form) {
  if (!blocksOn(form)) return [];
  return [...form.querySelectorAll("[data-block]")].map((row) => {
    const preset = row.querySelector("[data-block-label]")?.value || "Base";
    const custom = row.querySelector("[data-block-custom]")?.value?.trim() || "";
    return {
      label: preset === "Custom" ? custom || "Custom" : preset,
      hours: Math.max(0, num(row.querySelector("[data-block-hours]")?.value)),
      rate: Math.max(0, num(row.querySelector("[data-block-rate]")?.value)),
      overtime: Boolean(row.querySelector("[data-block-ot]")?.checked),
      differential: Boolean(row.querySelector("[data-block-diff]")?.checked),
    };
  });
}

function blockTemplate(row, index, hoursLabel) {
  const known = BLOCK_PRESETS.includes(row.label);
  const preset = known ? row.label : "Custom";
  const customValue = known ? "" : row.label || "";
  const options = BLOCK_PRESETS.map(
    (name) => `<option value="${esc(name)}" ${preset === name ? "selected" : ""}>${esc(name)}</option>`,
  ).join("");
  const linePay = num(row.hours) * num(row.rate);
  return `<div class="rate-block" data-block data-index="${index}">
    <div class="rate-block-top">
      <label class="field"><span>Label</span><select class="bare" data-block-label>${options}</select></label>
      <button type="button" class="text-btn" data-remove-block>Remove</button>
    </div>
    <label class="field" data-custom-wrap ${preset === "Custom" ? "" : "hidden"}><span>Custom label</span><span class="control"><input data-block-custom autocomplete="off" maxlength="40" value="${esc(customValue)}"></span></label>
    <div class="grid-2">
      <label class="field"><span data-block-hours-label>${esc(hoursLabel)}</span><span class="control"><input data-block-hours inputmode="decimal" value="${esc(row.hours ?? "")}"><span class="suffix">hr</span></span></label>
      <label class="field"><span>Rate for these hours</span><span class="control"><span class="prefix">$</span><input data-block-rate inputmode="decimal" value="${esc(row.rate ?? "")}"><span class="suffix">/hr</span></span></label>
    </div>
    <div class="rate-flags">
      <label class="switch"><input type="checkbox" data-block-ot ${row.overtime ? "checked" : ""}><span>Overtime</span></label>
      <label class="switch"><input type="checkbox" data-block-diff ${row.differential ? "checked" : ""}><span>Differential</span></label>
      <span class="meta block-line-pay" data-block-pay>${linePay ? esc(usd(linePay)) : ""}</span>
    </div>
  </div>`;
}

function updateBlockPreview(form) {
  const host = form.querySelector("[data-block-total]");
  if (!host || !blocksOn(form)) return;
  const blocks = readBlocks(form);
  const sum = blocks.reduce((total, block) => total + block.hours * block.rate, 0);
  const period = new FormData(form).get("basis") === "period";
  const weeks = num(form.elements.weeks?.value || "52") || 52;
  const periods = PERIODS[form.elements.frequency?.value] || 26;
  host.textContent = period
    ? `Gross from these lines: ${usd(sum)} this paycheck · ${usd(sum * periods)} if every check matches`
    : `Gross from these lines: ${usd(sum)} per week · ${usd(sum * weeks)} a year, before bonus and tips`;
  form.querySelectorAll("[data-block]").forEach((row) => {
    const pay = row.querySelector("[data-block-pay]");
    if (!pay) return;
    const line = num(row.querySelector("[data-block-hours]")?.value) * num(row.querySelector("[data-block-rate]")?.value);
    pay.textContent = line ? usd(line) : "";
  });
}

function renderBlocks(form) {
  const list = form.querySelector("[data-block-list]");
  if (!list) return;
  const hoursLabel = hoursCaption(form);
  list.innerHTML = (form._blockRows || []).map((row, index) => blockTemplate(row, index, hoursLabel)).join("");
  list.querySelectorAll("[data-block]").forEach((row) => {
    row.querySelector("[data-block-label]")?.addEventListener("change", () => {
      const value = row.querySelector("[data-block-label]").value;
      const wrap = row.querySelector("[data-custom-wrap]");
      if (wrap) wrap.hidden = value !== "Custom";
      const flags = PRESET_FLAGS[value];
      if (flags) {
        row.querySelector("[data-block-ot]").checked = flags.overtime;
        row.querySelector("[data-block-diff]").checked = flags.differential;
      }
      updateBlockPreview(form);
    });
    row.querySelector("[data-remove-block]")?.addEventListener("click", () => {
      const rows = readBlocks(form);
      rows.splice(Number(row.dataset.index), 1);
      if (!rows.length) {
        form._blocksOn = false;
        form._blockRows = [];
        syncBlocks(form);
        ping(form);
        return;
      }
      form._blockRows = rows;
      renderBlocks(form);
      ping(form);
    });
  });
  updateBlockPreview(form);
}

function syncBlocks(form) {
  const on = blocksOn(form);
  for (const sel of ["[data-rate-field]", "[data-hours-field]", "[data-ot-field]", "[data-otm]"]) {
    const el = form.querySelector(sel);
    if (el) el.hidden = on;
  }
  const panel = form.querySelector("[data-rate-blocks]");
  if (panel) panel.hidden = !on;
  const opener = form.querySelector("[data-open-blocks]");
  if (opener) opener.hidden = on;
  const otRow = form.querySelector("[data-ot-row]");
  if (otRow) {
    const period = new FormData(form).get("basis") === "period";
    otRow.hidden = on && period;
  }
  if (on) {
    form.querySelectorAll("[data-block-hours-label]").forEach((el) => {
      el.textContent = hoursCaption(form);
    });
    if (!form.querySelector("[data-block]")) renderBlocks(form);
    else updateBlockPreview(form);
  }
}

function openBlocks(form) {
  const rate = form.elements.rate?.value || "";
  const hours = form.elements.hours?.value || "";
  const otHours = num(form.elements.ot?.value);
  const multiplier = num(form.elements.otm?.value || "1.5") || 1.5;
  const rows = [];
  if (num(hours) > 0 || num(rate) > 0) {
    rows.push({ label: "Base", hours, rate, overtime: false, differential: false });
  }
  if (otHours > 0) {
    const otRate = Math.round(num(rate) * multiplier * 100) / 100;
    rows.push({
      label: "OT",
      hours: String(otHours),
      rate: otRate ? String(otRate) : "",
      overtime: true,
      differential: false,
    });
  }
  if (!rows.length) rows.push({ label: "Base", hours: "", rate: "", overtime: false, differential: false });
  form._blockRows = rows;
  form._blocksOn = true;
  syncBlocks(form);
  form.querySelector("[data-block-hours]")?.focus();
}

function exitBlocks(form) {
  const rows = readBlocks(form);
  const first = rows[0];
  if (first && form.elements.rate && form.elements.hours) {
    form.elements.rate.value = first.rate ? String(first.rate) : "";
    form.elements.hours.value = first.hours ? String(first.hours) : "";
  }
  if (form.elements.ot) form.elements.ot.value = "";
  form._blocksOn = false;
  form._blockRows = [];
  syncBlocks(form);
}

function addBlock(form) {
  const rows = readBlocks(form);
  const label = ADD_ORDER[Math.min(Math.max(rows.length - 1, 0), ADD_ORDER.length - 1)];
  const flags = PRESET_FLAGS[label] || { overtime: false, differential: false };
  rows.push({ label, hours: "", rate: "", ...flags });
  form._blockRows = rows;
  renderBlocks(form);
  const inputs = form.querySelectorAll("[data-block-hours]");
  inputs[inputs.length - 1]?.focus();
}

function ping(form) {
  form.dispatchEvent(new Event("input", { bubbles: true }));
}

function wireBlocks(form) {
  form.querySelector("[data-open-blocks]")?.addEventListener("click", () => {
    openBlocks(form);
    ping(form);
  });
  form.querySelector("[data-add-block]")?.addEventListener("click", () => {
    addBlock(form);
    ping(form);
  });
  form.querySelector("[data-single-rate]")?.addEventListener("click", () => {
    exitBlocks(form);
    ping(form);
  });
}

function read(form) {
  const data = new FormData(form);
  const get = (key) => String(data.get(key) ?? "");
  return {
    payType: get("payType") === "hourly" ? "hourly" : "salary",
    employment: get("employment") === "contractor" ? "contractor" : "w2",
    estimateBasis: get("basis") === "period" ? "period" : "annual",
    grossAnnual: num(get("gross")),
    hourlyRate: num(get("rate")),
    hoursPerWeek: num(get("hours") || "40"),
    weeksPerYear: num(get("weeks") || "52"),
    overtimeHoursPerWeek: num(get("ot")),
    overtimeMultiplier: num(get("otm") || "1.5"),
    rateBlocks: readBlocks(form),
    bonusAnnual: num(get("bonus")),
    tipsAnnual: num(get("tips")),
    frequency: get("frequency") || "biweekly",
    filingStatus: get("status") || "single",
    state: get("state"),
    localId: get("local"),
    livesInPlace: data.get("lives") === "on",
    customLocalPercent: Math.min(100, num(get("custom"))),
    workState: data.get("workdiff") === "on" ? get("workState") : "",
    dependentsCount: num(get("dependents")),
    contractorExpensesAnnual: num(get("expenses")),
    deductions: {
      traditional401k: {
        mode: get("k401mode") === "dollar" ? "dollar" : "percent",
        value: get("k401mode") === "dollar" ? num(get("k401")) : Math.min(100, num(get("k401"))),
      },
      roth401k: {
        mode: get("rothmode") === "dollar" ? "dollar" : "percent",
        value: get("rothmode") === "dollar" ? num(get("roth")) : Math.min(100, num(get("roth"))),
      },
      hsa: num(get("hsa")),
      health: num(get("health")),
      fsa: num(get("fsa")),
      dental: num(get("dental")),
      vision: num(get("vision")),
      commuter: num(get("commuter")),
      union: num(get("union")),
      customPretax: num(get("pretax")),
      customPretaxReducesFica: data.get("pretaxfica") === "on",
    },
    w4: {
      multipleJobs: data.get("jobs") === "on",
      dependentsCredit: num(get("depcredit")),
      otherIncome: num(get("otherincome")),
      deductions: num(get("otherded")),
      extraWithholdingPerPeriod: num(get("extra")),
    },
  };
}

function primaryBlank(input) {
  if (input.payType === "hourly") {
    if (input.rateBlocks?.length) {
      return !input.rateBlocks.some((block) => block.hours > 0 && block.rate > 0);
    }
    if (input.hourlyRate <= 0) return true;
    if (input.estimateBasis === "period") {
      return input.hoursPerWeek <= 0 && input.overtimeHoursPerWeek <= 0;
    }
    return false;
  }
  return input.grossAnnual <= 0 && input.bonusAnnual <= 0 && input.tipsAnnual <= 0;
}

/** Map UI input to engine input. Period mode annualizes one paycheck × frequency. */
function toEngineInput(input) {
  if (input.payType === "hourly" && input.rateBlocks?.length) {
    return {
      ...input,
      rateBlockUnit: input.estimateBasis === "period" ? "period" : "week",
      hourlyRate: 0,
      hoursPerWeek: 0,
      overtimeHoursPerWeek: 0,
    };
  }
  if (input.estimateBasis !== "period") return { ...input, rateBlocks: [] };
  const periods = PERIODS[input.frequency] || 26;
  if (input.payType === "hourly") {
    const periodGross =
      input.hourlyRate * input.hoursPerWeek +
      input.hourlyRate * input.overtimeMultiplier * input.overtimeHoursPerWeek;
    return {
      ...input,
      payType: "salary",
      grossAnnual: periodGross * periods + input.tipsAnnual + input.bonusAnnual,
      hourlyRate: 0,
      hoursPerWeek: 0,
      overtimeHoursPerWeek: 0,
      tipsAnnual: 0,
      bonusAnnual: 0,
    };
  }
  return {
    ...input,
    grossAnnual: input.grossAnnual * periods,
  };
}

function validate(form, input) {
  const error = form.querySelector("#gross-error");
  const gross = form.querySelector("[name=gross]");
  let message = "";
  if (input.payType === "salary" && input.grossAnnual < 0) message = "Enter a salary of zero or more.";
  if (input.payType === "hourly" && !input.rateBlocks?.length && (input.hoursPerWeek > 168 || input.hoursPerWeek < 0)) message = "Hours per week need to be between 0 and 168.";
  if (input.payType === "hourly" && input.rateBlocks?.some((block) => block.hours > 400)) message = "Each rate block needs 400 hours or fewer.";
  if (input.weeksPerYear > 53) message = "Paid weeks should be 53 or fewer.";
  // Soft notices: values are clamped in read()/engine so the stub still updates.
  const data = new FormData(form);
  const k401Raw = Number.parseFloat(String(data.get("k401") || "0").replace(/[$,]/g, ""));
  const k401Mode = data.get("k401mode") === "dollar" ? "dollar" : "percent";
  const rothRaw = Number.parseFloat(String(data.get("roth") || "0").replace(/[$,]/g, ""));
  const rothMode = data.get("rothmode") === "dollar" ? "dollar" : "percent";
  const customRaw = Number.parseFloat(String(data.get("custom") || "0").replace(/[$,]/g, ""));
  let soft = "";
  if (k401Mode === "percent" && Number.isFinite(k401Raw) && k401Raw > 100) soft = "401(k) percent is capped at 100%.";
  if (rothMode === "percent" && Number.isFinite(rothRaw) && rothRaw > 100) soft = "Roth 401(k) percent is capped at 100%.";
  if (Number.isFinite(customRaw) && customRaw > 100) soft = "Custom local rate is capped at 100%.";
  if (error) error.textContent = message || soft;
  if (gross) gross.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}

function writeQuery(input, sample) {
  const q = new URLSearchParams();
  if (input.payType === "hourly" && input.rateBlocks?.length) {
    q.set("type", "hourly");
    q.set("blocks", encodeBlocks(input.rateBlocks));
    if (input.weeksPerYear !== 52) q.set("weeks", String(input.weeksPerYear));
  } else if (!sample) {
    if (input.payType === "hourly") {
      q.set("type", "hourly");
      if (input.hourlyRate) q.set("pay", String(input.hourlyRate));
      if (input.hoursPerWeek !== 40) q.set("hours", String(input.hoursPerWeek));
      if (input.weeksPerYear !== 52) q.set("weeks", String(input.weeksPerYear));
      if (input.overtimeHoursPerWeek) q.set("ot", String(input.overtimeHoursPerWeek));
      if (input.overtimeMultiplier !== 1.5) q.set("otm", String(input.overtimeMultiplier));
    } else if (input.grossAnnual) q.set("pay", String(input.grossAnnual));
  } else if (input.payType === "hourly") q.set("type", "hourly");
  if (input.estimateBasis === "period") q.set("basis", "period");
  if (input.frequency !== "biweekly") q.set("freq", input.frequency);
  if (input.filingStatus !== "single") q.set("status", input.filingStatus);
  if (input.state) q.set("state", input.state);
  if (input.localId) q.set("local", input.localId);
  if (!input.livesInPlace) q.set("live", "0");
  if (input.employment === "contractor") q.set("emp", "contractor");
  const k = input.deductions.traditional401k;
  if (k.value) {
    q.set("k401", String(k.value));
    if (k.mode === "dollar") q.set("k401mode", "dollar");
  }
  if (input.deductions.hsa) q.set("hsa", String(input.deductions.hsa));
  if (input.deductions.health) q.set("health", String(input.deductions.health));
  if (input.deductions.dental) q.set("dental", String(input.deductions.dental));
  if (input.deductions.vision) q.set("vision", String(input.deductions.vision));
  if (input.deductions.commuter) q.set("commuter", String(input.deductions.commuter));
  if (input.deductions.customPretax) q.set("pretax", String(input.deductions.customPretax));
  if (input.deductions.customPretaxReducesFica) q.set("pretaxfica", "1");
  if (input.w4.extraWithholdingPerPeriod) q.set("extra", String(input.w4.extraWithholdingPerPeriod));
  if (input.w4.dependentsCredit) q.set("depcredit", String(input.w4.dependentsCredit));
  if (input.w4.multipleJobs) q.set("jobs", "1");
  if (input.bonusAnnual) q.set("bonus", String(input.bonusAnnual));
  if (input.customLocalPercent) q.set("custom", String(input.customLocalPercent));
  if (input.contractorExpensesAnnual) q.set("exp", String(input.contractorExpensesAnnual));
  if (input.workState) q.set("work", input.workState);
  const next = q.toString();
  const url = next ? `${location.pathname}?${next}` : location.pathname;
  if (url !== `${location.pathname}${location.search}`) history.replaceState(null, "", url);
}

function syncLocal(form, tables, selected) {
  const stateId = new FormData(form).get("state");
  const select = form.querySelector("[name=local]");
  const hint = form.querySelector("#local-hint");
  const state = tables.states.states.find((row) => row.id === stateId);
  const locals = localsForState(tables, stateId);
  if (!locals.length) {
    select.disabled = true;
    select.innerHTML = `<option value="">No local wage tax in this state</option>`;
    hint.textContent = state?.wageTax === false
      ? `${state.name} does not tax wages, and this file has no city income tax to add.`
      : "No local wage tax in this state. A custom percent is under Local details if you still need one.";
    return;
  }
  select.disabled = false;
  select.innerHTML = `<option value="">None — state tax only</option>${locals
    .map((row) => `<option value="${esc(row.id)}" ${row.id === selected ? "selected" : ""}>${esc(row.name)}</option>`)
    .join("")}`;
  hint.textContent = "Pick a city or county to add its local tax. The state alone never includes NYC, Philadelphia, Detroit, or the other named locals. If your local rate changed since we last verified it, use the custom local rate field.";
}

function loadScenarios() {
  try {
    let raw = localStorage.getItem(SCENARIO_KEY);
    if (raw == null) {
      const legacy = localStorage.getItem(SCENARIO_KEY_LEGACY);
      if (legacy != null) {
        raw = legacy;
        localStorage.setItem(SCENARIO_KEY, legacy);
      }
    }
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function clearScenarios() {
  try {
    localStorage.removeItem(SCENARIO_KEY);
    localStorage.removeItem(SCENARIO_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

function initialFrom(options) {
  const q = params();
  const preset = options.preset || {};
  const blockRows = decodeBlocks(q.get("blocks") || "");
  const pay = q.get("pay") ?? (preset.grossAnnual != null ? String(preset.grossAnnual) : "");
  const type = blockRows.length ? "hourly" : q.get("type") || preset.payType || "salary";
  return {
    payType: type,
    employment: q.get("emp") === "contractor" || preset.employment === "contractor" ? "contractor" : "w2",
    basis: q.get("basis") === "period" || preset.estimateBasis === "period" ? "period" : "annual",
    gross: type === "hourly" ? "" : pay,
    rate: type === "hourly" ? pay : "",
    hours: q.get("hours") || "40",
    weeks: q.get("weeks") || "52",
    ot: q.get("ot") || "",
    otm: q.get("otm") || "1.5",
    frequency: q.get("freq") || preset.frequency || "biweekly",
    status: q.get("status") || preset.filingStatus || "single",
    state: q.get("state") || preset.state || "CA",
    local: q.get("local") ?? preset.localId ?? "",
    lives: q.get("live") === "0" ? false : preset.livesInPlace !== false,
    k401: q.get("k401") || "",
    k401mode: q.get("k401mode") || "percent",
    roth: "",
    hsa: q.get("hsa") || "",
    health: q.get("health") || "",
    fsa: "",
    union: "",
    dental: q.get("dental") || "",
    vision: q.get("vision") || "",
    commuter: q.get("commuter") || "",
    pretax: q.get("pretax") || "",
    pretaxfica: q.get("pretaxfica") === "1",
    extra: q.get("extra") || "",
    depcredit: q.get("depcredit") || "",
    jobs: q.get("jobs") === "1",
    otherincome: "",
    otherded: "",
    dependents: "",
    custom: q.get("custom") || "",
    bonus: q.get("bonus") || "",
    tips: "",
    expenses: q.get("exp") || "",
    work: Boolean(q.get("work")),
    workState: q.get("work") || "",
    openExtras: Boolean(preset.open?.includes("w4") || q.get("k401") || q.get("extra")),
    openLocal: Boolean(preset.open?.includes("local") || q.get("custom") || q.get("bonus") || q.get("exp")),
    blocks: blockRows,
  };
}

function applyValues(form, tables, values) {
  const set = (name, value) => {
    const el = form.elements[name];
    if (!el || value == null) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  };
  const checkRadio = (name, value) => {
    if (!value) return;
    const el = form.querySelector(`[name="${name}"][value="${CSS.escape(String(value))}"]`);
    if (el) el.checked = true;
  };
  checkRadio("payType", values.payType);
  checkRadio("employment", values.employment);
  checkRadio("basis", values.basis || "annual");
  checkRadio("frequency", values.frequency);
  set("gross", values.gross ?? "");
  set("rate", values.rate ?? "");
  set("hours", values.hours ?? "40");
  set("state", values.state);
  syncLocal(form, tables, values.local || "");
  set("local", values.local || "");
  set("status", values.status || "single");
  set("lives", values.lives !== false);
  set("k401", values.k401 ?? "");
  set("k401mode", values.k401mode || "percent");
  set("bonus", values.bonus ?? "");
  set("extra", values.extra ?? "");
  if (Array.isArray(values.blocks)) {
    form._blocksOn = values.blocks.length > 0;
    form._blockRows = values.blocks.map((row) => ({ ...row }));
    const list = form.querySelector("[data-block-list]");
    if (list) list.innerHTML = "";
  }
  toggleMode(form);
}

function toggleMode(form) {
  const data = new FormData(form);
  const hourly = data.get("payType") === "hourly";
  const period = data.get("basis") === "period";
  const hourlyPeriod = hourly && period;
  form.querySelector("[data-salary]").hidden = hourly;
  form.querySelector("[data-hourly]").hidden = !hourly;
  const salaryLabel = form.querySelector("[data-salary-label]");
  if (salaryLabel) salaryLabel.textContent = period ? "Gross this paycheck" : "Annual salary";
  const hoursLabel = form.querySelector("[data-hours-label]");
  if (hoursLabel) hoursLabel.textContent = period ? "Hours this period" : "Hours per week";
  const otLabel = form.querySelector("[data-ot-label]");
  if (otLabel) otLabel.textContent = period ? "OT hours this period" : "OT hours / week";
  // Paid weeks is annual-only. In period mode, remove that field from the live
  // DOM instead of relying on hidden styling; keep the node on the form so it can
  // be restored if the user switches back to annual projection.
  const weeks = form._paidWeeksField || form.querySelector("[data-weeks]");
  if (weeks) form._paidWeeksField = weeks;
  const otm = form.querySelector("[data-otm]");
  const otRow = form.querySelector("[data-ot-row]");
  const otField = form.querySelector("[data-ot-field]");
  if (otm && otRow && otField && weeks) {
    if (period) {
      // Period: multiplier occupies the old Paid weeks slot (left cell).
      // OT hours stays in the right cell, directly under Hours this period,
      // at the same grid-2 width as the other inputs — not a full-width row.
      weeks.remove();
      otRow.insertBefore(otm, otField);
    } else {
      // Annual: restore weeks | OT hours, with multiplier full-width below.
      if (!otRow.contains(weeks)) otRow.insertBefore(weeks, otRow.firstChild);
      if (otField.parentElement !== otRow) otRow.append(otField);
      otRow.after(otm);
    }
  }
  syncBlocks(form);
  const hint = form.querySelector("[data-basis-hint]");
  if (hint) hint.hidden = !period;
  const hoursInput = form.elements.hours;
  if (hoursInput) {
    // Avoid treating annual's default 40 hrs/week as a full biweekly/monthly period.
    if (period && (hoursInput.value === "40" || hoursInput.value === "")) {
      const freq = data.get("frequency") || "biweekly";
      const periodHours = { weekly: "40", biweekly: "80", semimonthly: "86.67", monthly: "173.33" };
      hoursInput.value = periodHours[freq] || "80";
    } else if (!period && ["80", "86.67", "173.33"].includes(hoursInput.value)) {
      hoursInput.value = "40";
    }
  }
  const contractor = data.get("employment") === "contractor";
  const expenses = form.querySelector("[data-expenses]");
  if (expenses) expenses.style.display = contractor ? "" : "none";
  const work = form.querySelector("[name=workdiff]")?.checked;
  const workField = form.querySelector("[data-work]");
  if (workField) workField.hidden = !work;
}

function paint(form, tables, ui, sampleOverride) {
  const input = read(form);
  if (!validate(form, input)) return;
  const sample = sampleOverride ?? primaryBlank(input);
  const runInput = toEngineInput(input);
  const result = calculateTakeHome(runInput, tables);
  ui.stub.innerHTML = renderStub(result, { sample });
  ui.chart.innerHTML = renderChart(result);
  ui.notes.innerHTML = sample
    ? `<p class="note">Enter salary or hourly pay to replace the $0 stub. State and city still shape the estimate once pay is in.</p>${renderNotes(result)}`
    : renderNotes(result);
  renderPartners(ui.partners, runInput, sample);
  const figure = ui.stub.querySelector("[data-net]");
  if (figure) tweenNumber(figure, result.periodNet, usd);
  const bar = document.querySelector("[data-netbar]");
  if (bar) tweenNumber(bar, result.periodNet, usd);
  const freq = document.querySelector("[data-netbar-freq]");
  if (freq) freq.textContent = result.frequencyLabel || "";
  document.body.classList.toggle("has-netbar", !sample);
  const place = resultJurisdiction(result);
  const majors = resultLineSummary(result);
  ui.liveDebounced(sample
    ? `Stub shows $0 until you enter pay. Location is ${place}.`
    : `Estimated net ${usd(result.periodNet)} per paycheck for ${place}. Includes ${majors}.`);
  writeQuery(input, sample);
  const compare = form.closest(".product")?.querySelector("[data-compare]");
  if (compare) {
    const q = new URLSearchParams();
    q.set("state", input.state || "CA");
    if (input.localId) q.set("local", input.localId);
    if (!sample && input.payType === "salary" && input.grossAnnual) q.set("pay", String(input.grossAnnual));
    compare.href = `/compare?${q.toString()}`;
  }
  ui.last = result;
  ui.sample = sample;
}

function renderSaved(form, tables, ui) {
  const host = form.querySelector("[data-saved]");
  const items = loadScenarios();
  host.innerHTML = items.length
    ? items
        .map(
          (item, index) =>
            `<button type="button" class="chip" data-load="${index}">${esc(item.name)}</button><button type="button" class="text-btn" data-delete="${index}">Remove</button>`,
        )
        .join("")
    : `<span class="meta">Nothing saved yet. Scenarios stay in this browser only.</span>`;
  host.querySelectorAll("[data-load]").forEach((button) => {
    button.addEventListener("click", () => {
      applyValues(form, tables, items[Number(button.dataset.load)].values);
      paint(form, tables, ui, false);
    });
  });
  host.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = loadScenarios().filter((_, index) => index !== Number(button.dataset.delete));
      localStorage.setItem(SCENARIO_KEY, JSON.stringify(next));
      renderSaved(form, tables, ui);
    });
  });
}

export async function mountCalculator(root, options = {}) {
  root.innerHTML = `<p class="loading">Loading 2026 rate tables…</p>`;
  let tables;
  try {
    tables = await getTables();
  } catch (error) {
    root.innerHTML = `<div class="error-state"><h2>The rate tables did not load.</h2><p>Check your connection and reload. Nothing was sent to a server.</p><button class="solid" type="button" id="retry">Try again</button></div>`;
    root.querySelector("#retry")?.addEventListener("click", () => mountCalculator(root, options));
    console.error(error);
    return;
  }
  const initial = initialFrom(options);
  root.innerHTML = shell(tables, initial);
  if (!document.querySelector(".netbar")) {
    const bar = document.createElement("div");
    bar.className = "netbar";
    bar.setAttribute("role", "status");
    bar.innerHTML = `<div class="netbar-copy"><span class="netbar-label">Net this paycheck</span><strong data-netbar>$0.00</strong><span class="netbar-freq" data-netbar-freq></span></div><a class="netbar-link" href="#stub-anchor" data-view-stub>View stub</a>`;
    document.body.append(bar);
    bar.querySelector("[data-view-stub]")?.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector("[data-stub]") || document.querySelector(".stub");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const form = root.querySelector("#calc-form");
  const ui = {
    stub: root.querySelector("[data-stub]"),
    chart: root.querySelector("[data-chart]"),
    notes: root.querySelector("[data-notes]"),
    partners: root.querySelector("[data-partners]"),
    liveDebounced: debounce((text) => {
      const live = root.querySelector("#calc-live");
      if (live) live.textContent = text;
    }, 500),
    last: null,
    sample: true,
    baseline: null,
  };
  syncLocal(form, tables, initial.local);
  if (initial.blocks?.length) {
    form._blocksOn = true;
    form._blockRows = initial.blocks;
  }
  wireBlocks(form);
  toggleMode(form);
  const update = debounce(() => paint(form, tables, ui), 100);
  form.addEventListener("input", (event) => {
    if (event.target.closest("[data-block]")) updateBlockPreview(form);
    update();
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "state") syncLocal(form, tables, "");
    if (event.target.name === "payType" || event.target.name === "employment" || event.target.name === "workdiff" || event.target.name === "basis") toggleMode(form);
    update();
  });
  root.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const example = EXAMPLES[Number(button.dataset.example)];
      applyValues(form, tables, {
        frequency: "biweekly",
        status: "single",
        employment: "w2",
        basis: "annual",
        lives: true,
        hours: "40",
        blocks: [],
        ...example.values,
      });
      paint(form, tables, ui, false);
    });
  });
  const resetBtn = root.querySelector("[data-reset]");
  root.querySelectorAll("[data-what]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!ui.baseline) ui.baseline = read(form);
      const input = read(form);
      if (button.dataset.what === "k401") {
        const mode = form.elements.k401mode.value;
        const current = num(form.elements.k401.value);
        form.elements.k401.value = mode === "percent" ? String(Math.round((current + 1) * 100) / 100) : String(Math.round((input.grossAnnual || input.hourlyRate * 40 * 52) * 0.01));
        form.querySelector("[data-fold=extras]").open = true;
      }
      if (button.dataset.what === "extra") {
        form.elements.extra.value = String(num(form.elements.extra.value) + 50);
        form.querySelector("[data-fold=extras]").open = true;
      }
      if (button.dataset.what === "bonus") {
        form.elements.bonus.value = "5000";
        form.querySelector("[data-fold=local]").open = true;
      }
      if (button.dataset.what === "raise") {
        if (input.payType === "hourly" && form._blocksOn) {
          form.querySelectorAll("[data-block-rate]").forEach((el) => {
            const rate = num(el.value);
            if (rate) el.value = String(Math.round(rate * 1.1 * 100) / 100);
          });
        } else if (input.payType === "hourly") form.elements.rate.value = String(Math.round(input.hourlyRate * 1.1 * 100) / 100);
        else form.elements.gross.value = String(Math.round((input.grossAnnual || 85000) * 1.1));
      }
      resetBtn.hidden = false;
      paint(form, tables, ui, false);
    });
  });
  resetBtn.addEventListener("click", () => {
    if (!ui.baseline) return;
    const base = ui.baseline;
    applyValues(form, tables, {
      payType: base.payType,
      employment: base.employment,
      basis: base.estimateBasis || "annual",
      frequency: base.frequency,
      status: base.filingStatus,
      state: base.state,
      local: base.localId,
      lives: base.livesInPlace,
      gross: base.payType === "salary" ? String(base.grossAnnual || "") : "",
      rate: base.payType === "hourly" ? String(base.hourlyRate || "") : "",
      hours: String(base.hoursPerWeek || 40),
      blocks: base.rateBlocks || [],
      k401: String(base.deductions.traditional401k.value || ""),
      k401mode: base.deductions.traditional401k.mode,
      bonus: String(base.bonusAnnual || ""),
      extra: String(base.w4.extraWithholdingPerPeriod || ""),
    });
    ui.baseline = null;
    resetBtn.hidden = true;
    paint(form, tables, ui);
  });
  root.querySelector("[data-copy-link]").addEventListener("click", async () => {
    paint(form, tables, ui, ui.sample);
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("Link copied");
    } catch {
      showToast("Copy the address bar to share this estimate");
    }
  });
  root.querySelector("[data-copy-text]").addEventListener("click", async () => {
    if (!ui.last) return;
    try {
      await navigator.clipboard.writeText(summaryText(ui.last));
      showToast("Summary copied");
    } catch {
      showToast("Clipboard blocked");
    }
  });
  root.querySelector("[data-download]").addEventListener("click", () => {
    if (!ui.last) return;
    const blob = new Blob([summaryText(ui.last)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "localtakehome-stub.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Stub downloaded");
  });
  root.querySelector("[data-print]").addEventListener("click", () => window.print());
  form.querySelector("[data-save]").addEventListener("click", () => {
    const name = form.elements.scenarioName.value.trim() || "Saved scenario";
    const values = {
      payType: form.elements.payType.value,
      employment: form.elements.employment.value,
      basis: form.elements.basis?.value || "annual",
      frequency: form.elements.frequency.value,
      status: form.elements.status.value,
      state: form.elements.state.value,
      local: form.elements.local.value,
      lives: form.elements.lives.checked,
      gross: form.elements.gross.value,
      rate: form.elements.rate.value,
      hours: form.elements.hours.value,
      k401: form.elements.k401.value,
      k401mode: form.elements.k401mode.value,
      bonus: form.elements.bonus.value,
      extra: form.elements.extra.value,
    };
    const next = loadScenarios().filter((item) => item.name !== name).slice(0, 11);
    next.unshift({ name, values });
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(next.slice(0, 12)));
    form.elements.scenarioName.value = "";
    renderSaved(form, tables, ui);
    showToast("Saved in this browser");
  });
  form.querySelector("[data-clear-scenarios]")?.addEventListener("click", () => {
    clearScenarios();
    renderSaved(form, tables, ui);
    showToast("Saved scenarios cleared");
  });
  renderSaved(form, tables, ui);
  paint(form, tables, ui);
  window.addEventListener("popstate", () => {
    applyValues(form, tables, initialFrom(options));
    paint(form, tables, ui);
  });
}
