/** Guides. Every figure comes from the rate files or the engine. */
import { faqHTML, faqLd } from "../lib/layout.mjs";
import { bracketRows, cardGrid, esc, longDate, pct, rateLabel, sourcesList, statePath, topRate, usd, usd0 } from "../lib/shared.mjs";
import { renderLines } from "../../src/js/view.mjs";
import { rankStates } from "../../src/js/tools.mjs";

function guide(ctx, def) {
  return {
    path: `/guides/${def.slug}/`,
    section: "/guides/",
    title: def.title,
    description: def.description,
    trail: [{ label: "Guides", href: "/guides/" }, { label: def.crumb }],
    ld: [faqLd(def.faqs || []), { "@context": "https://schema.org", "@type": "Article", headline: def.h1, description: def.description, dateModified: ctx.verified, author: { "@type": "Organization", name: "LocalTakehome" }, publisher: { "@type": "Organization", name: "LocalTakehome" } }],
    card: { href: `/guides/${def.slug}/`, label: def.crumb, blurb: def.blurb },
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Guide · tax year 2026</p>
      <h1>${def.h1}</h1>
      <p class="lede">${def.lede}</p>
      <p class="updated">Figures checked against official sources on ${ctx.verifiedLong}.</p>
    </header>
    <div class="prose wide">${def.body}</div>
    ${faqHTML(def.faqs || [])}
    ${def.sources ? `<section class="prose"><h2>Sources</h2>${sourcesList(def.sources)}</section>` : ""}
    <section class="prose"><p><a class="btn solid" href="/">Work out your own paycheck</a></p></section>
  </div>`,
  };
}

function payPeriods(year) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const total = leap ? 366 : 365;
  const first = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  return days.map((name, weekday) => {
    const offset = (weekday - first + 7) % 7; // day-of-year index of the first such weekday
    const weekly = Math.floor((total - 1 - offset) / 7) + 1;
    const biweeklyMax = Math.floor((total - 1 - offset) / 14) + 1;
    const firstDate = new Date(Date.UTC(year, 0, 1 + offset));
    return { name, weekly, biweeklyMax, firstDate };
  });
}

export function guidePages(ctx) {
  const { tables, run } = ctx;
  const fed = tables.federal;
  const fica = tables.fica;
  const wd = fed.workerDeductions;
  const L = fed.limits;
  const statusLabel = { single: "Single", mfj: "Married filing jointly", hoh: "Head of household", mfs: "Married filing separately" };
  const guides = [];

  /* 1. federal brackets */
  {
    const ex = run({ grossAnnual: 85000, state: "TX" });
    const tablesHTML = ["single", "mfj", "hoh", "mfs"]
      .map((status) => `<div class="table-wrap"><table><caption>${statusLabel[status]}: standard deduction ${usd0(fed.standardDeduction[status])}</caption><thead><tr><th scope="col">Taxable income</th><th scope="col" class="num">Rate</th></tr></thead><tbody>${bracketRows(fed.brackets[status])}</tbody></table></div>`)
      .join("");
    guides.push(
      guide(ctx, {
        slug: "federal-tax-brackets-2026",
        crumb: "Federal tax brackets for 2026",
        blurb: "Rates, standard deductions and a worked example",
        title: "Federal Income Tax Brackets and Standard Deduction for 2026 | LocalTakehome",
        description: `The 2026 federal income tax brackets for every filing status, the standard deduction (${usd0(fed.standardDeduction.single)} single, ${usd0(fed.standardDeduction.mfj)} joint), and a worked example.`,
        h1: "Federal income tax brackets for 2026",
        lede: `Seven rates from 10% to 37%, and a standard deduction of ${usd0(fed.standardDeduction.single)} for single filers and ${usd0(fed.standardDeduction.mfj)} for married couples filing jointly.`,
        body: `<div class="prose"><h2>The 2026 brackets</h2><p>These are the rates for income earned in 2026, on the tax return filed in early 2027. “Taxable income” is your income after the standard deduction (or itemized deductions) has been taken off.</p></div>
          <div class="table-pair">${tablesHTML}</div>
          <div class="prose">
          <h2>How brackets work</h2>
          <p>Each rate applies only to the income inside its band. Moving into a higher bracket does not change the tax on the income below it, which is why a raise can never reduce your take-home pay.</p>
          <h3>A worked example: ${usd0(85000)}, single</h3>
          <p>Take off the ${usd0(fed.standardDeduction.single)} standard deduction and ${usd0(ex.annual.federalTaxable)} is taxable. The first ${usd0(fed.brackets.single[1].over)} is taxed at 10% (${usd0(fed.brackets.single[1].over * 0.1)}). The next ${usd0(fed.brackets.single[2].over - fed.brackets.single[1].over)} is taxed at 12% (${usd0((fed.brackets.single[2].over - fed.brackets.single[1].over) * 0.12)}). The remaining ${usd0(ex.annual.federalTaxable - fed.brackets.single[2].over)} is taxed at 22% (${usd0((ex.annual.federalTaxable - fed.brackets.single[2].over) * 0.22)}). Total: <strong>${usd0(ex.annual.federalIncome)}</strong>, which is ${pct(ex.annual.federalIncome / 85000, 1)} of the salary even though the top rate reached is 22%.</p>
          <h2>Credits that reduce the tax</h2>
          <p>The child tax credit takes ${usd0(fed.credits.childTaxCredit)} off the tax for each child under 17, and ${usd0(fed.credits.otherDependentCredit)} for each other dependent. Both shrink by $${fed.credits.phaseoutPer1000} for every $1,000 of income above ${usd0(fed.credits.phaseoutStart.single)} (${usd0(fed.credits.phaseoutStart.mfj)} for joint filers).</p>
          <h2>New deductions for 2025 to 2028</h2>
          <p>Workers can also deduct up to ${usd0(wd.tipsMax)} of <a href="/guides/no-tax-on-tips/">tips</a> and up to ${usd0(wd.overtimeMax.single)} of <a href="/guides/no-tax-on-overtime/">overtime premium pay</a> (${usd0(wd.overtimeMax.mfj)} on a joint return).</p>
          </div>`,
        faqs: [
          ["What is the standard deduction for 2026?", `${usd0(fed.standardDeduction.single)} for single filers and married people filing separately, ${usd0(fed.standardDeduction.mfj)} for married couples filing jointly, and ${usd0(fed.standardDeduction.hoh)} for heads of household.`],
          ["What is the highest federal tax rate in 2026?", `37%, on taxable income above ${usd0(fed.brackets.single.at(-1).over)} for single filers and ${usd0(fed.brackets.mfj.at(-1).over)} for joint filers.`],
          ["Does moving into a higher bracket lower my take-home pay?", "No. Only the income above the bracket line is taxed at the higher rate."],
        ],
        sources: fed.sources,
      }),
    );
  }

  /* 2. state income tax rates */
  {
    const rows = ctx.states
      .map((state) => {
        const r = run({ grossAnnual: 85000, state: state.id });
        const sd = !state.wageTax ? "" : state.sd === "federal" ? `${usd0(fed.standardDeduction.single)} (federal)` : state.sd ? usd0(state.sd.single) : "varies or none";
        return `<tr><th scope="row"><a href="${statePath(state)}">${esc(state.name)}</a></th><td>${rateLabel(state)}</td><td class="num">${state.wageTax ? pct(topRate(state), 3) : "0%"}</td><td class="num">${sd || "n/a"}</td><td class="num">${usd0(r.annual.stateIncome)}</td><td class="num">${pct(r.annual.stateIncome / 85000, 2)}</td></tr>`;
      })
      .join("");
    guides.push(
      guide(ctx, {
        slug: "state-income-tax-rates-2026",
        crumb: "State income tax rates for 2026",
        blurb: "All 50 states and D.C. in one table",
        title: "State Income Tax Rates for 2026: All 50 States and D.C. | LocalTakehome",
        description: "2026 state income tax rates and standard deductions for every state and D.C., with the tax each state charges on an $85,000 salary.",
        h1: "State income tax rates for 2026",
        lede: "Every state's 2026 income tax on wages in one table, with what each actually charges on an $85,000 salary.",
        body: `<div class="table-wrap"><table><caption>Single filer. “Tax on ${usd0(85000)}” is state income tax only, after the state's own deductions, exemptions and credits.</caption><thead><tr><th scope="col">State</th><th scope="col">Rates</th><th scope="col" class="num">Top rate</th><th scope="col" class="num">Standard deduction, single</th><th scope="col" class="num">Tax on ${usd0(85000)}</th><th scope="col" class="num">As a share of pay</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <h2>Why the top rate is not the whole story</h2>
          <p>Two states with the same top rate can charge very different amounts. What matters is where the brackets start, how large the standard deduction and exemptions are, and whether the state has quirks such as Oregon's deduction for federal tax or Connecticut's recapture rules. The last two columns show the result on a real salary.</p>
          <p>Some states also take payroll premiums for disability or paid leave, which are not income tax and are not in this table. Each state page lists them, and the <a href="/guides/state-payroll-taxes-2026/">state payroll tax guide</a> sets them side by side.</p>
          </div>`,
        faqs: [
          ["Which states have no income tax?", "Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming do not tax wages."],
          ["Which state has the highest income tax rate?", "California, at 13.3% on taxable income above $1 million (12.3% plus a 1% surcharge)."],
        ],
        sources: [{ name: "Tax Foundation, State Individual Income Tax Rates and Brackets, 2026", url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/" }],
      }),
    );
  }

  /* 3. no income tax states */
  {
    const none = ctx.states.filter((state) => !state.wageTax);
    const ranked = rankStates(tables, { salary: "85000", status: "single", kids: "" });
    const rows = none
      .map((state) => {
        const r = run({ grossAnnual: 85000, state: state.id });
        const programs = tables.payroll.programs.filter((row) => row.state === state.id);
        return `<tr><th scope="row"><a href="${statePath(state)}">${esc(state.name)}</a></th><td>${programs.length ? programs.map((row) => `${esc(row.name)} (${pct(row.employeeRate, 4)})`).join(", ") : "None"}</td><td class="num">${usd0(r.annual.statePayroll)}</td><td class="num">${usd0(r.annual.net)}</td></tr>`;
      })
      .join("");
    const median = ranked[25];
    guides.push(
      guide(ctx, {
        slug: "states-with-no-income-tax",
        crumb: "States with no income tax",
        blurb: "The nine states, and what still comes out of pay",
        title: "States With No Income Tax in 2026: What Still Comes Out of a Paycheck | LocalTakehome",
        description: "The nine states with no income tax on wages in 2026, what is still taken from a paycheck there, and how much more you keep than in a typical state.",
        h1: "States with no income tax",
        lede: "Nine states do not tax wages. Federal tax still applies in all of them, and two take small payroll premiums of their own.",
        body: `<div class="table-wrap"><table><caption>Single person earning ${usd0(85000)} a year, tax year 2026.</caption><thead><tr><th scope="col">State</th><th scope="col">Taken from pay by the state</th><th scope="col" class="num">A year</th><th scope="col" class="num">Take-home pay</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <h2>How much more do you keep?</h2>
          <p>On ${usd0(85000)}, a single person keeps ${usd0(ranked[0].net)} in a state with no income tax and no payroll premiums. In the middle-ranked state, ${esc(median.state.name)}, the same salary leaves ${usd0(median.net)}: a difference of ${usd0(ranked[0].net - median.net)} a year. Against the state that takes the most, ${esc(ranked.at(-1).state.name)}, the difference is ${usd0(ranked[0].net - ranked.at(-1).net)}.</p>
          <h2>What you still pay</h2>
          <p>Federal income tax, Social Security (${pct(fica.socialSecurity.employeeRate)}) and Medicare (${pct(fica.medicare.employeeRate)}) are the same everywhere. States without an income tax raise their money in other ways, usually sales tax, property tax or taxes on particular industries, so a bigger paycheck does not always mean a lower cost of living.</p>
          <p>New Hampshire stopped taxing interest and dividends from 2025, and Tennessee's tax on investment income ended in 2021, so neither taxes personal income of any kind now. Washington taxes large capital gains but not wages.</p>
          </div>`,
        faqs: [
          ["Which states have no income tax in 2026?", "Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming."],
          ["Do I pay federal tax if my state has no income tax?", "Yes. Federal income tax, Social Security and Medicare apply in every state."],
          ["Does moving to a no-income-tax state always save money?", "It always raises your paycheck. Whether you are better off overall depends on housing, sales tax, property tax and insurance where you move."],
        ],
      }),
    );
  }

  /* 4. FICA */
  {
    const maxSS = fica.socialSecurity.wageBase * fica.socialSecurity.employeeRate;
    const rows = [30000, 60000, 100000, fica.socialSecurity.wageBase, 250000, 500000]
      .map((amount) => {
        const r = run({ grossAnnual: amount, state: "TX" });
        const total = r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;
        return `<tr><th scope="row">${usd0(amount)}</th><td class="num">${usd0(r.annual.socialSecurity)}</td><td class="num">${usd0(r.annual.medicare)}</td><td class="num">${usd0(r.annual.additionalMedicare)}</td><td class="num">${usd0(total)}</td><td class="num">${pct(total / amount, 2)}</td></tr>`;
      })
      .join("");
    guides.push(
      guide(ctx, {
        slug: "social-security-and-medicare-tax-2026",
        crumb: "Social Security and Medicare tax",
        blurb: "FICA rates and the 2026 wage limit",
        title: "Social Security and Medicare Tax (FICA) for 2026: Rates and Wage Limit | LocalTakehome",
        description: `FICA in 2026: Social Security is ${pct(fica.socialSecurity.employeeRate)} up to ${usd0(fica.socialSecurity.wageBase)} of pay, Medicare is ${pct(fica.medicare.employeeRate)} with no limit, plus 0.9% on high earnings.`,
        h1: "Social Security and Medicare tax in 2026",
        lede: `Most workers pay ${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)} of every paycheck: ${pct(fica.socialSecurity.employeeRate)} for Social Security and ${pct(fica.medicare.employeeRate)} for Medicare. Together they are often labeled FICA.`,
        body: `<div class="prose">
          <h2>The 2026 rates</h2>
          <ul>
            <li><strong>Social Security: ${pct(fica.socialSecurity.employeeRate)}</strong> of pay up to ${usd0(fica.socialSecurity.wageBase)}. Above that nothing more is taken for the year, so the most anyone pays in 2026 is ${usd0(maxSS)}.</li>
            <li><strong>Medicare: ${pct(fica.medicare.employeeRate)}</strong> of all pay, with no upper limit.</li>
            <li><strong>Additional Medicare: ${pct(fica.additionalMedicare.rate)}</strong> on pay above ${usd0(fica.additionalMedicare.thresholds.single)} for single filers, ${usd0(fica.additionalMedicare.thresholds.mfj)} for married couples filing jointly and ${usd0(fica.additionalMedicare.thresholds.mfs)} for married people filing separately. Employers start withholding it once your pay passes ${usd0(fica.additionalMedicare.employerWithholdingThreshold)}, whatever your filing status.</li>
          </ul>
          <p>Your employer pays the same ${pct(fica.socialSecurity.employerRate)} and ${pct(fica.medicare.employerRate)} again on your behalf. Self-employed people pay both halves.</p>
          </div>
          <div class="table-wrap"><table><caption>Employee's share for the year, single filer.</caption><thead><tr><th scope="col">Pay</th><th scope="col" class="num">Social Security</th><th scope="col" class="num">Medicare</th><th scope="col" class="num">Additional Medicare</th><th scope="col" class="num">Total</th><th scope="col" class="num">Share of pay</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <h2>What lowers these taxes, and what does not</h2>
          <p>A traditional 401(k) does <strong>not</strong> lower Social Security or Medicare: they are charged on your pay before the contribution comes out. Health, dental and vision premiums paid through your employer, and HSA and FSA contributions made from your paycheck, <strong>do</strong> lower them.</p>
          <p>The federal deductions for tips and overtime lower income tax only. Social Security and Medicare still apply to every dollar of tips and overtime.</p>
          <h2>If you have two jobs</h2>
          <p>Each employer withholds Social Security up to the limit separately. If your combined pay is more than ${usd0(fica.socialSecurity.wageBase)}, you will have paid too much, and you get the excess back as a credit on your tax return.</p>
          </div>`,
        faqs: [
          ["What is the Social Security wage limit for 2026?", `${usd0(fica.socialSecurity.wageBase)}. Pay above that is not subject to Social Security tax.`],
          ["What is the maximum Social Security tax in 2026?", `${usd0(maxSS)} for an employee, which is ${pct(fica.socialSecurity.employeeRate)} of ${usd0(fica.socialSecurity.wageBase)}.`],
          ["Is there a limit on Medicare tax?", "No. Medicare is charged on all pay, and high earners pay an extra 0.9%."],
        ],
        sources: fica.sources,
      }),
    );
  }

  /* 5. overtime */
  {
    const base = { payType: "hourly", hourlyRate: 28, hoursPerWeek: 40, overtimeHoursPerWeek: 8, state: "TX" };
    const on = run(base);
    const off = run({ ...base, workerDeductions: false });
    guides.push(
      guide(ctx, {
        slug: "no-tax-on-overtime",
        crumb: "No tax on overtime",
        blurb: "What the overtime deduction really covers",
        title: "No Tax on Overtime Explained (2026): What the Deduction Covers | LocalTakehome",
        description: `The federal overtime deduction for 2025 to 2028: up to ${usd0(wd.overtimeMax.single)} of overtime premium pay, what counts, who qualifies and how much it saves.`,
        h1: "No tax on overtime: how it really works",
        lede: `From 2025 through 2028 you can deduct part of your overtime pay from federal taxable income. It is a real saving, but it is not all of your overtime and it is not all taxes.`,
        body: `<div class="prose">
          <h2>What you can deduct</h2>
          <p>Only the <strong>premium</strong> part of overtime: the extra pay above your regular rate. If you earn $28 an hour and overtime pays $42, the premium is $14 for each overtime hour. The other $28 is taxed as usual.</p>
          <ul>
            <li><strong>Limit:</strong> ${usd0(wd.overtimeMax.single)} of premium pay a year, or ${usd0(wd.overtimeMax.mfj)} on a joint return.</li>
            <li><strong>Income limit:</strong> the deduction shrinks by $${wd.phaseoutPer1000} for every $1,000 of income above ${usd0(wd.phaseoutStart.single)} (${usd0(wd.phaseoutStart.mfj)} joint).</li>
            <li><strong>Which overtime:</strong> overtime that federal law requires, which for most hourly workers means hours over 40 in a week.</li>
            <li><strong>Not available</strong> to married people who file separately.</li>
          </ul>
          <h2>What it does not cover</h2>
          <p>Social Security and Medicare (${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)}) still apply to all overtime pay. Most states still tax overtime in full, though a few have their own rules: Alabama, for example, lets workers deduct up to $1,000 of overtime premium pay for 2026 through 2028.</p>
          <h2>A worked example</h2>
          <p>Someone earning $28 an hour who works 8 hours of overtime every week earns ${usd0(on.annual.gross)} a year, of which ${usd0(on.annual.overtimePremium)} is overtime premium. Deducting it lowers federal income tax from ${usd0(off.annual.federalIncome)} to ${usd0(on.annual.federalIncome)}: a saving of <strong>${usd0(off.annual.federalIncome - on.annual.federalIncome)}</strong> for the year.</p>
          <h2>Will I see it in my paycheck?</h2>
          <p>The deduction is claimed on your tax return. Your paycheck changes only if your withholding does, for example if you enter the expected deduction in Step 4(b) of a new W-4. Otherwise the saving arrives as a larger refund.</p>
          <p><a class="btn ghost" href="/overtime-calculator/">Work out your own overtime</a></p>
          </div>`,
        faqs: [
          ["Is overtime tax free in 2026?", `No. Up to ${usd0(wd.overtimeMax.single)} of overtime premium pay (${usd0(wd.overtimeMax.mfj)} joint) can be deducted from federal taxable income. Social Security, Medicare and most state taxes still apply.`],
          ["How long does the overtime deduction last?", "It applies to tax years 2025 through 2028."],
          ["Do salaried workers qualify?", "Only for overtime pay that federal law requires their employer to pay. Salaried employees who are exempt from overtime rules do not receive qualifying overtime pay."],
        ],
        sources: wd.sources,
      }),
    );
  }

  /* 6. tips */
  {
    const base = { grossAnnual: 24000, tipsAnnual: 22000, state: "NV" };
    const on = run(base);
    const off = run({ ...base, workerDeductions: false });
    guides.push(
      guide(ctx, {
        slug: "no-tax-on-tips",
        crumb: "No tax on tips",
        blurb: "The tips deduction, limits and who qualifies",
        title: "No Tax on Tips Explained (2026): The $25,000 Tips Deduction | LocalTakehome",
        description: `The federal deduction for tips, 2025 to 2028: up to ${usd0(wd.tipsMax)} a year, who qualifies, what still gets taxed and how much it saves.`,
        h1: "No tax on tips: how it really works",
        lede: `From 2025 through 2028, workers in tipped jobs can deduct up to ${usd0(wd.tipsMax)} of tips a year from federal taxable income.`,
        body: `<div class="prose">
          <h2>The rules</h2>
          <ul>
            <li><strong>Limit:</strong> ${usd0(wd.tipsMax)} of qualified tips a year.</li>
            <li><strong>Income limit:</strong> the deduction shrinks by $${wd.phaseoutPer1000} for every $1,000 of income above ${usd0(wd.phaseoutStart.single)} (${usd0(wd.phaseoutStart.mfj)} on a joint return).</li>
            <li><strong>Who:</strong> people in occupations that customarily received tips before 2025, such as servers, bartenders, hairdressers and delivery drivers. The IRS publishes the list.</li>
            <li><strong>What counts:</strong> voluntary cash and card tips, including shared tips. Service charges added automatically to a bill do not count.</li>
            <li><strong>Not available</strong> to married people who file separately.</li>
          </ul>
          <h2>What is still taxed</h2>
          <p>Tips remain wages for Social Security and Medicare, so ${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)} still comes out. Most states with an income tax still tax tips. Tips must still be reported to your employer.</p>
          <h2>A worked example</h2>
          <p>A server with ${usd0(24000)} in wages and ${usd0(22000)} in tips has ${usd0(on.annual.gross)} of income. Without the deduction, federal income tax would be ${usd0(off.annual.federalIncome)}. With it, ${usd0(on.annual.federalIncome)}: a saving of <strong>${usd0(off.annual.federalIncome - on.annual.federalIncome)}</strong>. Social Security and Medicare take ${usd0(on.annual.socialSecurity + on.annual.medicare)} either way.</p>
          <p><a class="btn ghost" href="/no-tax-on-tips-calculator/">Work out your own tips</a></p>
          </div>`,
        faqs: [
          ["Are tips taxed in 2026?", `Up to ${usd0(wd.tipsMax)} of qualified tips can be deducted from federal taxable income. Social Security and Medicare still apply, and so does state income tax in most states.`],
          ["Do I need to report tips if they are deductible?", "Yes. Report them as before. The deduction is claimed on your tax return."],
          ["Is a service charge a tip?", "No. An amount the business adds to the bill automatically is a service charge, not a tip, and does not qualify."],
        ],
        sources: wd.sources,
      }),
    );
  }

  /* 7. pay stub */
  {
    const r = run({ grossAnnual: 65000, state: "NY", localId: "nyc", deductions: { traditional401k: { mode: "percent", value: 5 }, health: 2400 } });
    guides.push(
      guide(ctx, {
        slug: "how-to-read-a-pay-stub",
        crumb: "How to read a pay stub",
        blurb: "Every line explained with a real example",
        title: "How to Read a Pay Stub: Every Line Explained (2026) | LocalTakehome",
        description: "What each line on a pay stub means: gross pay, before-tax deductions, federal and state withholding, FICA, local tax, and net pay, with a worked example.",
        h1: "How to read a pay stub",
        lede: "A pay stub is a short story that starts with what you earned and ends with what reached your bank account. Here is each line in between.",
        body: `<div class="split">
          <div class="prose">
          <h2>An example stub</h2>
          <p>This is one biweekly paycheck for a single person earning ${usd0(65000)} a year who lives in New York City, puts 5% into a 401(k) and pays ${usd0(2400)} a year for health insurance. Tap a line for how it was worked out.</p>
          <h2>The lines, in order</h2>
          <p><strong>Gross pay.</strong> What you earned before anything is taken out: salary for the period, or hours times rate, plus overtime, bonuses and tips. “YTD” columns show the total since January.</p>
          <p><strong>Before-tax deductions.</strong> Money taken out before income tax is worked out: a traditional 401(k) or 403(b), health, dental and vision premiums, HSA and FSA contributions, commuter benefits. These lower your tax bill.</p>
          <p><strong>Federal income tax</strong> (Fed W/H, FIT or FITW). Based on your pay, your filing status and your W-4.</p>
          <p><strong>Social Security</strong> (OASDI, SS or FICA-SS). ${pct(fica.socialSecurity.employeeRate)} of pay up to ${usd0(fica.socialSecurity.wageBase)} a year.</p>
          <p><strong>Medicare</strong> (Med or FICA-Med). ${pct(fica.medicare.employeeRate)} of all pay.</p>
          <p><strong>State income tax</strong> (SIT or State W/H). Depends on your state; nine states have none.</p>
          <p><strong>State programs</strong> (SDI, PFL, PFML, FLI, FAMLI). Premiums for state disability or paid family leave in some states.</p>
          <p><strong>Local tax</strong> (City, County, EIT, LST, OPT). A city, county or school district income tax, where there is one.</p>
          <p><strong>After-tax deductions.</strong> Roth 401(k) contributions, union dues, wage garnishments. These do not change your taxes.</p>
          <p><strong>Net pay.</strong> What is left: your take-home pay.</p>
          </div>
          <div>${renderLines(r)}</div>
          </div>
          <div class="prose">
          <h2>Things worth checking</h2>
          <ul>
            <li><strong>Your state and city.</strong> If you have moved, make sure tax is being withheld for where you live now.</li>
            <li><strong>Social Security stopping.</strong> If you earn more than ${usd0(fica.socialSecurity.wageBase)}, the Social Security line should fall to zero late in the year, and your pay goes up.</li>
            <li><strong>Federal withholding of zero.</strong> Unless your income is very low, this usually means the W-4 claims “exempt” or large credits. You may owe at tax time.</li>
            <li><strong>Year-to-date totals</strong> against your last stub of the previous year, and against your W-2 in January.</li>
          </ul>
          </div>`,
        faqs: [
          ["What is the difference between gross pay and net pay?", "Gross pay is what you earn before deductions. Net pay is what is left after taxes and other deductions: your take-home pay."],
          ["What does OASDI mean on a pay stub?", "Old-Age, Survivors and Disability Insurance: the official name for Social Security tax."],
          ["Why is my paycheck different from this calculator?", "Employers use withholding tables that can differ by a few dollars from the year's tax spread evenly, and your stub may include benefits or deductions you have not entered."],
        ],
      }),
    );
  }

  /* 8. contribution limits */
  {
    const r0 = run({ grossAnnual: 85000, state: "TX" });
    const rMax = run({ grossAnnual: 85000, state: "TX", deductions: { traditional401k: { mode: "dollar", value: L.electiveDeferral401k } } });
    guides.push(
      guide(ctx, {
        slug: "401k-and-hsa-limits-2026",
        crumb: "401(k), IRA and HSA limits for 2026",
        blurb: "Contribution limits and what they save in tax",
        title: "401(k), IRA, HSA and FSA Contribution Limits for 2026 | LocalTakehome",
        description: `2026 contribution limits: 401(k) ${usd0(L.electiveDeferral401k)}, catch-up ${usd0(L.catchUp401k)}, IRA ${usd0(L.ira)}, HSA ${usd0(L.hsaSelfOnly)} or ${usd0(L.hsaFamily)}, health FSA ${usd0(L.healthFsa)}.`,
        h1: "401(k), IRA, HSA and FSA limits for 2026",
        lede: "How much you can put into each tax-favored account in 2026, and what it does to your paycheck.",
        body: `<div class="table-wrap"><table><thead><tr><th scope="col">Account</th><th scope="col" class="num">2026 limit</th><th scope="col">Notes</th></tr></thead><tbody>
            <tr><th scope="row">401(k), 403(b), most 457 plans, TSP</th><td class="num">${usd0(L.electiveDeferral401k)}</td><td>Your own contributions, traditional and Roth combined</td></tr>
            <tr><th scope="row">Catch-up, age 50 or over</th><td class="num">${usd0(L.catchUp401k)}</td><td>On top, for a total of ${usd0(L.electiveDeferral401k + L.catchUp401k)}</td></tr>
            <tr><th scope="row">Catch-up, ages 60 to 63</th><td class="num">${usd0(L.catchUp401kAge60to63)}</td><td>Instead of the ${usd0(L.catchUp401k)}, where the plan allows</td></tr>
            <tr><th scope="row">IRA, traditional or Roth</th><td class="num">${usd0(L.ira)}</td><td>${usd0(L.iraCatchUp)} more at age 50 or over</td></tr>
            <tr><th scope="row">HSA, self-only cover</th><td class="num">${usd0(L.hsaSelfOnly)}</td><td>Needs a high-deductible health plan</td></tr>
            <tr><th scope="row">HSA, family cover</th><td class="num">${usd0(L.hsaFamily)}</td><td>Needs a high-deductible health plan</td></tr>
            <tr><th scope="row">Health FSA</th><td class="num">${usd0(L.healthFsa)}</td><td>Through your employer</td></tr>
          </tbody></table></div>
          <div class="prose">
          <h2>What they do to your paycheck</h2>
          <p><strong>Traditional 401(k)</strong> contributions come out before federal income tax and, in most states, state income tax. Social Security and Medicare are still charged on them.</p>
          <p><strong>HSA and health FSA</strong> contributions made through your paycheck come out before federal income tax and before Social Security and Medicare, which makes them the most tax-efficient dollars on a pay stub. California and New Jersey still tax HSA contributions for state purposes.</p>
          <p><strong>Roth</strong> contributions come out after tax and do not change your paycheck's tax lines.</p>
          <h3>Example: maxing out a 401(k) on ${usd0(85000)}</h3>
          <p>Putting in the full ${usd0(L.electiveDeferral401k)} lowers federal income tax from ${usd0(r0.annual.federalIncome)} to ${usd0(rMax.annual.federalIncome)}, so take-home pay falls by ${usd0(r0.annual.net - rMax.annual.net)}, not by the full ${usd0(L.electiveDeferral401k)}. In a state with an income tax the saving is larger.</p>
          <p><a class="btn ghost" href="/401k-calculator/">See it for your salary</a></p>
          </div>`,
        faqs: [
          ["What is the 401(k) limit for 2026?", `${usd0(L.electiveDeferral401k)} for employee contributions, plus ${usd0(L.catchUp401k)} if you are 50 or over (${usd0(L.catchUp401kAge60to63)} if you are 60 to 63 and your plan allows it).`],
          ["Does the employer match count toward the limit?", "No. The employee limit covers only what you put in."],
          ["What is the HSA limit for 2026?", `${usd0(L.hsaSelfOnly)} with self-only cover and ${usd0(L.hsaFamily)} with family cover.`],
        ],
        sources: [fed.sources.find((src) => /401k-limit/.test(src.url)), fed.sources[1]].filter(Boolean),
      }),
    );
  }

  /* 9. pay periods */
  {
    const p26 = payPeriods(2026);
    const p27 = payPeriods(2027);
    const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const fmt = (date) => `${month[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const rows = p26
      .map((day, index) => ({ day, next: p27[index] }))
      .filter(({ day }) => !["Saturday", "Sunday"].includes(day.name))
      .map(({ day, next }) => `<tr><th scope="row">${day.name}</th><td class="num">${day.weekly}</td><td class="num">${day.biweeklyMax === 27 ? "26 or 27" : "26"}</td><td>${fmt(day.firstDate)}</td><td class="num">${next.weekly}</td><td class="num">${next.biweeklyMax === 27 ? "26 or 27" : "26"}</td></tr>`)
      .join("");
    const r = run({ grossAnnual: 65000, state: "TX" });
    const r27 = run({ grossAnnual: 65000, state: "TX", frequency: "weekly" });
    guides.push(
      guide(ctx, {
        slug: "pay-periods-2026",
        crumb: "Pay periods in 2026",
        blurb: "Weekly, biweekly, twice a month: how many paychecks",
        title: "How Many Pay Periods in 2026? Weekly, Biweekly and Semimonthly | LocalTakehome",
        description: "How many paychecks you get in 2026 and 2027 on weekly, biweekly, semimonthly and monthly pay, which paydays give 27 biweekly checks, and what it means for each check.",
        h1: "How many pay periods are there in 2026?",
        lede: "Usually 52 weekly, 26 biweekly, 24 semimonthly or 12 monthly paychecks. Some years, depending on your payday, there is one extra.",
        body: `<div class="prose">
          <h2>The four pay schedules</h2>
          <ul>
            <li><strong>Weekly:</strong> 52 paychecks, occasionally 53.</li>
            <li><strong>Biweekly (every two weeks):</strong> 26 paychecks, occasionally 27. Two months of the year have three paydays.</li>
            <li><strong>Semimonthly (twice a month):</strong> always 24, usually on fixed dates such as the 15th and the last day.</li>
            <li><strong>Monthly:</strong> always 12.</li>
          </ul>
          <h2>Paydays in 2026 and 2027</h2>
          <p>A year is 52 weeks and one day (two in a leap year), so one weekday occurs 53 times. If that is your payday, you get an extra weekly check, and a biweekly schedule may fit in a 27th.</p>
          </div>
          <div class="table-wrap"><table><thead><tr><th scope="col">Payday</th><th scope="col" class="num">Weekly checks in 2026</th><th scope="col" class="num">Biweekly checks in 2026</th><th scope="col">First such day of 2026</th><th scope="col" class="num">Weekly checks in 2027</th><th scope="col" class="num">Biweekly checks in 2027</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <p class="fine">“26 or 27” means 27 only if your first payday of the year falls on the first such weekday of January. Paydays that land on a holiday are usually moved a day earlier.</p>
          <h2>Does the schedule change how much I am paid?</h2>
          <p>Not over the year. A ${usd0(65000)} salary is ${usd(r.grossPeriod)} every two weeks or ${usd(r27.grossPeriod)} a week, and the tax for the year is the same. In a year with 27 biweekly paydays, salaried employers either pay the usual amount 27 times (a slightly bigger year) or divide the salary by 27 (slightly smaller checks).</p>
          <p>Biweekly pay is not the same as twice a month: 26 checks against 24. If you budget by the month on biweekly pay, two months a year bring a third check.</p>
          </div>`,
        faqs: [
          ["How many biweekly pay periods are there in 2026?", `26 for most people. ${p26.filter((day) => day.biweeklyMax === 27).map((day) => `It is 27 only if you are paid on ${day.name}s and your first payday is ${fmt(day.firstDate)}, 2026`).join("; ")}.`],
          ["How many weeks are in a work year?", "52, which at 40 hours a week is 2,080 hours."],
          ["Is it better to be paid weekly or biweekly?", "The yearly pay and tax are the same. Weekly pay smooths cash flow; biweekly and monthly pay mean larger, less frequent checks."],
        ],
      }),
    );
  }

  /* 10. state payroll taxes */
  {
    const rows = tables.payroll.programs
      .slice()
      .sort((a, b) => ctx.byId[a.state].name.localeCompare(ctx.byId[b.state].name))
      .map((row) => {
        const state = ctx.byId[row.state];
        const cost = Math.min(row.annualMax ?? Infinity, Math.min(85000, row.wageBase ?? Infinity) * row.employeeRate);
        return `<tr><th scope="row"><a href="${statePath(state)}">${esc(state.name)}</a></th><td>${esc(row.name)}${row.upTo ? " <small>(up to)</small>" : ""}</td><td class="num">${pct(row.employeeRate, 4)}</td><td>${row.wageBase ? `first ${usd0(row.wageBase)}` : row.annualMax ? `max ${usd(row.annualMax)} a year` : "all pay"}</td><td class="num">${usd(cost)}</td></tr>`;
      })
      .join("");
    guides.push(
      guide(ctx, {
        slug: "state-payroll-taxes-2026",
        crumb: "State payroll deductions",
        blurb: "SDI, paid family leave and other state lines",
        title: "State Payroll Taxes for 2026: SDI, Paid Family Leave and More | LocalTakehome",
        description: "The 2026 employee rates for state disability insurance, paid family and medical leave and other state payroll deductions, state by state.",
        h1: "State payroll deductions in 2026",
        lede: "Besides income tax, some states take a premium from every paycheck for disability insurance, paid family leave, unemployment insurance or long-term care.",
        body: `<div class="table-wrap"><table><caption>Employee's share. The last column is the cost for the year on an ${usd0(85000)} salary.</caption><thead><tr><th scope="col">State</th><th scope="col">Deduction</th><th scope="col" class="num">Employee rate</th><th scope="col">Charged on</th><th scope="col" class="num">On ${usd0(85000)}</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <p class="fine">“Up to” means the law lets an employer take that much from pay. Some employers pay part or all of it themselves, so your stub may show less.</p>
          <h2>What these pay for</h2>
          <p><strong>Disability insurance (SDI, TDI)</strong> replaces part of your pay if illness or injury outside work stops you working. <strong>Paid family and medical leave (PFL, PFML, FAMLI)</strong> pays you while you care for a new child or a seriously ill relative, or recover from your own illness. A few states take a small <strong>unemployment insurance</strong> contribution from workers as well as employers.</p>
          <p>These lines are not income tax and are not reduced by the standard deduction. Most are charged on pay up to a yearly limit.</p>
          </div>`,
        faqs: [
          ["What is SDI on my paycheck?", "State disability insurance. In California it is 1.3% of all pay in 2026 and also funds paid family leave."],
          ["Do all states have paid family leave deductions?", "No. Only the states in the table take one from employees in this calculator."],
        ],
      }),
    );
  }

  /* 11. gross vs net */
  {
    const r = run({ grossAnnual: 60000, state: "OH", localId: "columbus-oh" });
    guides.push(
      guide(ctx, {
        slug: "gross-pay-vs-net-pay",
        crumb: "Gross pay and net pay",
        blurb: "The difference, and how to get from one to the other",
        title: "Gross Pay vs Net Pay: The Difference and How to Work It Out (2026) | LocalTakehome",
        description: "Gross pay is what you earn; net pay is what you take home. How to get from one to the other in 2026, with a worked example.",
        h1: "Gross pay and net pay",
        lede: "Gross pay is the headline number on a job offer. Net pay is what reaches your bank account. Taxes and deductions are the difference.",
        body: `<div class="prose">
          <h2>From gross to net</h2>
          <p>Net pay = gross pay − before-tax deductions − taxes − after-tax deductions.</p>
          <p>For example, someone earning ${usd0(60000)} a year and living in Columbus, Ohio pays ${usd0(r.annual.federalIncome)} in federal income tax, ${usd0(r.annual.socialSecurity + r.annual.medicare)} for Social Security and Medicare, ${usd0(r.annual.stateIncome)} in Ohio income tax and ${usd0(r.annual.local)} in Columbus city tax. Net pay is ${usd0(r.annual.net)} a year, or ${usd(r.periodNet)} every two weeks: ${usd(r.keepPer100)} of every $100 earned.</p>
          <h2>Which number to use when</h2>
          <ul>
            <li><strong>Job offers and salary negotiations</strong> are in gross pay.</li>
            <li><strong>Budgets</strong> should be built on net pay.</li>
            <li><strong>Mortgage and rental applications</strong> usually ask for gross income.</li>
            <li><strong>Tax returns</strong> start from gross pay, less before-tax deductions (box 1 of your W-2).</li>
          </ul>
          <p>As a rough guide, net pay is 70% to 85% of gross pay for most full-time workers, depending on income, state and benefits. The <a href="/">calculator</a> gives the exact figure, and the <a href="/take-home-to-salary/">salary needed calculator</a> works backwards from net to gross.</p>
          </div>`,
        faqs: [
          ["Is take-home pay the same as net pay?", "Yes. Both mean what is left after taxes and deductions."],
          ["Is salary gross or net?", "A quoted salary is gross: before taxes and deductions."],
        ],
      }),
    );
  }

  const index = {
    path: "/guides/",
    section: "/guides/",
    title: "Paycheck and Payroll Tax Guides for 2026 | LocalTakehome",
    description: "Plain-English guides to 2026 paychecks: federal brackets, state tax rates, Social Security and Medicare, the tips and overtime deductions, pay stubs and more.",
    trail: [{ label: "Guides" }],
    body: `<div class="wrap page">
    <header class="mast"><p class="kicker">Tax year 2026</p><h1>Guides</h1>
    <p class="lede">Short, plain-English explanations of what comes out of a paycheck and why, with every figure taken from the same 2026 rate tables as the calculator.</p></header>
    ${cardGrid(guides.map((page) => page.card))}
    <div class="below"><h2>Reference</h2>${cardGrid([
      { href: "/states/", label: "State pages", blurb: "Rates and rules for each state" },
      { href: "/local-taxes/", label: "City and county taxes", blurb: `All ${ctx.locals.length} local income taxes covered` },
      { href: "/map/", label: "Take-home pay by state", blurb: "Ranked for any salary" },
      { href: "/methodology/", label: "How the calculator works", blurb: "Formulas, sources and limits" },
      { href: "/updates/", label: "Updates and corrections", blurb: "What changed and when" },
    ])}</div>
  </div>`,
  };

  return [index, ...guides];
}
