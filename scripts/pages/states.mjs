/** One page per state, and the state directory. */
import { faqHTML, faqLd } from "../lib/layout.mjs";
import { NEIGHBORS, STATE_SALARY_PAGES, calculatorBlock, esc, linkList, longDate, pct, rateLabel, salaryPath, sourcesList, stateBracketTables, statePath, takeHomeTable, usd, usd0 } from "../lib/shared.mjs";
import { CITY_BY_LOCAL, citiesInState, cityPath } from "../content/cities.mjs";
import { rankStates } from "../../src/js/tools.mjs";
import { stateExplainer } from "../content/state-explainers.mjs";

const STATUS_NAMES = { single: "single", mfj: "married filing jointly", hoh: "head of household", mfs: "married filing separately" };

function deductionFacts(state, federal) {
  if (!state.wageTax) return "";
  const items = [];
  if (state.sd === "federal") {
    items.push(`<li><strong>Standard deduction:</strong> the same as the federal one: ${usd0(federal.standardDeduction.single)} single, ${usd0(federal.standardDeduction.mfj)} married filing jointly, ${usd0(federal.standardDeduction.hoh)} head of household.</li>`);
  } else if (state.sd) {
    const sd = state.sd;
    const hoh = sd.hoh !== sd.single ? `, ${usd0(sd.hoh)} head of household` : "";
    items.push(`<li><strong>Standard deduction:</strong> ${usd0(sd.single)} single, ${usd0(sd.mfj)} married filing jointly${hoh}.</li>`);
  } else if (!["AL", "CT", "SC", "WI", "UT", "OH"].includes(state.id)) {
    items.push(`<li><strong>Standard deduction:</strong> none.</li>`);
  }
  const ex = state.exemption;
  if (ex && (ex.single > 0 || ex.dependent > 0)) {
    const kind = ex.kind === "credit" ? "taken off the tax" : "taken off income";
    const parts = [];
    if (ex.single > 0) parts.push(`${usd0(ex.single)} for you${ex.mfj !== ex.single ? ` (${usd0(ex.mfj)} for a couple)` : ""}`);
    if (ex.dependent > 0) parts.push(`${usd0(ex.dependent)} for each dependent`);
    items.push(`<li><strong>Personal ${ex.kind === "credit" ? "credit" : "exemption"}:</strong> ${parts.join(" and ")}, ${kind}.</li>`);
  }
  const kept = state.pretax || {};
  if (kept.k401 === false) items.push(`<li><strong>401(k):</strong> ${esc(state.name)} taxes traditional 401(k) contributions when they are made, unlike the federal government.</li>`);
  else items.push(`<li><strong>401(k):</strong> traditional contributions come out before ${esc(state.name)} income tax, as they do for federal tax.</li>`);
  if (kept.hsa === false) items.push(`<li><strong>HSA:</strong> ${esc(state.name)} does not exclude health savings account contributions from taxable pay.</li>`);
  if (kept.s125 === false) items.push(`<li><strong>Health premiums:</strong> premiums paid through a cafeteria plan stay in ${esc(state.name)} taxable pay.</li>`);
  return `<ul>${items.join("")}</ul>`;
}

function payrollSection(ctx, state) {
  const programs = ctx.tables.payroll.programs.filter((row) => row.state === state.id);
  const extra = (ctx.tables.payroll.notModeledPrograms || []).filter((row) => row.state === state.id);
  if (!programs.length && !extra.length) {
    return `<p>${esc(state.name)} takes no other state payroll deductions from employees. Apart from ${state.wageTax ? "state income tax" : "federal income tax"}, the only deductions required by law are Social Security and Medicare.</p>`;
  }
  const rows = programs
    .map((row) => {
      const limit = row.wageBase ? `first ${usd0(row.wageBase)} of pay` : row.annualMax ? `capped at ${usd(row.annualMax)} a year` : "all pay";
      return `<tr><th scope="row">${esc(row.name)}${row.upTo ? " <small>(up to)</small>" : ""}</th><td class="num">${pct(row.employeeRate, 4)}</td><td>${limit}${row.wageBase && row.annualMax ? `, at most ${usd(row.annualMax)}` : ""}</td><td>${esc(row.shortWhy)}</td></tr>`;
    })
    .join("");
  const table = programs.length
    ? `<div class="table-wrap"><table><thead><tr><th scope="col">Deduction</th><th scope="col" class="num">Employee rate</th><th scope="col">Charged on</th><th scope="col">What it is</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : "";
  const upTo = programs.some((row) => row.upTo) ? `<p class="fine">“Up to” means the law lets an employer take that much from pay, and some employers pay part or all of it themselves.</p>` : "";
  return `${table}${upTo}${extra.map((row) => `<p>${esc(row.note)}</p>`).join("")}`;
}

function localSection(ctx, state) {
  const locals = ctx.locals.filter((row) => row.state === state.id);
  if (state.id === "DC") return `<p>The District's income tax is the only one. There is no separate city tax on top of it.</p>`;
  if (!locals.length) return `<p>${esc(state.name)} has no city or county income tax in this calculator. If you pay one that is not listed, you can enter its percentage in the calculator under “W-4 and other details”.</p>`;
  const describe = (row) => {
    if (row.method === "flat") return row.nonresidentRate != null && row.nonresidentRate !== row.residentRate && row.appliesWhen === "resident-or-work" ? `${pct(row.residentRate, 4)} for residents, ${pct(row.nonresidentRate, 4)} if you only work there` : pct(row.residentRate, 4);
    if (row.method === "brackets") return `${pct(row.brackets.single[0].rate, 4)} to ${pct(row.brackets.single.at(-1).rate, 4)}`;
    if (row.method === "tiered-flat") return `${pct(row.tiers.single[0][1], 4)} to ${pct(row.tiers.single.at(-1)[1], 4)}, depending on income`;
    if (row.method === "surcharge") return `${pct(row.residentSurchargeOfStateTax, 4)} of state tax for residents, ${pct(row.nonresidentRate, 4)} of pay if you only work there`;
    if (row.method === "layered-threshold") return "1% to 4% on higher incomes";
    if (row.method === "fixed") return `${usd(row.monthly)} a month`;
    return "";
  };
  const short = (row) => row.name.replace(/, (Indiana|Maryland|Ohio|Missouri|Delaware)$/, "");
  const rows = locals
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => {
      const city = CITY_BY_LOCAL[row.id];
      return `<tr><th scope="row">${city ? `<a href="${cityPath(city)}">${esc(short(row))}</a>` : esc(short(row))}</th><td>${describe(row)}</td></tr>`;
    })
    .join("");
  const intro =
    state.id === "IN"
      ? "Every Indiana county charges its own income tax on top of the state's. You pay the rate of the county you lived in on January 1."
      : state.id === "MD"
        ? "Every Maryland county, and Baltimore City, charges a local income tax on top of the state's. You pay the rate of the county you live in."
        : state.id === "OH"
          ? "Most Ohio cities and villages charge a municipal income tax, usually to people who work there. The calculator includes the six largest; for any other, enter its percentage under “W-4 and other details”."
          : state.id === "PA"
            ? "Almost every Pennsylvania municipality charges an earned income tax, commonly 1% to 2%. The calculator includes the two largest cities; for any other, enter its percentage under “W-4 and other details”."
            : state.id === "MI"
              ? "Twenty-four Michigan cities charge an income tax, and people who work in one but live elsewhere pay half the rate. The calculator includes ten of them, including the largest."
              : state.id === "KY"
                ? "Many Kentucky cities and counties charge an occupational tax on wages. The calculator includes the two largest; for any other, enter its percentage under “W-4 and other details”."
                : `These local income taxes are added only when you choose one in the calculator.`;
  return `<p>${intro}</p><div class="table-wrap"><table><thead><tr><th scope="col">Place</th><th scope="col">Local income tax in 2026</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function compareSection(ctx, state, rankAt) {
  const ids = [...new Set([...(NEIGHBORS[state.id] || [])])].filter((id) => ctx.byId[id]).slice(0, 6);
  const amount = 85000;
  const mine = ctx.run({ grossAnnual: amount, state: state.id });
  const rows = [state.id, ...ids]
    .map((id) => {
      const other = ctx.byId[id];
      const r = id === state.id ? mine : ctx.run({ grossAnnual: amount, state: id });
      const diff = r.annual.net - mine.annual.net;
      return `<tr${id === state.id ? ' class="sum"' : ""}><th scope="row">${id === state.id ? esc(other.name) : `<a href="${statePath(other)}">${esc(other.name)}</a>`}</th><td>${rateLabel(other)}</td><td class="num">${usd0(r.annual.stateIncome + r.annual.statePayroll)}</td><td class="num">${usd0(r.annual.net)}</td><td class="num diff">${id === state.id ? "" : diff === 0 ? "same" : `${diff > 0 ? "+" : "−"}${usd0(Math.abs(diff))}`}</td><td>${id === state.id ? "" : `<a href="/compare/?a.state=${state.id}&amp;b.state=${id}&amp;salary=${amount}">Compare</a>`}</td></tr>`;
    })
    .join("");
  const place = rankAt.findIndex((row) => row.state.id === state.id) + 1;
  return `<p>On ${usd0(amount)} a year, ${esc(state.name)} ranks <strong>${place} of 51</strong> for take-home pay among the states and D.C. (1 keeps the most). City and county taxes are not counted in this comparison.</p>
  <div class="table-wrap"><table><thead><tr><th scope="col">State</th><th scope="col">Income tax</th><th scope="col" class="num">State taxes on ${usd0(amount)}</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">Against ${esc(state.name)}</th><th scope="col"></th></tr></thead><tbody>${rows}</tbody></table></div>
  <p><a href="/map/">See all states ranked for any salary</a></p>`;
}

function statePage(ctx, state, rankAt) {
  const { tables, run } = ctx;
  const at = (amount) => run({ grossAnnual: amount, state: state.id });
  const r85 = at(85000);
  const r60 = at(60000);
  const r100 = at(100000);
  const locals = ctx.locals.filter((row) => row.state === state.id);
  const programs = tables.payroll.programs.filter((row) => row.state === state.id);
  const place = rankAt.findIndex((row) => row.state.id === state.id) + 1;
  const name = state.name;
  const the = state.id === "DC" ? "the District of Columbia" : name;
  const The = state.id === "DC" ? "The District of Columbia" : name;
  const cities = citiesInState(state.id);

  const breakdown = (r) =>
    `${usd0(r.annual.federalIncome)} in federal income tax, ${usd0(r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare)} for Social Security and Medicare${r.annual.stateIncome > 0 ? `, ${usd0(r.annual.stateIncome)} in ${name} income tax` : ""}${r.annual.statePayroll > 0 ? ` and ${usd0(r.annual.statePayroll)} for state payroll programs` : ""}`;

  const faqs = [
    [`How much is ${usd0(60000)} a year after taxes in ${the}?`, `About ${usd0(r60.annual.net)} a year, or ${usd0(r60.annual.net / 12)} a month, for a single person with no other deductions. That is after ${breakdown(r60)}.`],
    [`How much is ${usd0(100000)} a year after taxes in ${the}?`, `About ${usd0(r100.annual.net)} a year, or ${usd0(r100.annual.net / 12)} a month, for a single person with no other deductions. That is after ${breakdown(r100)}.`],
    state.wageTax
      ? [`What is the ${name} income tax rate for 2026?`, `${esc(state.why)}`]
      : [`Does ${the} have a state income tax?`, `No. ${esc(state.why)} Federal income tax, Social Security and Medicare still come out of every paycheck.`],
  ];
  if (state.wageTax) {
    faqs.push([
      `Does ${the} tax 401(k) contributions?`,
      state.pretax?.k401 === false
        ? `Yes. ${The} taxes traditional 401(k) contributions in the year you make them, so they lower your federal income tax but not your ${name} income tax.`
        : `No. Traditional 401(k) contributions come out of your pay before ${name} income tax, just as they do for federal income tax. Social Security and Medicare are still charged on them.`,
    ]);
  }
  faqs.push([
    `Are there city or county income taxes in ${the}?`,
    state.id === "DC"
      ? "No. The District's own income tax is the only one."
      : locals.length
        ? `Yes. This calculator covers ${locals.length} of them, including ${locals
            .slice(0, 3)
            .map((row) => row.name.replace(/,.*$/, ""))
            .join(", ")}. They are added only when you choose one.`
        : `Not in this calculator. If your city or county charges one, you can enter the percentage yourself.`,
  ]);
  const explainer = stateExplainer(ctx, state);
  if (explainer.faq) faqs.push(explainer.faq);
  if (programs.length) {
    faqs.push([`What else comes out of a paycheck in ${the}?`, `${programs.map((row) => `${row.name} (${pct(row.employeeRate, 4)})`).join(", ")}. ${programs.length > 1 ? "These are" : "This is"} separate from income tax and shown as ${programs.length > 1 ? "their own lines" : "its own line"}.`]);
  }

  const kpis = `<div class="kpis">
    <div class="kpi"><span>${name} income tax</span><strong>${rateLabel(state)}</strong><small>${state.wageTax ? "tax year 2026" : "on wages"}</small></div>
    <div class="kpi"><span>Take-home on ${usd0(85000)}</span><strong>${usd0(r85.annual.net)}</strong><small>${usd(r85.periodNet)} every two weeks, single</small></div>
    <div class="kpi"><span>Rank for take-home pay</span><strong>${place} of 51</strong><small>on ${usd0(85000)}; 1 keeps the most</small></div>
    <div class="kpi"><span>Local income taxes</span><strong>${state.id === "DC" ? "None" : locals.length || "None"}</strong><small>${locals.length ? "in this calculator" : "in this calculator"}</small></div>
  </div>`;

  const estimated =
    state.confidence === "estimated"
      ? `<div class="callout amber"><p><strong>Part of this is an estimate.</strong> ${esc(name)} had not published every 2026 figure when this page was last checked, so one or more amounts carry over from 2025. The notes below say which.</p></div>`
      : "";

  const body = `<div class="wrap page">
    <header class="mast">
      <p class="kicker">${esc(name)} · tax year 2026</p>
      <h1>${esc(name)} paycheck calculator</h1>
      <p class="lede">${esc(state.why)} On ${usd0(85000)} a year, a single person here takes home about <strong>${usd0(r85.annual.net)}</strong>, or ${usd(r85.periodNet)} every two weeks.</p>
    </header>
    ${calculatorBlock(ctx, { state: state.id }, { examples: false })}
    <div class="below">
      ${kpis}
      <section class="prose" id="how-${state.id.toLowerCase()}-taxes-pay">
        <h2>How ${esc(the)} taxes your paycheck</h2>
        ${explainer.html}
        <p class="fine">More on how the numbers are worked out: <a href="/methodology/">our method and sources</a> · <a href="/guides/local-income-taxes/">why local taxes matter</a></p>
      </section>
      <section>
        <h2>Take-home pay in ${esc(the)} by salary</h2>
        ${takeHomeTable(ctx, { state: state.id }, { link: (amount) => (STATE_SALARY_PAGES.includes(amount) ? salaryPath(amount, state) : salaryPath(amount)), amounts: [30000, 40000, 50000, 60000, 75000, 100000, 150000, 200000], caption: "Single filer, no dependents, no retirement or benefit deductions. Tax year 2026." })}
        ${linkList(STATE_SALARY_PAGES.map((amount) => ({ href: salaryPath(amount, state), label: `${usd0(amount)} in ${state.id === "DC" ? "D.C." : name}` })))}
      </section>
      <section class="prose wide">
        <h2>${esc(name)} income tax in 2026</h2>
        ${estimated}
        <div class="prose">
          <p>${esc(state.why)}</p>
          ${state.notes ? `<p>${esc(state.notes)}</p>` : ""}
          ${deductionFacts(state, tables.federal)}
        </div>
        ${stateBracketTables(state)}
      </section>
      <section>
        <h2>Other paycheck deductions in ${esc(the)}</h2>
        ${payrollSection(ctx, state)}
      </section>
      <section>
        <h2>City and county income taxes in ${esc(the)}</h2>
        ${localSection(ctx, state)}
        ${cities.length ? linkList(cities.map((city) => ({ href: cityPath(city), label: `${city.name} calculator` }))) : ""}
      </section>
      <section>
        <h2>How ${esc(the)} compares</h2>
        ${compareSection(ctx, state, rankAt)}
      </section>
      ${faqHTML(faqs, `${name} paycheck questions`)}
      <section class="prose">
        <h2>Sources</h2>
        ${sourcesList([...state.sources, ...tables.federal.sources.slice(0, 2), ...tables.fica.sources.slice(0, 1)])}
        <p class="updated">${esc(name)} figures last checked on ${longDate(state.lastVerified)}.${state.changed ? ` Latest update: ${esc(state.changed)}` : ""} If something looks wrong, <a href="/contact/">tell us</a>.</p>
      </section>
    </div>
  </div>`;

  return {
    path: statePath(state),
    section: "/states/",
    kind: "calculator",
    title: `${name} Paycheck Calculator 2026: Take-Home Pay After Taxes`,
    description: `Work out your 2026 take-home pay in ${the}. ${state.wageTax ? `${name} income tax (${rateLabel(state)})` : `No state income tax`}, federal tax, Social Security and Medicare${locals.length ? `, plus ${locals.length} local income taxes` : ""}, line by line.`,
    h1: `${name} paycheck calculator`,
    trail: [{ label: "States", href: "/states/" }, { label: name }],
    ld: [faqLd(faqs)],
    body,
  };
}

function directory(ctx, rankAt) {
  const cards = ctx.states
    .map((state) => {
      const row = rankAt.find((item) => item.state.id === state.id);
      return `<a class="state-card" href="${statePath(state)}"><strong>${esc(state.name)}</strong><em>${usd0(row.net)}</em><span>${rateLabel(state)}</span></a>`;
    })
    .join("");
  const none = ctx.states.filter((state) => !state.wageTax);
  const flat = ctx.states.filter((state) => state.wageTax && state.type === "flat");
  return {
    path: "/states/",
    section: "/states/",
    title: "Paycheck Calculators for All 50 States and D.C. (2026) | LocalTakehome",
    description: "A 2026 paycheck calculator for every state and the District of Columbia, with each state's income tax rates, payroll deductions and local taxes.",
    trail: [{ label: "States" }],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>All 50 states and D.C.</h1>
      <p class="lede">Choose a state for its calculator, tax rates and local taxes. The figure on each card is the take-home pay on an ${usd0(85000)} salary for a single person.</p>
    </header>
    <div class="state-grid">${cards}</div>
    <div class="below prose">
      <h2>How state income taxes differ</h2>
      <p><strong>${none.length} states do not tax wages:</strong> ${none.map((state) => `<a href="${statePath(state)}">${esc(state.name)}</a>`).join(", ")}.</p>
      <p><strong>${flat.length} states charge one flat rate:</strong> ${flat.map((state) => `<a href="${statePath(state)}">${esc(state.name)}</a> (${pct(state.brackets.single.at(-1).rate, 3)})`).join(", ")}.</p>
      <p>The rest, and the District of Columbia, tax income in bands, with higher rates on higher income. The <a href="/guides/state-income-tax-rates-2026/">state income tax table</a> sets all of them side by side, and the <a href="/map/">ranking</a> shows where any salary goes furthest.</p>
    </div>
  </div>`,
  };
}

export function statePages(ctx) {
  const rankAt = rankStates(ctx.tables, { salary: "85000", status: "single", kids: "" });
  return [directory(ctx, rankAt), ...ctx.states.map((state) => statePage(ctx, state, rankAt))];
}
