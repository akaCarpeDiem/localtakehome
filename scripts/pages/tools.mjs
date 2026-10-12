/** The smaller calculators, each on its own page, plus the hourly and W-4 versions of the main one. */
import { faqHTML, faqLd } from "../lib/layout.mjs";
import { calculatorBlock, cardGrid, pct, toolBlock, usd, usd0 } from "../lib/shared.mjs";
import { TOOL_LINKS } from "../lib/layout.mjs";
import { grossForNet } from "../../src/js/engine.mjs";
import { rankStates } from "../../src/js/tools.mjs";

function related(path) {
  return `<section><h2>More calculators</h2>${cardGrid(TOOL_LINKS.filter((item) => item.href !== path).slice(0, 8))}</section>`;
}

function toolPage(ctx, def) {
  const faqs = def.faqs || [];
  return {
    path: def.path,
    kind: "tool",
    title: def.title,
    description: def.description,
    h1: def.h1,
    trail: [{ label: def.crumb || def.h1 }],
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>${def.h1}</h1>
      <p class="lede">${def.lede}</p>
    </header>
    ${toolBlock(ctx, def.tool, def.defaults || {})}
    <div class="below">
      <section class="prose">${def.prose}</section>
      ${faqHTML(faqs)}
      ${related(def.path)}
    </div>
  </div>`,
  };
}

export function toolPages(ctx) {
  const { tables, run } = ctx;
  const fed = tables.federal;
  const fica = tables.fica;
  const wd = fed.workerDeductions;
  const limit = fed.limits.electiveDeferral401k;

  const pages = [];
  const needs = ctx.states.map((state) => ({ name: state.name, gross: grossForNet(60000, { state: state.id, filingStatus: "single" }, tables).gross })).sort((x, y) => x.gross - y.gross);
  const need5k = { low: Math.round(needs[0].gross / 100) * 100, high: Math.round(needs.at(-1).gross / 100) * 100, highName: needs.at(-1).name };
  const worstMid = rankStates(tables, { salary: "85000", status: "single", kids: "" }).slice(-2).reverse().map((row) => row.state.name);
  const worstHigh = rankStates(tables, { salary: "1000000", status: "single", kids: "" }).at(-1).state.name;

  /* hourly: the main calculator, starting in hourly mode */
  const h25 = run({ payType: "hourly", hourlyRate: 25, hoursPerWeek: 40, state: "PA" });
  const hourlyFaqs = [
    ["How do I work out my yearly pay from an hourly wage?", "Multiply the hourly rate by the hours you work in a week, then by the weeks you are paid in a year. At 40 hours a week for 52 weeks that is 2,080 hours, so $25 an hour is $52,000 a year before taxes."],
    ["How is overtime taxed?", `Overtime is taxed like any other pay, at whatever rates your total income reaches. From 2025 through 2028 the premium part of overtime pay (the extra half in time-and-a-half) can be deducted from federal taxable income, up to ${usd0(wd.overtimeMax.single)} a year. The calculator applies that when you enter overtime hours.`],
    ["What if my hours change from week to week?", "Enter your typical week, or switch “Hours above are for” to “One paycheck” and enter the hours on a particular check. The calculator then treats every paycheck in the year as the same as that one."],
    ["Can I enter night or weekend rates?", "Yes. Choose “Add them line by line” under the hours and enter each rate with its own hours."],
  ];
  pages.push({
    path: "/hourly-paycheck-calculator/",
    kind: "calculator",
    title: "Hourly Paycheck Calculator 2026: Take-Home Pay After Taxes",
    description: "Turn an hourly wage into take-home pay for 2026. Enter your rate, hours and overtime, pick your state and city, and see every tax line on the paycheck.",
    h1: "Hourly paycheck calculator",
    trail: [{ label: "Hourly paycheck calculator" }],
    ld: [faqLd(hourlyFaqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>Hourly paycheck calculator</h1>
      <p class="lede">Enter your hourly rate and your hours. Add overtime, night or weekend rates if you have them, and see what reaches your bank account.</p>
    </header>
    ${calculatorBlock(ctx, { payType: "hourly", state: "TX" }, { examples: false })}
    <div class="below">
      <section class="prose">
        <h2>From an hourly wage to a paycheck</h2>
        <p>The calculator multiplies your rate by your weekly hours and paid weeks to get the year's pay, works out each tax on that, and divides the result by your number of paychecks. Overtime hours are paid at the multiplier you enter, normally 1.5 times the regular rate for hours over 40 in a week.</p>
        <p>For example, ${usd(25)} an hour for 40 hours a week is ${usd0(h25.annual.gross)} a year. For a single person in Pennsylvania that leaves about ${usd0(h25.annual.net)} after tax: ${usd(h25.periodNet)} every two weeks, or ${usd(h25.annual.net / 2080)} for each hour worked.</p>
        <p>To switch between hourly, monthly and yearly pay without the tax detail, use the <a href="/salary-to-hourly/">salary to hourly converter</a>. To see what an extra shift is worth, use the <a href="/overtime-calculator/">overtime calculator</a>.</p>
      </section>
      ${faqHTML(hourlyFaqs)}
      <section><h2>Common hourly wages after tax</h2><p class="link-cloud">${[15, 18, 20, 22, 25, 30, 35, 40, 50].map((rate) => `<a href="/hourly/${rate}/">$${rate} an hour</a>`).join(" ")}</p></section>
      ${related("/hourly-paycheck-calculator/")}
    </div>
  </div>`,
  });

  /* W-4: the main calculator with the W-4 section open */
  const w4Faqs = [
    ["Should I claim 0 or 1?", "That question belongs to the old form. Since 2020 the W-4 has no allowances. You give your filing status, tick a box if you have two jobs or a working spouse, and enter dollar amounts for dependents, other income, deductions and any extra withholding."],
    ["How do I get more money in each paycheck?", "Make sure Step 3 includes the credit for each child, and enter expected deductions in Step 4(b), including the new deductions for tips and overtime if you qualify. Less tax is then withheld. If too little is withheld over the year you will owe the difference, and possibly a penalty, when you file."],
    ["How do I stop owing tax every April?", "Tick the Step 2 box if you or your spouse have a second job, or put a flat extra amount per paycheck in Step 4(c). The calculator shows what either does to your take-home pay."],
    ["Does changing my W-4 change my state withholding?", "Not always. Many states have their own withholding form. Check with your employer's payroll department."],
  ];
  pages.push({
    path: "/w4-calculator/",
    kind: "calculator",
    title: "W-4 Calculator 2026: How Each Step Changes Your Paycheck | LocalTakehome",
    description: "See how the entries on a 2026 Form W-4 change your paycheck: filing status, two jobs, dependents, other income, deductions and extra withholding.",
    h1: "W-4 calculator",
    trail: [{ label: "W-4 calculator" }],
    ld: [faqLd(w4Faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>W-4 calculator</h1>
      <p class="lede">Form W-4 tells your employer how much federal income tax to hold back. Change an entry below and watch what it does to your paycheck.</p>
    </header>
    ${calculatorBlock(ctx, { state: "TX", openW4: true }, { examples: false })}
    <div class="below">
      <section class="prose">
        <h2>What each step of the W-4 does</h2>
        <ul>
          <li><strong>Step 1, filing status.</strong> Sets the standard deduction and the width of the tax brackets used for withholding. In 2026 the standard deduction is ${usd0(fed.standardDeduction.single)} single, ${usd0(fed.standardDeduction.mfj)} married filing jointly and ${usd0(fed.standardDeduction.hoh)} head of household.</li>
          <li><strong>Step 2, two jobs or a working spouse.</strong> When the box is ticked, each job withholds as if it had half the standard deduction and brackets half as wide, so that two incomes are not each taxed as if they were the only one. In the calculator this is the “Two jobs” box.</li>
          <li><strong>Step 3, dependents.</strong> A dollar amount for the year: ${usd0(fed.credits.childTaxCredit)} for each child under 17 and ${usd0(fed.credits.otherDependentCredit)} for each other dependent. Enter the number of children and dependents in the calculator and the credit is applied.</li>
          <li><strong>Step 4(a), other income.</strong> Income with no withholding, such as interest or a side job, so the tax on it is collected through your paycheck.</li>
          <li><strong>Step 4(b), deductions.</strong> Deductions you expect beyond the standard deduction. For 2025 through 2028 this also covers the deductions for tips and overtime.</li>
          <li><strong>Step 4(c), extra withholding.</strong> A flat amount taken from every paycheck.</li>
        </ul>
        <h2>When to fill in a new W-4</h2>
        <p>When you start a job, marry or divorce, have a child, take a second job, start earning tips or overtime, or get a large refund or tax bill. Your employer uses the newest form you give them. For a full check against your own tax situation, use the <a href="https://www.irs.gov/individuals/tax-withholding-estimator" rel="noopener">IRS Tax Withholding Estimator</a>; this page shows how each entry moves a paycheck but does not fill in the form for you.</p>
      </section>
      ${faqHTML(w4Faqs)}
      ${related("/w4-calculator/")}
    </div>
  </div>`,
  });

  const defs = [
    {
      path: "/compare/",
      tool: "compare",
      crumb: "Compare two offers",
      title: "Compare Two Job Offers After Tax (2026): Salary and Location | LocalTakehome",
      description: "Compare two salaries in two places after 2026 federal, state and city taxes. See which offer leaves more, and the salary you would need to break even.",
      h1: "Compare two offers",
      lede: "Two salaries, two places. See which one leaves more in your pocket after federal, state and city taxes, and what salary would make them equal.",
      prose: `<h2>How to compare job offers in different places</h2>
        <p>A bigger salary does not always mean a bigger paycheck. State income tax runs from nothing to more than 13%, some cities add their own, and a few states take payroll premiums on top. This calculator runs both offers through the same 2026 tax rules and sets the results side by side.</p>
        <p>The <strong>break-even</strong> figure is the most useful one in a negotiation: it is the salary in the second place that would leave exactly the same take-home pay as the first.</p>
        <p>Taxes are only part of the picture. Rent, sales tax, property tax, insurance and commuting costs differ by place and are not counted here.</p>`,
      faqs: [
        ["How much more do I need to earn to move to a higher-tax state?", "Enter your current salary and state as offer A and the new state as offer B. The break-even figure is the salary in the new state that leaves the same take-home pay."],
        ["Does this include city taxes?", "Yes, when you choose a city or county for either offer. New York City, Philadelphia, Detroit, and every county in Indiana and Maryland are among those covered."],
        ["Does it include the cost of living?", "No. It compares paychecks after tax. Housing and other living costs need to be weighed separately."],
      ],
    },
    {
      path: "/bonus-calculator/",
      tool: "bonus",
      crumb: "Bonus calculator",
      title: "Bonus Tax Calculator 2026: How Much of a Bonus You Keep | LocalTakehome",
      description: "Work out what is left of a bonus after 2026 federal, state and local tax, and why the bonus check is often smaller than the tax you really owe on it.",
      h1: "Bonus calculator",
      lede: "See what a bonus adds to your take-home pay for the year, what the bonus check itself is likely to look like, and how much may come back at tax time.",
      prose: `<h2>Why bonus checks look so small</h2>
        <p>A bonus is ordinary income. On your tax return it is added to your salary and taxed at whatever rates the total reaches. But employers are allowed to withhold federal tax on bonuses at a flat ${pct(fed.limits.supplementalWithholdingRate)}, whatever your real rate is, and most do.</p>
        <p>If your salary puts you in the 12% bracket, the flat 22% takes too much and the difference comes back as a refund. If you are in the 24% bracket or higher, it takes too little and you may owe a little more. Social Security (${pct(fica.socialSecurity.employeeRate)}), Medicare (${pct(fica.medicare.employeeRate)}) and state tax come out of a bonus as well.</p>
        <p>This calculator shows both figures: what the bonus really adds to your year after tax, and what a typical bonus check pays out.</p>`,
      faqs: [
        ["Is a bonus taxed at a higher rate than salary?", "No. It is taxed like any other pay on your tax return. Only the withholding is different: a flat 22% for federal tax, which may be more or less than your real rate."],
        ["How can I keep more of my bonus?", "Putting part of it into a traditional 401(k) or an HSA, if your employer allows it, lowers the income tax on it. Social Security and Medicare still apply to 401(k) contributions."],
        ["What about bonuses over $1 million?", "Federal withholding is 37% on the part of the year's bonuses above $1 million."],
      ],
    },
    {
      path: "/raise-calculator/",
      tool: "raise",
      crumb: "Raise calculator",
      title: "Raise Calculator 2026: How Much of a Pay Raise You Keep | LocalTakehome",
      description: "See how much of a pay raise reaches your paycheck after 2026 federal, state and local tax, per paycheck and per year.",
      h1: "Raise calculator",
      lede: "Enter your pay now and after the raise. See how much more you take home each paycheck, and what share of the raise you keep.",
      prose: `<h2>How much of a raise do you keep?</h2>
        <p>A raise is taxed at your highest rates, because it sits on top of the pay you already earn. Someone in the 22% federal bracket pays 22% federal income tax on the raise, 7.65% for Social Security and Medicare, and state and local tax on top, so roughly 60 to 70 cents of each extra dollar reaches the bank.</p>
        <p>A raise can never leave you with less take-home pay through income tax. Moving into a higher bracket only changes the rate on the dollars above the line, not on the pay below it.</p>`,
      faqs: [
        ["Will a raise push me into a higher tax bracket and cost me money?", "No. Only the part of your income above the bracket line is taxed at the higher rate. Your take-home pay always rises with a raise."],
        ["How do I work out a raise as a percentage?", "Divide the increase by your current pay. A raise from $80,000 to $88,000 is $8,000 divided by $80,000, which is 10%. Type either the new salary or the percentage and the other fills in."],
      ],
    },
    {
      path: "/overtime-calculator/",
      tool: "overtime",
      crumb: "Overtime calculator",
      title: "Overtime Calculator 2026: After-Tax Pay and No Tax on Overtime",
      description: "Work out overtime pay after tax for 2026, including the federal deduction for overtime premium pay (no tax on overtime), in any state.",
      h1: "Overtime calculator",
      lede: "See what your overtime hours are worth after tax, and how much the federal overtime deduction saves you.",
      prose: `<h2>How overtime pay is taxed in 2026</h2>
        <p>Overtime is usually paid at one and a half times your regular rate for hours over 40 in a week. It is taxed like the rest of your pay, at whatever rates your total income reaches.</p>
        <h3>The overtime deduction (“no tax on overtime”)</h3>
        <p>For tax years 2025 through 2028 you can deduct the <strong>premium</strong> part of overtime pay from your federal taxable income. The premium is the extra half in time-and-a-half: if your regular rate is $28 and overtime pays $42, the premium is $14 an hour. The limit is ${usd0(wd.overtimeMax.single)} a year, or ${usd0(wd.overtimeMax.mfj)} on a joint return, and it shrinks by $${wd.phaseoutPer1000} for every $1,000 of income above ${usd0(wd.phaseoutStart.single)} (${usd0(wd.phaseoutStart.mfj)} joint).</p>
        <p>It lowers federal income tax only. Social Security and Medicare are still charged on all overtime pay, and most states still tax it. It is not available to married people filing separately.</p>
        <p>The <a href="/guides/no-tax-on-overtime/">guide to the overtime deduction</a> has the details and worked examples.</p>`,
      faqs: [
        ["Is overtime really tax free now?", "No. Only the premium part (the extra half) can be deducted, only from federal income tax, and only up to a yearly limit. Social Security, Medicare and most state income taxes still apply to all of it."],
        ["Will my paycheck show the saving?", "Only if your employer's withholding takes it into account, for example because you updated your W-4. Otherwise the same tax is withheld as before and you get the saving as a refund."],
        ["Does double time count?", "The deduction covers the overtime premium that federal law requires, which is the extra half of your regular rate. The calculator counts at most half the regular rate per overtime hour, whatever multiplier you enter."],
      ],
    },
    {
      path: "/no-tax-on-tips-calculator/",
      tool: "tips",
      crumb: "Tips calculator",
      title: "No Tax on Tips Calculator 2026: What the Tips Deduction Saves",
      description: "Work out how much the federal deduction for tips saves you in 2026 and what your take-home pay is with tips included, in any state.",
      h1: "Tips calculator",
      lede: "Enter your wages and tips to see how much the federal deduction for tips saves you, and your take-home pay with tips included.",
      prose: `<h2>How the tips deduction works</h2>
        <p>For tax years 2025 through 2028, people who work in jobs where tips are customary can deduct up to ${usd0(wd.tipsMax)} of qualified tips a year from federal taxable income. The limit shrinks by $${wd.phaseoutPer1000} for every $1,000 of income above ${usd0(wd.phaseoutStart.single)} (${usd0(wd.phaseoutStart.mfj)} on a joint return).</p>
        <p>Tips are still wages for Social Security and Medicare, so ${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)} still comes out, and most states still tax them. Mandatory service charges added to a bill are not tips. The deduction is not available to married people filing separately.</p>
        <p>The <a href="/guides/no-tax-on-tips/">guide to the tips deduction</a> explains who qualifies.</p>`,
      faqs: [
        ["Are tips tax free in 2026?", "Up to $25,000 of qualified tips can be deducted from federal taxable income. Social Security and Medicare still apply to every dollar of tips, and most states still tax them."],
        ["Do I still have to report my tips?", "Yes. Tips must still be reported to your employer and on your tax return. The deduction is claimed on the return."],
        ["Does my state tax tips?", "Most states that have an income tax still tax tips. The calculator applies a state deduction only where state law provides one."],
      ],
    },
    {
      path: "/401k-calculator/",
      tool: "401k",
      crumb: "401(k) calculator",
      title: "401(k) Paycheck Calculator 2026: What Saving Costs Your Paycheck",
      description: "See how a 401(k) contribution changes your 2026 paycheck: how much goes in, how much income tax you save, and how little your take-home pay falls.",
      h1: "401(k) calculator",
      lede: "Saving in a 401(k) costs your paycheck less than you put in, because the tax bill falls too. See the numbers for your salary.",
      prose: `<h2>Why a 401(k) costs less than it saves</h2>
        <p>Money you put into a traditional 401(k) is not counted for federal income tax this year, or for state income tax in most states. If you are in the 22% bracket, putting in $100 lowers your federal income tax by $22, so your paycheck falls by about $78. Social Security and Medicare are still charged on the full salary.</p>
        <p>The employee limit for 2026 is ${usd0(limit)}. People aged 50 or over can add catch-up contributions on top. An employer match is extra money that does not come out of your paycheck at all.</p>
        <p>A Roth 401(k) works the other way round: no tax saving now, but withdrawals in retirement are tax free. In the <a href="/">main calculator</a> you can enter both.</p>`,
      faqs: [
        ["How much should I put in my 401(k)?", "At least enough to get the full employer match, if there is one. Beyond that it depends on your budget; this calculator shows what each percentage costs your paycheck."],
        ["Does a 401(k) lower Social Security and Medicare?", "No. Those are charged on your full pay. Only income tax falls."],
        ["Do all states leave 401(k) contributions untaxed?", "Almost all. Pennsylvania taxes them when they are made. The calculator applies each state's rule."],
      ],
    },
    {
      path: "/take-home-to-salary/",
      tool: "reverse",
      crumb: "Salary needed",
      title: "What Salary Do I Need? Take-Home Pay to Salary Calculator 2026",
      description: "Start from the take-home pay you want and find the salary you need before taxes in 2026, for any state and city.",
      h1: "What salary do I need?",
      lede: "Start from the money you want to reach your bank account. This works backwards through 2026 federal, state and local tax to the salary you need.",
      prose: `<h2>From take-home pay back to salary</h2>
        <p>Budgets are built on take-home pay, but jobs are advertised by salary. This calculator closes the gap: enter the amount you need each month, paycheck or year, and it finds the salary that produces it after federal income tax, Social Security, Medicare, and your state's and city's taxes.</p>
        <p>It is useful when you are setting a salary target, moving to a state with different taxes, or working out what a pay rise needs to be to cover a new expense.</p>`,
      faqs: [
        ["What salary do I need to take home $5,000 a month?", `It depends on the state. For a single person in 2026 it ranges from about ${usd0(need5k.low)} in states with no income tax to about ${usd0(need5k.high)} in ${need5k.highName}, before any city tax. Choose your state above for the exact figure.`],
        ["How is this worked out?", "The calculator tries salaries until the take-home pay matches your target to the cent, using the same tax rules as the main calculator."],
      ],
    },
    {
      path: "/salary-to-hourly/",
      tool: "convert",
      crumb: "Salary to hourly",
      title: "Salary to Hourly Calculator 2026: Before and After Tax",
      description: "Convert a salary to an hourly wage, or hourly pay to a yearly salary, and see each figure before and after 2026 taxes.",
      h1: "Salary to hourly converter",
      lede: "Convert pay between hourly, daily, weekly, monthly and yearly, and see each amount before and after tax.",
      prose: `<h2>Converting between salary and hourly pay</h2>
        <p>A full-time year is usually counted as 40 hours a week for 52 weeks, which is 2,080 hours. So a salary divided by 2,080 gives the hourly rate, and an hourly rate times 2,080 gives the salary. $30 an hour is $62,400 a year; $75,000 a year is about $36.06 an hour.</p>
        <p>If you work different hours, or are not paid for holidays and time off, change the hours and weeks above. The after-tax column uses your state's 2026 taxes for a year at that pay.</p>`,
      faqs: [
        ["How many work hours are in a year?", "2,080 for a full-time job at 40 hours a week, paid for all 52 weeks."],
        ["How do I convert an annual salary to an hourly rate?", "Divide the salary by the hours you work in a year. For a standard full-time job that is the salary divided by 2,080."],
        ["Is $30 an hour good pay?", "It is $62,400 a year before tax at full-time hours. What that leaves after tax depends on your state, which the table above shows."],
      ],
    },
    {
      path: "/contractor-vs-w2/",
      tool: "contractor",
      crumb: "Contractor or employee",
      title: "1099 vs W-2 Calculator 2026: Contractor Pay Against a Salary | LocalTakehome",
      description: "Compare take-home pay as a 1099 contractor and as a W-2 employee in 2026, including self-employment tax, and find the contract rate that matches a salary.",
      h1: "Contractor or employee?",
      lede: "Compare what you keep as a 1099 contractor with what you keep on a salary, and see how much a contract needs to pay to match.",
      prose: `<h2>Why the same pay is worth less as a contractor</h2>
        <p>An employee pays ${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)} of pay for Social Security and Medicare, and the employer pays the same again. A contractor pays both halves, as self-employment tax: ${pct(fica.socialSecurity.selfEmployedRate + fica.medicare.selfEmployedRate, 1)} on ${pct(fica.selfEmploymentFactor)} of profit. Half of that is then deductible from income.</p>
        <p>Contractors also pay for their own health insurance, retirement savings, time off and equipment, and get no unemployment insurance. Business expenses come off before tax. And no tax is withheld: contractors pay estimated tax every quarter.</p>
        <p>The 20% deduction for qualified business income, which many contractors can claim, is not included, so the contractor figure here is on the cautious side.</p>`,
      faqs: [
        ["How much more should a contract pay than a salary?", "The calculator shows the contract income that gives the same take-home pay. To also cover benefits, unpaid time off and gaps between contracts, many people look for considerably more than that."],
        ["What is self-employment tax?", "Social Security and Medicare for people who work for themselves: 12.4% plus 2.9% on 92.35% of profit, with the Social Security part stopping at the yearly wage limit."],
      ],
    },
    {
      path: "/employer-cost-calculator/",
      tool: "employer",
      crumb: "Employer cost",
      title: "Employer Cost Calculator 2026: The True Cost of an Employee | LocalTakehome",
      description: "Work out what an employee really costs in 2026: salary plus employer Social Security, Medicare, unemployment tax, state programs and benefits.",
      h1: "Employer cost calculator",
      lede: "A salary is not the whole cost of an employee. Add the employer's payroll taxes and benefits to see the full figure.",
      prose: `<h2>What an employer pays on top of salary</h2>
        <p>Employers match the employee's Social Security (${pct(fica.socialSecurity.employerRate)} up to ${usd0(fica.socialSecurity.wageBase)} of pay) and Medicare (${pct(fica.medicare.employerRate)}). They pay federal unemployment tax, state unemployment tax at a rate that depends on their history, and in some states a share of paid leave or disability programs. Health insurance and retirement contributions come on top.</p>
        <p>For a small business working out whether it can afford to hire, or an employee who wants to understand their total compensation, the full figure is typically 10% to 30% more than the salary.</p>`,
      faqs: [
        ["How much does an employee cost on top of salary?", "Payroll taxes alone add about 8% to 10%. With health insurance and a retirement contribution the total is often 20% to 30% more than the salary."],
        ["Why is state unemployment tax left blank?", "Each employer has its own rate, based on its industry and claims history. Enter yours if you know it."],
      ],
    },
    {
      path: "/map/",
      tool: "rank",
      crumb: "Take-home pay by state",
      title: "Take-Home Pay by State 2026: All 50 States Ranked for Any Salary",
      description: "See take-home pay in all 50 states and D.C. for any salary in 2026, ranked from the state that keeps the most to the one that keeps the least.",
      h1: "Take-home pay by state",
      lede: "Enter a salary and see what it leaves in every state after 2026 federal and state taxes, ranked and mapped.",
      prose: `<h2>Where does a salary go furthest?</h2>
        <p>Federal income tax, Social Security and Medicare are the same wherever you live. The differences come from state income tax and from payroll programs that some states take from pay. Nine states do not tax wages at all; at the other end, a handful take 5% or more of a middle income.</p>
        <p>The ranking changes with income. A state with a flat tax can be cheap for high earners and dear for low earners, and the reverse is true of states with steep brackets and generous exemptions. Try your own salary.</p>
        <p>City and county income taxes are left out of the ranking. The <a href="/cities/">city pages</a> include them.</p>`,
      faqs: [
        ["Which state has the highest take-home pay?", "For most salaries, the seven states with no income tax and no payroll deductions tie for first: Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas and Wyoming."],
        ["Which state takes the most tax from a paycheck?", `It depends on income. On ${usd0(85000)} a year, ${worstMid[0]} and ${worstMid[1]} take the most. On ${usd0(1000000)}, ${worstHigh} does.`],
        ["Does this include sales tax and property tax?", "No. It covers what is taken from a paycheck. States with no income tax often rely more on sales or property tax."],
      ],
    },
  ];
  for (const def of defs) pages.push(toolPage(ctx, def));
  return pages;
}
