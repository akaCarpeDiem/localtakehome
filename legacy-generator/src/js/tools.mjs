import { calculateEmployerCost, calculateTakeHome, compareBonus, scenarioDeltas } from "./engine.mjs";
import { getTables, localsForState, sortedStates } from "./data.mjs";
import { debounce, esc, num, usd } from "./format.mjs";
import { renderChart, renderStub, showToast } from "./view.mjs";

function stateSelect(tables, name, selected) {
  const options = sortedStates(tables)
    .map((state) => `<option value="${esc(state.id)}" ${state.id === selected ? "selected" : ""}>${esc(state.name)}</option>`)
    .join("");
  return `<label class="field"><span>State</span><select class="bare" name="${name}">${options}</select></label>`;
}

function localSelect(tables, stateId, name, selected) {
  const locals = localsForState(tables, stateId);
  const options = [`<option value="">State only</option>`]
    .concat(locals.map((row) => `<option value="${esc(row.id)}" ${row.id === selected ? "selected" : ""}>${esc(row.name)}</option>`))
    .join("");
  return `<label class="field"><span>City or county</span><select class="bare" name="${name}" ${locals.length ? "" : "disabled"}>${
    locals.length ? options : `<option value="">No local wage tax</option>`
  }</select></label>`;
}

function statusSelect(selected = "single") {
  return `<label class="field"><span>Filing status</span><select class="bare" name="status">
    <option value="single" ${selected === "single" ? "selected" : ""}>Single</option>
    <option value="mfj" ${selected === "mfj" ? "selected" : ""}>Married filing jointly</option>
    <option value="mfs" ${selected === "mfs" ? "selected" : ""}>Married filing separately</option>
    <option value="hoh" ${selected === "hoh" ? "selected" : ""}>Head of household</option>
  </select></label>`;
}

function baseInput(fields) {
  return {
    payType: "salary",
    employment: "w2",
    frequency: "biweekly",
    filingStatus: fields.status || "single",
    grossAnnual: num(fields.gross),
    state: fields.state,
    localId: fields.local || "",
    livesInPlace: true,
    deductions: {},
    w4: {},
  };
}

function row(label, a, b, format = usd) {
  const delta = (Number(b) || 0) - (Number(a) || 0);
  return `<tr><th>${esc(label)}</th><td class="num">${format(a)}</td><td class="num">${format(b)}</td><td class="num">${format(delta)}</td></tr>`;
}

async function load(root) {
  root.innerHTML = `<p class="loading">Loading 2026 rate tables…</p>`;
  try {
    return await getTables();
  } catch (error) {
    root.innerHTML = `<div class="error-state"><h2>The rate tables did not load.</h2><p>Reload the page. Your inputs never leave this browser.</p></div>`;
    console.error(error);
    return null;
  }
}

function disclaimer() {
  return `<p class="disclaimer">Estimate for tax year 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules. Not tax, payroll, or financial advice.</p>`;
}

export async function mountCompare(root) {
  const tables = await load(root);
  if (!tables) return;
  const q = new URLSearchParams(location.search);
  const leftState = q.get("a.state") || q.get("state") || "TX";
  const rightState = q.get("b.state") || q.get("state2") || "CA";
  const leftLocal = q.get("a.local") || q.get("local") || "";
  const rightLocal = q.get("b.local") || q.get("local2") || "";
  const sharedSalary = q.get("salary") || q.get("pay") || "85000";
  const salaryA = q.get("a.salary") || sharedSalary;
  const salaryB = q.get("b.salary") || q.get("pay2") || sharedSalary;
  root.innerHTML = `<form id="compare-form">
      <div class="card" style="margin-bottom:12px">${statusSelect(q.get("status") || "single")}<p class="hint">Both offers use this filing status, biweekly pay, and no extra deductions.</p></div>
      <div class="cards">
      <div class="card"><h3>Offer A</h3>
        <label class="field"><span>Annual salary</span><span class="control"><span class="prefix">$</span><input name="grossA" inputmode="decimal" value="${esc(salaryA)}"></span></label>
        ${stateSelect(tables, "stateA", leftState)}
        <div data-local="A">${localSelect(tables, leftState, "localA", leftLocal)}</div>
      </div>
      <div class="card"><h3>Offer B</h3>
        <label class="field"><span>Annual salary</span><span class="control"><span class="prefix">$</span><input name="grossB" inputmode="decimal" value="${esc(salaryB)}"></span></label>
        ${stateSelect(tables, "stateB", rightState)}
        <div data-local="B">${localSelect(tables, rightState, "localB", rightLocal)}</div>
      </div>
      </div>
    </form>
    <div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#compare-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const shared = { filingStatus: data.get("status"), frequency: "biweekly" };
    const a = calculateTakeHome(baseInput({ ...shared, gross: data.get("grossA"), state: data.get("stateA"), local: data.get("localA"), status: shared.filingStatus }), tables);
    const b = calculateTakeHome(baseInput({ ...shared, gross: data.get("grossB"), state: data.get("stateB"), local: data.get("localB"), status: shared.filingStatus }), tables);
    const sameSalary = Math.abs((a.annual.gross || 0) - (b.annual.gross || 0)) < 0.005;
    let better = "The two estimates match.";
    if (a.annual.net > b.annual.net) {
      better = sameSalary ? "Offer A keeps more — same salary, lower estimated tax." : "Offer A keeps more.";
    } else if (b.annual.net > a.annual.net) {
      better = sameSalary ? "Offer B keeps more — same salary, lower estimated tax." : "Offer B keeps more.";
    }
    out.innerHTML = `<p class="lede">${better} Same filing status, biweekly, no extra deductions.</p>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th class="num">Offer A</th><th class="num">Offer B</th><th class="num">B − A</th></tr></thead>
        <tbody>
          ${row("Gross", a.annual.gross, b.annual.gross)}
          ${row("Federal", a.annual.federalIncome, b.annual.federalIncome)}
          ${row("FICA", a.annual.socialSecurity + a.annual.medicare + a.annual.additionalMedicare, b.annual.socialSecurity + b.annual.medicare + b.annual.additionalMedicare)}
          ${row("State income", a.annual.stateIncome, b.annual.stateIncome)}
          ${row("State payroll", a.annual.statePayroll, b.annual.statePayroll)}
          ${row("Local", a.annual.local, b.annual.local)}
          ${row("Net / year", a.annual.net, b.annual.net)}
          ${row("Net / paycheck", a.periodNet, b.periodNet)}
          ${row("Kept of $100", a.keepPer100, b.keepPer100)}
        </tbody>
      </table></div>
      ${disclaimer()}`;
  };
  form.addEventListener("change", (event) => {
    if (event.target.name === "stateA" || event.target.name === "stateB") {
      const side = event.target.name.endsWith("A") ? "A" : "B";
      const host = form.querySelector(`[data-local="${side}"]`);
      host.innerHTML = localSelect(tables, event.target.value, `local${side}`, "");
    }
    run();
  });
  form.addEventListener("input", debounce(run, 100));
  run();
}

export async function mountBonus(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="bonus-form">
      <div class="grid-2">
        <label class="field"><span>Annual salary, without the bonus</span><span class="control"><span class="prefix">$</span><input name="salary" inputmode="decimal" value="70000"></span></label>
        <label class="field"><span>Bonus</span><span class="control"><span class="prefix">$</span><input name="bonus" inputmode="decimal" value="5000"></span></label>
      </div>
      <div class="grid-2">${stateSelect(tables, "state", "NY")}${statusSelect("single")}</div>
      <div data-local>${localSelect(tables, "NY", "local", "")}</div>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#bonus-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const comparison = compareBonus({
      grossAnnual: num(data.get("salary")),
      bonusAnnual: num(data.get("bonus")),
      state: data.get("state"),
      localId: data.get("local") || "",
      filingStatus: data.get("status"),
      frequency: "biweekly",
    }, tables);
    const aggTax = comparison.aggregate.federal + comparison.aggregate.socialSecurity + comparison.aggregate.medicare + comparison.aggregate.additionalMedicare + comparison.aggregate.state + comparison.aggregate.payroll + comparison.aggregate.local;
    const suppDelta = comparison.supplementalFederal - comparison.aggregate.federal;
    out.innerHTML = `<div class="cards">
        <article class="card"><h3>Aggregate method</h3><p class="meta">Add the bonus to the year and take the difference in tax. This is the default LocalTakehome method.</p>
          <p class="delta">${usd(comparison.aggregate.net)}</p><p>Change in annual net. Tax on the bonus is about ${usd(aggTax)}.</p>
          <ul class="legend">
            <li><span class="swatch federal"></span><span>Federal</span><span>${usd(comparison.aggregate.federal)}</span></li>
            <li><span class="swatch fica"></span><span>FICA</span><span>${usd(comparison.aggregate.socialSecurity + comparison.aggregate.medicare + comparison.aggregate.additionalMedicare)}</span></li>
            <li><span class="swatch state"></span><span>State + payroll</span><span>${usd(comparison.aggregate.state + comparison.aggregate.payroll)}</span></li>
            <li><span class="swatch local"></span><span>Local</span><span>${usd(comparison.aggregate.local)}</span></li>
          </ul>
        </article>
        <article class="card"><h3>22% supplemental federal</h3><p class="meta">Many employers withhold federal tax on a bonus at a flat 22%, then still use their normal state method. This is a withholding method, not a lower tax rate.</p>
          <p class="delta">${usd(comparison.supplementalFederal)}</p>
          <p>Flat 22% federal withholding on this bonus. The aggregate federal difference is ${usd(comparison.aggregate.federal)}. ${suppDelta === 0 ? "They match at this income." : `The stub can differ by about ${usd(Math.abs(suppDelta))} of federal withholding, reconciled on the tax return.`}</p>
        </article>
      </div>
      <div style="margin-top:16px">${renderStub(comparison.withBonus)}</div>
      ${disclaimer()}`;
  };
  form.addEventListener("input", debounce(run, 100));
  form.addEventListener("change", (event) => {
    if (event.target.name === "state") form.querySelector("[data-local]").innerHTML = localSelect(tables, event.target.value, "local", "");
    run();
  });
  run();
}

export async function mountOvertime(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="ot-form">
      <div class="grid-2">
        <label class="field"><span>Hourly rate</span><span class="control"><span class="prefix">$</span><input name="rate" inputmode="decimal" value="28"></span></label>
        <label class="field"><span>Regular hours / week</span><span class="control"><input name="hours" inputmode="decimal" value="40"></span></label>
        <label class="field"><span>Overtime hours / week</span><span class="control"><input name="ot" inputmode="decimal" value="5"></span></label>
        <label class="field"><span>Multiplier</span><span class="control"><input name="otm" inputmode="decimal" value="1.5"><span class="suffix">×</span></span></label>
      </div>
      <div class="grid-2">${stateSelect(tables, "state", "TX")}${statusSelect("single")}</div>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#ot-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const common = {
      payType: "hourly",
      hourlyRate: num(data.get("rate")),
      hoursPerWeek: num(data.get("hours")),
      weeksPerYear: 52,
      overtimeMultiplier: num(data.get("otm")) || 1.5,
      state: data.get("state"),
      filingStatus: data.get("status"),
      frequency: "weekly",
    };
    const withOt = calculateTakeHome({ ...common, overtimeHoursPerWeek: num(data.get("ot")) }, tables);
    const base = calculateTakeHome({ ...common, overtimeHoursPerWeek: 0 }, tables);
    const delta = scenarioDeltas(base, withOt);
    out.innerHTML = `<div class="cards">
      <article class="card"><h3>Those overtime hours, after tax</h3><p class="delta pos">${usd(delta.annualNet)}</p><p>Extra net over the year versus the same job with no overtime. About ${usd(delta.periodNet)} on a weekly check.</p></article>
      <article class="card"><h3>Where the OT premium went</h3><p>Gross rose ${usd(withOt.annual.gross - base.annual.gross)}. Federal took ${usd(withOt.annual.federalIncome - base.annual.federalIncome)}. FICA took ${usd(delta.fica)}.</p></article>
    </div><div style="margin-top:16px">${renderStub(withOt)}</div>${disclaimer()}`;
  };
  form.addEventListener("input", debounce(run, 100));
  form.addEventListener("change", run);
  run();
}

export async function mountRaise(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="raise-form">
      <div class="grid-2">
        <label class="field"><span>Current salary</span><span class="control"><span class="prefix">$</span><input name="current" inputmode="decimal" value="80000"></span></label>
        <label class="field"><span>New salary</span><span class="control"><span class="prefix">$</span><input name="next" inputmode="decimal" value="88000"></span></label>
      </div>
      <div class="grid-2">${stateSelect(tables, "state", "IL")}${statusSelect("single")}</div>
      <p class="hint">Or type a raise percent and it will fill the new salary.</p>
      <label class="field"><span>Raise percent</span><span class="control"><input name="pct" inputmode="decimal" value="10"><span class="suffix">%</span></span></label>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#raise-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const before = calculateTakeHome(baseInput({ gross: data.get("current"), state: data.get("state"), status: data.get("status") }), tables);
    const after = calculateTakeHome(baseInput({ gross: data.get("next"), state: data.get("state"), status: data.get("status") }), tables);
    const grossDelta = after.annual.gross - before.annual.gross;
    const kept = grossDelta > 0 ? (after.annual.net - before.annual.net) / grossDelta : 0;
    out.innerHTML = `<article class="card"><h3>Of each new dollar</h3><p class="delta pos">${usd(kept * 100)}</p><p>You keep about this much of each extra $100, after federal, FICA, and ${esc(before.state?.name || "state")} tax. Net rises ${usd(after.annual.net - before.annual.net)} a year, or ${usd(after.periodNet - before.periodNet)} per biweekly check.</p></article>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th></th><th class="num">Now</th><th class="num">After</th><th class="num">Change</th></tr></thead><tbody>
        ${row("Gross", before.annual.gross, after.annual.gross)}
        ${row("Net / year", before.annual.net, after.annual.net)}
        ${row("Net / paycheck", before.periodNet, after.periodNet)}
      </tbody></table></div>${disclaimer()}`;
  };
  form.addEventListener("input", debounce((event) => {
    if (event?.target?.name === "pct") {
      const current = num(form.elements.current.value);
      form.elements.next.value = String(Math.round(current * (1 + num(form.elements.pct.value) / 100)));
    }
    if (event?.target?.name === "current" || event?.target?.name === "next") {
      const current = num(form.elements.current.value);
      const next = num(form.elements.next.value);
      if (current > 0) form.elements.pct.value = String(Math.round(((next - current) / current) * 1000) / 10);
    }
    run();
  }, 100));
  form.addEventListener("change", run);
  run();
}

export async function mount401k(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="k-form">
      <div class="grid-2">
        <label class="field"><span>Annual salary</span><span class="control"><span class="prefix">$</span><input name="gross" inputmode="decimal" value="120000"></span></label>
        <label class="field"><span>Traditional 401(k)</span><span class="control"><input name="pct" inputmode="decimal" value="10"><span class="suffix">%</span></span></label>
      </div>
      ${stateSelect(tables, "state", "TX")}
      <p class="hint">The deferral comes off income tax. Social Security and Medicare wages stay whole.</p>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#k-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const gross = num(data.get("gross"));
    const state = data.get("state");
    const rows = [0, 3, 5, 6, 10, 15].map((pct) => {
      const result = calculateTakeHome({
        grossAnnual: gross,
        state,
        filingStatus: "single",
        frequency: "biweekly",
        deductions: { traditional401k: { mode: "percent", value: pct } },
      }, tables);
      return { pct, result };
    });
    const current = calculateTakeHome({
      grossAnnual: gross,
      state,
      filingStatus: "single",
      frequency: "biweekly",
      deductions: { traditional401k: { mode: "percent", value: num(data.get("pct")) } },
    }, tables);
    const base = rows[0].result;
    out.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Deferral</th><th class="num">You save</th><th class="num">Federal</th><th class="num">FICA</th><th class="num">Net / year</th><th class="num">Net change</th></tr></thead><tbody>
      ${rows.map(({ pct, result }) => `<tr><th>${pct}%</th><td class="num">${usd(result.annual.pretax)}</td><td class="num">${usd(result.annual.federalIncome)}</td><td class="num">${usd(result.annual.socialSecurity + result.annual.medicare)}</td><td class="num">${usd(result.annual.net)}</td><td class="num">${usd(result.annual.net - base.annual.net)}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="note">FICA does not fall as the 401(k) rises. The net change is smaller than the contribution because you also owe less income tax. At your selected ${esc(data.get("pct") || "0")}%, Social Security wages are still ${usd(current.annual.ficaWages)}.</p>
    ${renderChart(current)}${disclaimer()}`;
  };
  form.addEventListener("input", debounce(run, 100));
  form.addEventListener("change", run);
  run();
}

export async function mountEmployer(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="er-form">
      <label class="field"><span>Employee annual salary</span><span class="control"><span class="prefix">$</span><input name="gross" inputmode="decimal" value="75000"></span></label>
      <div class="grid-2">${stateSelect(tables, "state", "CO")}${statusSelect("single")}</div>
      <div class="grid-2">
        <label class="field"><span>Employer retirement contribution</span><span class="control"><span class="prefix">$</span><input name="retire" inputmode="decimal" value="3000"></span></label>
        <label class="field"><span>Employer health contribution</span><span class="control"><span class="prefix">$</span><input name="health" inputmode="decimal" value="6000"></span></label>
      </div>
      <label class="field"><span>State unemployment rate, if you know it</span><span class="control"><input name="suta" inputmode="decimal" placeholder="2.5"><span class="suffix">% of wages</span></span></label>
      <p class="hint">Leave unemployment blank rather than guess. Real SUTA also stops at a wage base this field does not cap.</p>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#er-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const cost = calculateEmployerCost({
      grossAnnual: num(data.get("gross")),
      state: data.get("state"),
      filingStatus: data.get("status"),
      frequency: "biweekly",
      employerRetirementAnnual: num(data.get("retire")),
      employerBenefitsAnnual: num(data.get("health")),
      sutaRate: num(data.get("suta")),
    }, tables);
    const er = cost.employer;
    const lines = [
      ["Salary", cost.employee.annual.gross],
      ["Employer Social Security", er.socialSecurity],
      ["Employer Medicare", er.medicare],
      ["FUTA, 0.6% of the first $7,000", er.futa],
      ...er.programs.map((program) => [program.name, program.annual]),
      ["State unemployment (entered)", er.suta],
      ["Employer retirement", er.retirement],
      ["Employer health", er.benefits],
    ];
    out.innerHTML = `<article class="card"><h3>Fully loaded, before overhead</h3><p class="delta">${usd(er.total)}</p><p>Employee net is ${usd(cost.employee.annual.net)} a year. The gap between salary and this total is tax and the benefits you entered, not rent or equipment.</p></article>
      <div class="table-wrap" style="margin-top:12px"><table><tbody>
        ${lines.map(([label, amount]) => `<tr><th>${esc(label)}</th><td class="num">${usd(amount)}</td></tr>`).join("")}
        <tr><th>Total</th><td class="num">${usd(er.total)}</td></tr>
      </tbody></table></div>
      <p class="note">FUTA is the 0.6% net credit rate on the first $7,000, $42 at most. Additional Medicare has no employer match. SUTA is included only if you type a rate.</p>
      ${disclaimer()}`;
  };
  form.addEventListener("input", debounce(run, 100));
  form.addEventListener("change", run);
  run();
}

export async function mountContractor(root) {
  const tables = await load(root);
  if (!tables) return;
  root.innerHTML = `<form class="card" id="se-form">
      <div class="grid-2">
        <label class="field"><span>Annual gross</span><span class="control"><span class="prefix">$</span><input name="gross" inputmode="decimal" value="100000"></span></label>
        <label class="field"><span>Contractor expenses</span><span class="control"><span class="prefix">$</span><input name="expenses" inputmode="decimal" value="8000"></span></label>
      </div>
      <div class="grid-2">${stateSelect(tables, "state", "TX")}${statusSelect("single")}</div>
    </form><div data-out style="margin-top:16px"></div>`;
  const form = root.querySelector("#se-form");
  const out = root.querySelector("[data-out]");
  const run = () => {
    const data = new FormData(form);
    const common = { grossAnnual: num(data.get("gross")), state: data.get("state"), filingStatus: data.get("status"), frequency: "biweekly" };
    const w2 = calculateTakeHome({ ...common, employment: "w2" }, tables);
    const se = calculateTakeHome({ ...common, employment: "contractor", contractorExpensesAnnual: num(data.get("expenses")) }, tables);
    out.innerHTML = `<div class="cards">
      <article class="card"><h3>W-2</h3><p class="delta">${usd(w2.periodNet)}</p><p>per biweekly check · ${usd(w2.annual.net)} a year. Employee FICA is withheld. No expense deduction.</p>${renderChart(w2)}</article>
      <article class="card"><h3>Contractor</h3><p class="delta">${usd(se.periodNet)}</p><p>per “check” if you set the same amount aside biweekly · ${usd(se.annual.net)} after expenses, income tax, and self-employment tax.</p><p class="note">Quarterly set-aside, rough: ${usd(se.quarterlySetAside)}. Not a Schedule C and not a 1040-ES voucher. The qualified business income deduction is not included.</p>${renderChart(se)}</article>
    </div>
    <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th></th><th class="num">W-2</th><th class="num">Contractor</th></tr></thead><tbody>
      <tr><th>Gross</th><td class="num">${usd(w2.annual.gross)}</td><td class="num">${usd(se.annual.gross)}</td></tr>
      <tr><th>Expenses</th><td class="num">${usd(0)}</td><td class="num">${usd(se.annual.expenses)}</td></tr>
      <tr><th>Income tax</th><td class="num">${usd(w2.annual.federalIncome + w2.annual.stateIncome)}</td><td class="num">${usd(se.annual.federalIncome + se.annual.stateIncome)}</td></tr>
      <tr><th>FICA or self-employment</th><td class="num">${usd(w2.annual.socialSecurity + w2.annual.medicare + w2.annual.additionalMedicare)}</td><td class="num">${usd(se.annual.selfEmployment)}</td></tr>
      <tr><th>Net</th><td class="num">${usd(w2.annual.net)}</td><td class="num">${usd(se.annual.net)}</td></tr>
    </tbody></table></div>${disclaimer()}`;
  };
  form.addEventListener("input", debounce(run, 100));
  form.addEventListener("change", run);
  run();
}

export function mountTool(root) {
  const tool = root.dataset.tool;
  const map = {
    compare: mountCompare,
    bonus: mountBonus,
    overtime: mountOvertime,
    raise: mountRaise,
    "401k": mount401k,
    employer: mountEmployer,
    contractor: mountContractor,
  };
  const fn = map[tool];
  if (!fn) {
    root.innerHTML = `<p class="error-state">This tool is not available.</p>`;
    return;
  }
  return fn(root);
}
