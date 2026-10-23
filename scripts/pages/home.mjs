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
    ["Why is local tax sometimes zero?", `Local income tax is added only when you choose a city or county, or type in your own local percentage. The calculator covers ${localCount} local income taxes in ${localStates} states. It never guesses a rate for a place it does not have.`],
    ["Does a 401(k) lower Social Security and Medicare?", "No. A traditional 401(k) lowers federal income tax and, in most states, state income tax. Social Security and Medicare are still charged on the full amount. Health insurance premiums and HSA contributions taken through your employer do lower them."],
    ["Does it include the new deductions for tips and overtime?", `Yes. From 2025 through 2028 you can deduct up to ${usd0(fed.workerDeductions.tipsMax)} of tips and up to ${usd0(fed.workerDeductions.overtimeMax.single)} of overtime premium pay (${usd0(fed.workerDeductions.overtimeMax.mfj)} on a joint return) from federal taxable income. Enter tips or overtime and the deduction is applied, along with your state's own rule where it has one. You can switch it off to see the difference.`],
    ["Why do two calculators give different answers?", "Some copy the withholding tables employers use, some spread the year's tax evenly as this one does, and many skip city taxes or use last year's state rates. This site shows the working for every line, links the official source for every rate, and dates each check."],
    ["I work in New York City but live in New Jersey. Do I pay the city tax?", "No. New York City income tax is charged to people who live in the five boroughs. Choose your home state and leave the city unselected. You may still owe New York State tax on wages earned there, which this estimate does not work out."],
    ["Why is so much taken from my bonus?", `Employers usually withhold federal tax from bonuses at a flat ${pct(fed.limits.supplementalWithholdingRate)}, plus Social Security, Medicare and state tax. That is a withholding rule, not a higher tax on bonuses. If ${pct(fed.limits.supplementalWithholdingRate)} is more than the bonus really adds to your tax, the difference comes back as a refund. The <a href="/guides/bonus-tax-withholding/">bonus withholding guide</a> explains it.`],
    ["Do states with no income tax take nothing from a paycheck?", `No. Federal income tax, Social Security (${pct(fica.socialSecurity.employeeRate)} up to ${usd0(fica.socialSecurity.wageBase)}) and Medicare (${pct(fica.medicare.employeeRate)}) apply everywhere. A few states without an income tax still take small payroll premiums, such as Washington's paid leave and long-term care programs.`],
  ];

  const tools = TOOL_LINKS.map((item) => ({ href: item.href, label: item.label, blurb: item.blurb }));
  const popularStates = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA"].map((id) => ({ href: statePath(ctx.byId[id]), label: ctx.byId[id].name }));
  const salaries = [40000, 50000, 60000, 75000, 100000, 150000].map((amount) => ({ href: salaryPath(amount), label: `${usd0(amount)} after taxes` }));
  const single = fed.brackets.single;

  /* Why a local calculator: the same salary in the same state, different places. */
  const range = (stateId, field = "residentRate") => {
    const vals = ctx.locals.filter((row) => row.state === stateId && typeof row[field] === "number").map((row) => row[field]);
    return [Math.min(...vals), Math.max(...vals)];
  };
  const localById = (id) => ctx.locals.find((row) => row.id === id);
  const inRange = range("IN");
  const mdRange = range("MD");
  const inLow = ctx.locals.filter((row) => row.state === "IN").find((row) => row.residentRate === inRange[0]);
  const inHigh = ctx.locals.filter((row) => row.state === "IN").find((row) => row.residentRate === inRange[1]);
  const mdLow = ctx.locals.filter((row) => row.state === "MD" && typeof row.residentRate === "number").find((row) => row.residentRate === mdRange[0]);
  const mdHigh = ctx.locals.filter((row) => row.state === "MD" && typeof row.residentRate === "number").find((row) => row.residentRate === mdRange[1]);
  const placeName = (row) => row.name.replace(/, (Indiana|Maryland|Ohio|Missouri|Delaware)$/, "");
  const pairs = [
    { state: "NY", a: null, aLabel: "Albany, Buffalo or anywhere outside New York City", b: "nyc", bLabel: "New York City resident" },
    { state: "PA", a: "pittsburgh", aLabel: "Pittsburgh resident", b: "philadelphia", bLabel: "Philadelphia resident" },
    { state: "MI", a: null, aLabel: "Most of Michigan (no city income tax)", b: "detroit", bLabel: "Detroit resident" },
    { state: "MD", a: mdLow.id, aLabel: `${placeName(mdLow)} resident`, b: mdHigh.id, bLabel: `${placeName(mdHigh)} resident` },
    { state: "IN", a: inLow.id, aLabel: `${placeName(inLow)} resident`, b: inHigh.id, bLabel: `${placeName(inHigh)} resident` },
    { state: "MO", a: null, aLabel: "Springfield or anywhere outside the two cities", b: "kansas-city-mo", bLabel: "Kansas City resident" },
  ];
  const pairRows = pairs
    .map((pair) => {
      const a = run({ grossAnnual: 85000, state: pair.state, ...(pair.a ? { localId: pair.a } : {}) });
      const b = run({ grossAnnual: 85000, state: pair.state, localId: pair.b });
      const gap = a.annual.net - b.annual.net;
      return `<tr><th scope="row"><a href="${statePath(ctx.byId[pair.state])}">${ctx.byId[pair.state].name}</a></th><td>${pair.aLabel}<br><small>${usd0(a.annual.local)} local tax · keeps ${usd0(a.annual.net)}</small></td><td>${pair.bLabel}<br><small>${usd0(b.annual.local)} local tax · keeps ${usd0(b.annual.net)}</small></td><td class="num">${usd0(Math.abs(gap))}</td></tr>`;
    })
    .join("");
  const nycRates = localById("nyc").brackets.single;
  const why = `<section class="prose wide explainer" id="why-local">
    <div class="prose">
      <h2>Why you need a paycheck calculator that knows your city</h2>
      <p>Most paycheck calculators stop at the state line. They take your salary, subtract federal tax, Social Security, Medicare and one state income tax, and call the result your take-home pay. For many people that is wrong, because <strong>in a large part of the country the city, county or school district you live or work in takes its own share of your wages.</strong></p>
      <p>Local income taxes are not rare. The <a href="https://taxfoundation.org/research/all/state/local-income-taxes-2023/" rel="noopener">Tax Foundation</a> counts them in more than a dozen states, levied by thousands of cities, counties, school districts and special districts. They go by different names: wage tax, earnings tax, earned income tax (EIT), occupational license tax, occupational privilege tax, or simply city or county income tax. Each sets its own rate, decides whether it taxes residents, commuters or both, and decides which part of your pay counts. So two people with the same salary in the same state can take home very different amounts, and moving a few miles can change your paycheck by hundreds or thousands of dollars a year.</p>
      <h3>Same salary, same state, different take-home</h3>
      <p>Each row compares two single people earning ${usd0(85000)} a year in the same state, with the same federal and state tax. The only difference is the local tax where they live.</p>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">State</th><th scope="col">Lives in</th><th scope="col">Lives in</th><th scope="col" class="num">Difference a year</th></tr></thead><tbody>${pairRows}</tbody></table></div>
    <div class="prose">
      <h3>Where local wage taxes show up</h3>
      <ul>
        <li><strong>New York:</strong> New York City residents pay a city income tax of ${pct(nycRates[0].rate, 3)} to ${pct(nycRates[nycRates.length - 1].rate, 3)} on top of state tax. Yonkers adds a resident surcharge and a tax on people who work there.</li>
        <li><strong>Pennsylvania:</strong> almost every municipality and school district charges a local earned income tax. Philadelphia's wage tax is ${pct(localById("philadelphia").residentRate, 3)} for residents, and Pittsburgh-area residents pay ${pct(localById("pittsburgh").residentRate)} combined.</li>
        <li><strong>Ohio:</strong> hundreds of cities and villages, including Columbus, Cleveland and Cincinnati, tax wages, and many school districts add their own income tax.</li>
        <li><strong>Maryland and Indiana:</strong> every county charges an income tax, from ${pct(mdRange[0])} to ${pct(mdRange[1])} in Maryland and ${pct(inRange[0])} to ${pct(inRange[1])} in Indiana.</li>
        <li><strong>Michigan:</strong> about two dozen cities tax income, led by Detroit at ${pct(localById("detroit").residentRate)} for residents.</li>
        <li><strong>Kentucky:</strong> many cities and counties charge an occupational license tax on wages earned there, such as Louisville at ${pct(localById("louisville-ky").residentRate)} for residents.</li>
        <li><strong>Missouri:</strong> Kansas City and St. Louis charge a ${pct(localById("kansas-city-mo").residentRate)} earnings tax on residents and commuters.</li>
        <li><strong>Oregon:</strong> Portland-area residents with higher incomes owe Metro and Multnomah County income taxes, and every worker pays the statewide transit tax.</li>
        <li><strong>Delaware, Colorado and Alabama:</strong> Wilmington has a ${pct(localById("wilmington-de").residentRate)} wage tax, Denver and a few nearby cities charge a flat monthly occupational privilege tax, and Birmingham and other Alabama cities charge occupational taxes.</li>
        <li><strong>Elsewhere:</strong> Iowa school districts add a surtax to state tax, some West Virginia cities charge weekly service fees, and Newark and Jersey City charge payroll taxes that employers pay.</li>
      </ul>
      <h3>What this calculator does about it</h3>
      <p>LocalTakehome includes ${localCount} city and county income taxes in ${localStates} states, each with its 2026 rate, its rules about who pays, and a link to the official source. Pick your place and the local tax appears as its own line, worked out on the right part of your pay. If your city is not on the list, open "W-4 and other details" and enter its rate. Nothing is ever guessed: a local tax is added only when you choose it.</p>
      <p><a href="/local-taxes/">See every local tax in the calculator</a> · <a href="/guides/local-income-taxes/">Local income taxes explained</a> · <a href="/cities/">City paycheck calculators</a></p>
    </div>
  </section>`;

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
    description: `Free 2026 paycheck calculator for all 50 states, D.C. and ${localCount} city and county income taxes. See every tax line. Nothing you type leaves your browser.`,
    h1: "Paycheck calculator",
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">2026 paycheck calculator · all 50 states and D.C.</p>
      <h1>What do you actually take home?</h1>
      <p class="lede">Enter your pay and where you live. See every tax line on your paycheck, including the city and county taxes most calculators skip.</p>
      <p class="mast-note"><span>Runs in your browser. Nothing you type is uploaded.</span><span>Rates checked against official sources on ${ctx.verifiedLong}.</span></p>
    </header>
    ${calculatorBlock(ctx)}
    <div class="below">
      ${why}
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
