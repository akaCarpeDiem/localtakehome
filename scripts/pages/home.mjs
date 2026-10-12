/** The home page and the other pages that carry the full calculator. */
import { TOOL_LINKS, faqHTML, faqLd } from "../lib/layout.mjs";
import { calculatorBlock, cardGrid, linkList, pct, salaryPath, statePath, usd, usd0 } from "../lib/shared.mjs";
import { TOOLS } from "../../src/js/tools.mjs";

export function homePages(ctx) {
  const { tables, run } = ctx;
  const fed = tables.federal;
  const fica = tables.fica;
  const ca = run({ grossAnnual: 85000, state: "CA" });
  const tx = run({ grossAnnual: 85000, state: "TX" });
  const nyc = run({ grossAnnual: 85000, state: "NY", localId: "nyc" });
  const localCount = ctx.locals.length;
  const localStates = new Set(ctx.locals.map((row) => row.state)).size;

  const faqs = [
    ["Is my salary sent anywhere?", "No. The tax tables load with the page and all of the arithmetic happens in your browser. Your last inputs are remembered on your own device so they are there next time, and you can clear them with one click."],
    ["Is this my exact paycheck?", "It is a close estimate, not a copy of your pay stub. It works out the tax for the whole year and spreads it evenly across your paychecks, which is how withholding is designed to work. Your employer's payroll system, your W-4 and benefits this page does not know about can move the real figure by a few dollars."],
    ["Why is local tax sometimes zero?", `Local income tax is added only when you choose a city or county, or type in your own local percentage. The calculator covers ${localCount} local income taxes in ${localStates} states and the District of Columbia. It never guesses a rate for a place it does not have.`],
    ["Does a 401(k) lower Social Security and Medicare?", "No. A traditional 401(k) lowers federal income tax and, in most states, state income tax. Social Security and Medicare are still charged on the full amount. Health insurance premiums and HSA contributions taken through your employer do lower them."],
    ["Does it include the new deductions for tips and overtime?", "Yes. From 2025 through 2028 you can deduct up to $25,000 of tips and up to $12,500 of overtime premium pay ($25,000 on a joint return) from federal taxable income. Enter tips or overtime and the deduction is applied. You can switch it off to see the difference."],
    ["Why do two calculators give different answers?", "Some copy the withholding tables employers use, some spread the year's tax evenly as this one does, and many skip city taxes or use last year's state rates. This site shows the working for every line, links the official source for every rate, and dates each check."],
    ["I work in New York City but live in New Jersey. Do I pay the city tax?", "No. New York City income tax is charged to people who live in the five boroughs. Choose your home state and leave the city unselected. You may still owe New York State tax on wages earned there, which this estimate does not work out."],
    ["Why is so much taken from my bonus?", "Employers usually withhold federal tax from bonuses at a flat 22%, plus Social Security, Medicare and state tax. That is a withholding rule, not a higher tax on bonuses. If 22% is more than the bonus really adds to your tax, the difference comes back as a refund."],
    ["Do states with no income tax take nothing from a paycheck?", `No. Federal income tax, Social Security (${pct(fica.socialSecurity.employeeRate)} up to ${usd0(fica.socialSecurity.wageBase)}) and Medicare (${pct(fica.medicare.employeeRate)}) apply everywhere. A few states without an income tax still take small payroll premiums, such as Washington's paid leave and long-term care programs.`],
  ];

  const tools = TOOL_LINKS.map((item) => ({ href: item.href, label: item.label, blurb: item.blurb }));
  const popularStates = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA"].map((id) => ({ href: statePath(ctx.byId[id]), label: ctx.byId[id].name }));
  const salaries = [40000, 50000, 60000, 75000, 100000, 150000].map((amount) => ({ href: salaryPath(amount), label: `${usd0(amount)} after taxes` }));
  const single = fed.brackets.single;

  const guide = `<section class="prose" id="how-it-works">
    <h2>How take-home pay is worked out in 2026</h2>
    <p>Take-home pay, or net pay, is what is left of your pay after taxes and deductions. Every paycheck goes through the same steps.</p>
    <ol class="steps">
      <li><h3>Start with pay for the year</h3><p>A salary is used as it is. Hourly pay is the rate times hours a week times paid weeks, plus overtime. Tips and bonuses are added. Working with the whole year lets the tax brackets see your real income; the result is then divided by your number of paychecks: 52, 26, 24 or 12.</p></li>
      <li><h3>Take off before-tax deductions</h3><p>A traditional 401(k), 403(b) or TSP contribution lowers the pay that income tax is charged on, but not Social Security or Medicare. Health, dental and vision premiums, HSA and FSA contributions usually lower both. Roth contributions come out after tax and change no tax line.</p></li>
      <li><h3>Federal income tax</h3><p>The 2026 standard deduction is ${usd0(fed.standardDeduction.single)} for single filers, ${usd0(fed.standardDeduction.mfj)} for married couples filing jointly and ${usd0(fed.standardDeduction.hoh)} for heads of household. Income above that is taxed in bands: for a single filer, ${single.map((row, i) => `${pct(row.rate)} ${i < single.length - 1 ? `up to ${usd0(single[i + 1].over)}` : "above that"}`).join(", ")}. Only the dollars inside a band are taxed at its rate, so a raise never lowers take-home pay. Each child under 17 takes ${usd0(fed.credits.childTaxCredit)} off the tax.</p></li>
      <li><h3>Social Security and Medicare</h3><p>Social Security is ${pct(fica.socialSecurity.employeeRate)} of pay up to ${usd0(fica.socialSecurity.wageBase)}, so the most anyone pays in 2026 is ${usd0(fica.socialSecurity.wageBase * fica.socialSecurity.employeeRate)}. Medicare is ${pct(fica.medicare.employeeRate)} of all pay, plus ${pct(fica.additionalMedicare.rate)} on pay above ${usd0(fica.additionalMedicare.thresholds.single)} (${usd0(fica.additionalMedicare.thresholds.mfj)} for joint filers).</p></li>
      <li><h3>State income tax and state payroll programs</h3><p>Nine states do not tax wages: Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming. The rest use a flat rate or brackets, each with its own deductions, exemptions and quirks, all of which are on the <a href="/states/">state pages</a>. Some states also take premiums for disability or paid family leave, such as California's SDI.</p></li>
      <li><h3>City and county income tax</h3><p>Some places add their own: New York City, Philadelphia, Detroit, every county in Indiana and Maryland, the largest Ohio cities and others. The <a href="/local-taxes/">local tax guide</a> lists all ${localCount} that this calculator covers.</p></li>
      <li><h3>What is left is yours</h3><p>On ${usd0(85000)} a year, a single person in California pays about ${usd0(ca.annual.federalIncome)} in federal income tax, ${usd0(ca.annual.socialSecurity + ca.annual.medicare)} for Social Security and Medicare, ${usd0(ca.annual.stateIncome)} in California income tax and ${usd0(ca.annual.statePayroll)} for state disability insurance, leaving ${usd0(ca.annual.net)}: ${usd(ca.periodNet)} every two weeks. In Texas the same salary leaves ${usd0(tx.annual.net)}. For someone living in New York City it leaves ${usd0(nyc.annual.net)}.</p></li>
    </ol>
    <h3>What the estimate leaves out</h3>
    <p>It is an estimate of a regular paycheck, not a tax return. It leaves out itemized deductions, credits other than those for children and dependents, tax owed to a second state, wage garnishments, and sales or property tax. Before changing your withholding, check with the <a href="https://www.irs.gov/individuals/tax-withholding-estimator" rel="noopener">IRS Tax Withholding Estimator</a> or a tax professional. The <a href="/methodology/">method page</a> sets out every formula and source.</p>
  </section>`;

  const home = {
    path: "/",
    kind: "calculator",
    title: "Paycheck Calculator 2026: Take-Home Pay by State and City | LocalTakehome",
    description: `Free 2026 take-home pay calculator for all 50 states, D.C. and ${localCount} city and county income taxes. See federal, state and local tax line by line. Nothing you type leaves your browser.`,
    h1: "Paycheck calculator",
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026 · all 50 states and D.C.</p>
      <h1>What do you actually take home?</h1>
      <p class="lede">Enter your pay and where you live. See every tax line on your paycheck, including the city and county taxes most calculators skip.</p>
      <p class="mast-note"><span>Runs in your browser. Nothing you type is uploaded.</span><span>Rates checked against official sources on ${ctx.verifiedLong}.</span></p>
    </header>
    ${calculatorBlock(ctx)}
    <div class="below">
      <section>
        <div class="section-head"><h2>More calculators</h2></div>
        ${cardGrid(tools)}
      </section>
      <section>
        <div class="section-head"><h2>Take-home pay by state</h2><a href="/map/">Rank all states for your salary</a></div>
        <p class="lede">The same ${usd0(85000)} salary leaves very different amounts depending on the state. Darker states keep more.</p>
        ${TOOLS.rank.out(tables, { salary: "85000", status: "single", kids: "" }).match(/<div class="tilemap"[\s\S]*?<\/p>/)[0]}
        ${linkList(popularStates)}
        <p><a href="/states/">All 50 states and D.C.</a> · <a href="/cities/">Cities</a></p>
      </section>
      ${guide}
      <section>
        <h2>Popular salaries</h2>
        ${linkList(salaries)}
        <p><a href="/salary/">More salaries after tax</a> · <a href="/hourly/">Hourly wages after tax</a></p>
      </section>
      ${faqHTML(faqs)}
    </div>
  </div>`,
  };

  const paycheck = {
    path: "/paycheck-calculator/",
    kind: "calculator",
    title: "U.S. Paycheck Calculator 2026 | LocalTakehome",
    description: "Work out a 2026 paycheck for any U.S. state: federal income tax, Social Security, Medicare, state and local tax, 401(k) and benefits, line by line.",
    h1: "Paycheck calculator",
    trail: [{ label: "Paycheck calculator" }],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>Paycheck calculator</h1>
      <p class="lede">One paycheck, line by line: what you earn, what each tax takes, and what reaches your bank account.</p>
    </header>
    ${calculatorBlock(ctx, {}, { examples: false })}
    <div class="below prose">
      <h2>What each line on a paycheck means</h2>
      <p><strong>Gross pay</strong> is what you earn before anything is taken out. <strong>Before-tax deductions</strong> such as a 401(k) or health premium come off first and lower some taxes. <strong>Federal income tax</strong> depends on your filing status and the year's income. <strong>Social Security and Medicare</strong> are flat percentages. <strong>State and local taxes</strong> depend on where you live. What is left is your <strong>take-home pay</strong>.</p>
      <p>The <a href="/guides/how-to-read-a-pay-stub/">pay stub guide</a> goes through a real stub one line at a time, and each <a href="/states/">state page</a> lists that state's rates.</p>
    </div>
  </div>`,
  };

  return [home, paycheck];
}
