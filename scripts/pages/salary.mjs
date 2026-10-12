/** "$60,000 after taxes" pages: by salary, by salary and state, and by hourly wage. */
import { faqHTML, faqLd } from "../lib/layout.mjs";
import { HOURLY_PAGES, NATIONAL_SALARY_PAGES, STATE_SALARY_PAGES, esc, hourlyPath, linkList, pct, rateLabel, salaryPath, statePath, usd, usd0 } from "../lib/shared.mjs";
import { keepOfNext } from "../../src/js/engine.mjs";
import { renderChart, renderLines, renderMath } from "../../src/js/view.mjs";

const fica = (r) => r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;

function stateRows(ctx, amount, link) {
  const rows = ctx.states
    .map((state) => ({ state, r: ctx.run({ grossAnnual: amount, state: state.id }) }))
    .sort((a, b) => b.r.annual.net - a.r.annual.net || a.state.name.localeCompare(b.state.name));
  return {
    rows,
    html: rows
      .map(({ state, r }, index) => `<tr><td class="num rank">${index + 1}</td><th scope="row"><a href="${link(state)}">${esc(state.name)}</a></th><td class="num">${usd0(r.annual.stateIncome + r.annual.statePayroll)}</td><td class="num strong">${usd0(r.annual.net)}</td><td class="num">${usd0(r.annual.net / 12)}</td><td class="num">${usd(r.periodNet)}</td></tr>`)
      .join(""),
  };
}

function periodTable(r, hours = 2080) {
  const rows = [
    ["A year", 1],
    ["A month", 12],
    ["Twice a month", 24],
    ["Every two weeks", 26],
    ["A week", 52],
    ["A day (5-day week)", 260],
    ["An hour", hours],
  ];
  return `<div class="table-wrap narrow"><table><thead><tr><th scope="col">Pay</th><th scope="col" class="num">Before taxes</th><th scope="col" class="num">After taxes</th></tr></thead><tbody>${rows
    .map(([label, div]) => `<tr><th scope="row">${label}</th><td class="num">${div === 1 ? usd0(r.annual.gross) : usd(r.annual.gross / div)}</td><td class="num">${div === 1 ? usd0(r.annual.net) : usd(r.annual.net / div)}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

function nationalSalary(ctx, amount) {
  const { rows, html } = stateRows(ctx, amount, (state) => (STATE_SALARY_PAGES.includes(amount) ? salaryPath(amount, state) : `${statePath(state)}?pay=${amount}`));
  const best = rows[0];
  const worst = rows.at(-1);
  const federal = best.r; // a state with no tax on wages: federal figures only
  const mfj = ctx.run({ grossAnnual: amount, state: best.state.id, filingStatus: "mfj" });
  const hoh = ctx.run({ grossAnnual: amount, state: best.state.id, filingStatus: "hoh" });
  const index = NATIONAL_SALARY_PAGES.indexOf(amount);
  const near = NATIONAL_SALARY_PAGES.slice(Math.max(0, index - 3), index + 4).filter((value) => value !== amount);
  const label = usd0(amount);
  const faqs = [
    [`How much is ${label} a year after taxes?`, `Between ${usd0(worst.r.annual.net)} and ${usd0(best.r.annual.net)} for a single person in 2026, depending on the state. Federal income tax takes ${usd0(federal.annual.federalIncome)} and Social Security and Medicare take ${usd0(fica(federal))} everywhere; state taxes take from nothing to ${usd0(worst.r.annual.stateIncome + worst.r.annual.statePayroll)}.`],
    [`How much is ${label} a year per month after taxes?`, `Between ${usd0(worst.r.annual.net / 12)} and ${usd0(best.r.annual.net / 12)} a month, depending on the state.`],
    [`How much is ${label} a year per hour?`, `${usd(amount / 2080)} an hour before taxes at 40 hours a week, 52 weeks a year. After tax that is ${usd(worst.r.annual.net / 2080)} to ${usd(best.r.annual.net / 2080)} an hour.`],
    [`How much federal tax do I pay on ${label}?`, `${usd0(federal.annual.federalIncome)} in federal income tax if you are single and take the standard deduction (${pct(amount > 0 ? federal.annual.federalIncome / amount : 0, 1)} of your pay), plus ${usd0(fica(federal))} for Social Security and Medicare. Married filing jointly on the same income, the federal income tax is ${usd0(mfj.annual.federalIncome)}.`],
  ];
  return {
    path: salaryPath(amount),
    title: `${label} a Year After Taxes in 2026: Take-Home Pay in Every State | LocalTakehome`,
    description: `${label} a year is ${usd0(worst.r.annual.net)} to ${usd0(best.r.annual.net)} after 2026 taxes, depending on your state. See the monthly, biweekly and hourly take-home pay for all 50 states.`,
    trail: [{ label: "Salaries", href: "/salary/" }, { label }],
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>${label} a year after taxes</h1>
      <p class="lede">A ${label} salary leaves a single person between <strong>${usd0(worst.r.annual.net)}</strong> (${esc(worst.state.name)}) and <strong>${usd0(best.r.annual.net)}</strong> (${esc(best.state.name)} and other states with no income tax) in 2026. That is ${usd0(worst.r.annual.net / 12)} to ${usd0(best.r.annual.net / 12)} a month.</p>
      <p><a class="btn solid" href="/?pay=${amount}">Open ${label} in the calculator</a></p>
    </header>
    <div class="kpis">
      <div class="kpi"><span>Federal income tax</span><strong>${usd0(federal.annual.federalIncome)}</strong><small>single, standard deduction</small></div>
      <div class="kpi"><span>Social Security and Medicare</span><strong>${usd0(fica(federal))}</strong><small>the same in every state</small></div>
      <div class="kpi"><span>State taxes</span><strong>${usd0(0)} to ${usd0(worst.r.annual.stateIncome + worst.r.annual.statePayroll)}</strong><small>depending on the state</small></div>
      <div class="kpi"><span>Before taxes, per hour</span><strong>${usd(amount / 2080)}</strong><small>at 2,080 hours a year</small></div>
    </div>
    <section>
      <h2>${label} after taxes in every state</h2>
      <div class="table-wrap"><table><caption>Single filer, no dependents, no retirement or benefit deductions, no city tax. Tax year 2026.</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">State</th><th scope="col" class="num">State taxes</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th><th scope="col" class="num">Every 2 weeks</th></tr></thead><tbody>${html}</tbody></table></div>
    </section>
    <section class="prose wide">
      <h2>The federal part of the bill</h2>
      <div class="prose"><p>Federal tax on ${label} is the same in every state. This is how it is worked out for a single person with no state income tax:</p></div>
      <div class="split"><div>${renderLines(federal)}</div><div>${renderMath(federal).replace("<details ", "<details open ")}</div></div>
      <div class="prose">
        <h3>By filing status</h3>
        <div class="table-wrap narrow"><table><thead><tr><th scope="col">Filing status</th><th scope="col" class="num">Federal income tax</th><th scope="col" class="num">Take-home, no state tax</th></tr></thead><tbody>
          <tr><th scope="row">Single</th><td class="num">${usd0(federal.annual.federalIncome)}</td><td class="num">${usd0(federal.annual.net)}</td></tr>
          <tr><th scope="row">Married filing jointly</th><td class="num">${usd0(mfj.annual.federalIncome)}</td><td class="num">${usd0(mfj.annual.net)}</td></tr>
          <tr><th scope="row">Head of household</th><td class="num">${usd0(hoh.annual.federalIncome)}</td><td class="num">${usd0(hoh.annual.net)}</td></tr>
        </tbody></table></div>
        <h3>${label} a year by pay period</h3>
        ${periodTable(federal)}
        <p class="fine">After-tax figures are for a state with no income tax. Use the table above or the calculator for your state.</p>
      </div>
    </section>
    ${faqHTML(faqs)}
    <section><h2>Other salaries</h2>${linkList(near.map((value) => ({ href: salaryPath(value), label: `${usd0(value)} after taxes` })))}<p><a href="/salary/">All salaries</a> · <a href="/hourly/">Hourly wages</a> · <a href="/take-home-to-salary/">Start from take-home pay instead</a></p></section>
  </div>`,
  };
}

function stateSalary(ctx, amount, state) {
  const base = { grossAnnual: amount, state: state.id };
  const r = ctx.run(base);
  const mfj = ctx.run({ ...base, filingStatus: "mfj" });
  const hoh = ctx.run({ ...base, filingStatus: "hoh" });
  const k401 = ctx.run({ ...base, deductions: { traditional401k: { mode: "percent", value: 6 } } });
  const kids = ctx.run({ ...base, filingStatus: "mfj", childrenUnder17: 2 });
  const noTax = ctx.run({ grossAnnual: amount, state: "TX" });
  const keep = keepOfNext({ payType: "salary", frequency: "biweekly", filingStatus: "single", ...base }, ctx.tables);
  const label = usd0(amount);
  const name = state.name;
  const the = state.id === "DC" ? "the District of Columbia" : name;
  const locals = ctx.locals.filter((row) => row.state === state.id);
  const index = STATE_SALARY_PAGES.indexOf(amount);
  const near = STATE_SALARY_PAGES.filter((value, i) => value !== amount && Math.abs(i - index) <= 3);
  const stateTax = r.annual.stateIncome + r.annual.statePayroll;
  const localExamples = locals
    .filter((row) => ["nyc", "philadelphia", "detroit", "columbus-oh", "cleveland-oh", "baltimore-md", "montgomery-md", "marion-in", "portland-multnomah", "kansas-city-mo", "st-louis-mo", "louisville-ky", "wilmington-de", "denver-co", "pittsburgh", "cincinnati-oh", "grand-rapids-mi", "yonkers", "lexington-ky", "allen-in", "prince-georges-md"].includes(row.id))
    .slice(0, 5)
    .map((row) => ({ row, r: ctx.run({ ...base, localId: row.id }) }));
  const faqs = [
    [`How much is ${label} a year after taxes in ${the}?`, `About ${usd0(r.annual.net)} a year for a single person in 2026: ${usd0(r.annual.net / 12)} a month, or ${usd(r.periodNet)} every two weeks. Federal income tax takes ${usd0(r.annual.federalIncome)}, Social Security and Medicare ${usd0(fica(r))}${stateTax > 0 ? `, and ${name} ${usd0(stateTax)}` : `, and ${name} nothing`}.`],
    [`What is ${label} a year per hour in ${the} after taxes?`, `${usd(r.annual.net / 2080)} an hour after taxes, from ${usd(amount / 2080)} before, at 40 hours a week.`],
    [`How much ${name} tax do I pay on ${label}?`, state.wageTax ? `${usd0(r.annual.stateIncome)} in ${name} income tax${r.annual.statePayroll > 0 ? `, plus ${usd0(r.annual.statePayroll)} for state payroll programs` : ""}. That is ${pct(stateTax / amount, 1)} of your pay.` : `No income tax: ${the} does not tax wages.${r.annual.statePayroll > 0 ? ` State payroll programs take ${usd0(r.annual.statePayroll)}.` : ""}`],
    [`How much of a raise would I keep at ${label} in ${the}?`, `About ${usd0(keep * 100)} of each extra $100, after federal${state.wageTax ? ` and ${name}` : ""} tax, Social Security and Medicare.`],
  ];
  return {
    path: salaryPath(amount, state),
    section: "/states/",
    title: `${label} a Year After Taxes in ${name} (2026) | LocalTakehome`,
    description: `${label} a year in ${the} is about ${usd0(r.annual.net)} after 2026 taxes for a single person: ${usd0(r.annual.net / 12)} a month or ${usd(r.periodNet)} every two weeks. See every tax line.`,
    trail: [{ label: "Salaries", href: "/salary/" }, { label, href: salaryPath(amount) }, { label: name }],
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">${esc(name)} · tax year 2026</p>
      <h1>${label} a year after taxes in ${esc(the)}</h1>
      <p class="lede">A ${label} salary in ${esc(the)} leaves a single person about <strong>${usd0(r.annual.net)}</strong> a year after taxes: <strong>${usd0(r.annual.net / 12)}</strong> a month, or ${usd(r.periodNet)} every two weeks.</p>
      <p><a class="btn solid" href="${statePath(state)}?pay=${amount}">Change the details in the ${esc(name)} calculator</a></p>
    </header>
    <div class="kpis">
      <div class="kpi"><span>Take-home pay</span><strong>${usd0(r.annual.net)}</strong><small>${usd(r.keepPer100)} of every $100</small></div>
      <div class="kpi"><span>Federal income tax</span><strong>${usd0(r.annual.federalIncome)}</strong><small>${pct(r.annual.federalIncome / amount, 1)} of pay</small></div>
      <div class="kpi"><span>Social Security and Medicare</span><strong>${usd0(fica(r))}</strong><small>${pct(fica(r) / amount, 2)} of pay</small></div>
      <div class="kpi"><span>${esc(name)} taxes</span><strong>${usd0(stateTax)}</strong><small>${state.wageTax ? rateLabel(state) : "no income tax on wages"}</small></div>
    </div>
    <section>
      <div class="split">
        <div>${renderLines(r)}</div>
        <div>${renderChart(r)}${renderMath(r).replace("<details ", "<details open ")}</div>
      </div>
    </section>
    <section class="prose wide">
      <h2>${label} in ${esc(the)} by pay period</h2>
      ${periodTable(r)}
      <h2>How your situation changes it</h2>
      <div class="table-wrap"><table><thead><tr><th scope="col">Situation</th><th scope="col" class="num">Federal income tax</th><th scope="col" class="num">${esc(name)} taxes</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th></tr></thead><tbody>
        <tr class="sum"><th scope="row">Single</th><td class="num">${usd0(r.annual.federalIncome)}</td><td class="num">${usd0(stateTax)}</td><td class="num">${usd0(r.annual.net)}</td><td class="num">${usd0(r.annual.net / 12)}</td></tr>
        <tr><th scope="row">Married filing jointly, one income</th><td class="num">${usd0(mfj.annual.federalIncome)}</td><td class="num">${usd0(mfj.annual.stateIncome + mfj.annual.statePayroll)}</td><td class="num">${usd0(mfj.annual.net)}</td><td class="num">${usd0(mfj.annual.net / 12)}</td></tr>
        <tr><th scope="row">Married, two children under 17</th><td class="num">${usd0(kids.annual.federalIncome)}</td><td class="num">${usd0(kids.annual.stateIncome + kids.annual.statePayroll)}</td><td class="num">${usd0(kids.annual.net)}</td><td class="num">${usd0(kids.annual.net / 12)}</td></tr>
        <tr><th scope="row">Head of household</th><td class="num">${usd0(hoh.annual.federalIncome)}</td><td class="num">${usd0(hoh.annual.stateIncome + hoh.annual.statePayroll)}</td><td class="num">${usd0(hoh.annual.net)}</td><td class="num">${usd0(hoh.annual.net / 12)}</td></tr>
        <tr><th scope="row">Single, 6% into a 401(k)</th><td class="num">${usd0(k401.annual.federalIncome)}</td><td class="num">${usd0(k401.annual.stateIncome + k401.annual.statePayroll)}</td><td class="num">${usd0(k401.annual.net)}</td><td class="num">${usd0(k401.annual.net / 12)}</td></tr>
        ${localExamples.map(({ row, r: lr }) => `<tr><th scope="row">Single, living in ${esc(row.name.replace(/,.*$/, ""))}</th><td class="num">${usd0(lr.annual.federalIncome)}</td><td class="num">${usd0(lr.annual.stateIncome + lr.annual.statePayroll)} + ${usd0(lr.annual.local)} local</td><td class="num">${usd0(lr.annual.net)}</td><td class="num">${usd0(lr.annual.net / 12)}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="prose">
        <p>${esc(state.why)}${state.wageTax && noTax.annual.net - r.annual.net > 0.5 ? ` In a state with no income tax the same salary would leave ${usd0(noTax.annual.net)}, which is ${usd0(noTax.annual.net - r.annual.net)} more.` : ""} Of the next $1,000 you earn at this salary, you would keep about ${usd0(keep * 1000)}.</p>
        <p><a href="${statePath(state)}">${esc(name)} tax rates and calculator</a> · <a href="${salaryPath(amount)}">${label} in every state</a> · <a href="/compare/?a.state=${state.id}&amp;salary=${amount}">Compare with another state</a></p>
      </div>
    </section>
    ${faqHTML(faqs)}
    <section><h2>Other salaries in ${esc(the)}</h2>${linkList(near.map((value) => ({ href: salaryPath(value, state), label: usd0(value) })))}</section>
  </div>`,
  };
}

function hourlyPage(ctx, rate) {
  const amount = rate * 2080;
  const { rows, html } = stateRows(ctx, amount, (state) => `${statePath(state)}?type=hourly&amp;pay=${rate}`);
  const best = rows[0];
  const worst = rows.at(-1);
  const r = best.r;
  const part = ctx.run({ grossAnnual: rate * 20 * 52, state: best.state.id });
  const ot = ctx.run({ payType: "hourly", hourlyRate: rate, hoursPerWeek: 40, overtimeHoursPerWeek: 5, state: best.state.id });
  const index = HOURLY_PAGES.indexOf(rate);
  const near = HOURLY_PAGES.slice(Math.max(0, index - 4), index + 5).filter((value) => value !== rate);
  const label = `$${rate}`;
  const faqs = [
    [`How much is ${label} an hour a year?`, `${usd0(amount)} before taxes, working 40 hours a week for 52 weeks (2,080 hours). After 2026 taxes a single person keeps ${usd0(worst.r.annual.net)} to ${usd0(best.r.annual.net)}, depending on the state.`],
    [`How much is ${label} an hour a month after taxes?`, `${usd0(worst.r.annual.net / 12)} to ${usd0(best.r.annual.net / 12)} a month, from ${usd0(amount / 12)} before taxes.`],
    [`How much is ${label} an hour every two weeks?`, `${usd0(rate * 80)} before taxes for 80 hours. After tax, ${usd(worst.r.periodNet)} to ${usd(best.r.periodNet)}.`],
    [`How much is ${label} an hour part time?`, `At 20 hours a week it is ${usd0(rate * 20 * 52)} a year before taxes and about ${usd0(part.annual.net)} after, in a state with no income tax.`],
  ];
  return {
    path: hourlyPath(rate),
    title: `${label} an Hour Is How Much a Year After Taxes? (2026) | LocalTakehome`,
    description: `${label} an hour is ${usd0(amount)} a year before taxes and ${usd0(worst.r.annual.net)} to ${usd0(best.r.annual.net)} after, depending on your state. Monthly, biweekly and weekly take-home pay for 2026.`,
    trail: [{ label: "Hourly wages", href: "/hourly/" }, { label: `${label} an hour` }],
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>${label} an hour after taxes</h1>
      <p class="lede">${label} an hour is <strong>${usd0(amount)}</strong> a year before taxes at full-time hours. After taxes a single person keeps between <strong>${usd0(worst.r.annual.net)}</strong> and <strong>${usd0(best.r.annual.net)}</strong>, depending on the state: ${usd(worst.r.annual.net / 2080)} to ${usd(best.r.annual.net / 2080)} an hour.</p>
      <p><a class="btn solid" href="/hourly-paycheck-calculator/?type=hourly&amp;pay=${rate}">Open ${label} an hour in the calculator</a></p>
    </header>
    <div class="kpis">
      <div class="kpi"><span>A year, before taxes</span><strong>${usd0(amount)}</strong><small>40 hours a week, 52 weeks</small></div>
      <div class="kpi"><span>A month, after taxes</span><strong>${usd0(worst.r.annual.net / 12)} to ${usd0(best.r.annual.net / 12)}</strong><small>depending on the state</small></div>
      <div class="kpi"><span>Every two weeks, after taxes</span><strong>${usd0(worst.r.periodNet)} to ${usd0(best.r.periodNet)}</strong><small>from ${usd0(rate * 80)} before</small></div>
      <div class="kpi"><span>With 5 hours of overtime a week</span><strong>${usd0(ot.annual.net)}</strong><small>a year after tax, no state income tax</small></div>
    </div>
    <section class="prose wide">
      <h2>${label} an hour by pay period</h2>
      ${periodTable(r)}
      <p class="fine">After-tax figures here are for a state with no income tax. The table below has every state.</p>
    </section>
    <section>
      <h2>${label} an hour after taxes in every state</h2>
      <div class="table-wrap"><table><caption>Full time (2,080 hours), single filer, no dependents, no other deductions, no city tax. Tax year 2026.</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">State</th><th scope="col" class="num">State taxes</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th><th scope="col" class="num">Every 2 weeks</th></tr></thead><tbody>${html}</tbody></table></div>
    </section>
    ${faqHTML(faqs)}
    <section><h2>Other hourly wages</h2>${linkList(near.map((value) => ({ href: hourlyPath(value), label: `$${value} an hour` })))}<p><a href="/hourly/">All hourly wages</a> · <a href="/salary-to-hourly/">Salary to hourly converter</a> · <a href="/overtime-calculator/">Overtime calculator</a></p></section>
  </div>`,
  };
}

function salaryIndex(ctx) {
  const rows = NATIONAL_SALARY_PAGES.map((amount) => {
    const low = Math.min(...ctx.states.map((state) => ctx.run({ grossAnnual: amount, state: state.id }).annual.net));
    const high = ctx.run({ grossAnnual: amount, state: "TX" }).annual.net;
    return `<tr><th scope="row"><a href="${salaryPath(amount)}">${usd0(amount)}</a></th><td class="num">${usd(amount / 2080)}</td><td class="num">${usd0(low)} to ${usd0(high)}</td><td class="num">${usd0(low / 12)} to ${usd0(high / 12)}</td></tr>`;
  }).join("");
  return {
    path: "/salary/",
    title: "Salary After Taxes (2026): Take-Home Pay for Common Salaries | LocalTakehome",
    description: "Take-home pay after 2026 taxes for salaries from $20,000 to $500,000, in every state. Pick a salary to see the monthly, biweekly and hourly figures.",
    trail: [{ label: "Salaries" }],
    body: `<div class="wrap page">
    <header class="mast"><p class="kicker">Tax year 2026</p><h1>Salaries after taxes</h1>
    <p class="lede">What common salaries leave after federal and state tax in 2026. The range runs from the state that takes the most to the states with no income tax.</p></header>
    <div class="table-wrap"><table><caption>Single filer, no dependents, no other deductions, no city tax.</caption><thead><tr><th scope="col">Salary</th><th scope="col" class="num">Per hour, before taxes</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">Take-home a month</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="below prose"><h2>By state</h2><p>Each state page has its own salary table: ${ctx.states.map((state) => `<a href="${statePath(state)}">${esc(state.name)}</a>`).join(", ")}.</p>
    <p>For a salary that is not listed, or for your own filing status and deductions, use the <a href="/">calculator</a>. To work backwards from the take-home pay you need, use the <a href="/take-home-to-salary/">salary needed calculator</a>.</p></div>
  </div>`,
  };
}

function hourlyIndex(ctx) {
  const rows = HOURLY_PAGES.map((rate) => {
    const amount = rate * 2080;
    const low = Math.min(...ctx.states.map((state) => ctx.run({ grossAnnual: amount, state: state.id }).annual.net));
    const high = ctx.run({ grossAnnual: amount, state: "TX" }).annual.net;
    return `<tr><th scope="row"><a href="${hourlyPath(rate)}">$${rate} an hour</a></th><td class="num">${usd0(amount)}</td><td class="num">${usd0(low)} to ${usd0(high)}</td><td class="num">${usd(low / 2080)} to ${usd(high / 2080)}</td></tr>`;
  }).join("");
  return {
    path: "/hourly/",
    title: "Hourly Wage After Taxes (2026): Yearly and Monthly Take-Home Pay | LocalTakehome",
    description: "What an hourly wage comes to in a year, and what is left after 2026 taxes, for wages from $10 to $100 an hour in every state.",
    trail: [{ label: "Hourly wages" }],
    body: `<div class="wrap page">
    <header class="mast"><p class="kicker">Tax year 2026</p><h1>Hourly wages after taxes</h1>
    <p class="lede">What an hourly wage adds up to over a full-time year, and what is left after federal and state tax in 2026.</p></header>
    <div class="table-wrap"><table><caption>Full time (2,080 hours a year), single filer, no dependents, no other deductions, no city tax.</caption><thead><tr><th scope="col">Wage</th><th scope="col" class="num">A year, before taxes</th><th scope="col" class="num">A year, after taxes</th><th scope="col" class="num">An hour, after taxes</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="below prose"><p>For your own hours, overtime and state, use the <a href="/hourly-paycheck-calculator/">hourly paycheck calculator</a>. To convert between hourly, monthly and yearly pay, use the <a href="/salary-to-hourly/">converter</a>.</p></div>
  </div>`,
  };
}

export function salaryPages(ctx) {
  const pages = [salaryIndex(ctx), hourlyIndex(ctx)];
  for (const amount of NATIONAL_SALARY_PAGES) pages.push(nationalSalary(ctx, amount));
  for (const state of ctx.states) for (const amount of STATE_SALARY_PAGES) pages.push(stateSalary(ctx, amount, state));
  for (const rate of HOURLY_PAGES) pages.push(hourlyPage(ctx, rate));
  return pages;
}
