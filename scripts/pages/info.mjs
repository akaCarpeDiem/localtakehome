/** About, contact, privacy, terms, method, updates, embed and the 404 page. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_LINK, SITE } from "../lib/layout.mjs";
import { bracketRows, esc, longDate, pct, rateLabel, sourcesList, statePath, tipsOvertimeSentence, usd, usd0 } from "../lib/shared.mjs";
import { ROOT } from "../lib/tables.mjs";
import { stateOptions } from "../../src/js/calc-form.mjs";

function fragment(ctx, name) {
  const localStates = new Set(ctx.locals.map((row) => row.state)).size;
  return readFileSync(join(ROOT, "src", "content", `${name}.html`), "utf8")
    .replaceAll("{{verified}}", ctx.verifiedLong)
    .replaceAll("{{localCount}}", String(ctx.locals.length))
    .replaceAll("{{localStates}}", String(localStates));
}

function methodology(ctx) {
  const { tables } = ctx;
  const fed = tables.federal;
  const fica = tables.fica;
  const wd = fed.workerDeductions;
  const stateRows = ctx.states
    .map(
      (state) =>
        `<tr><th scope="row"><a href="${statePath(state)}">${esc(state.name)}</a></th><td>${rateLabel(state)}</td><td>${state.confidence === "estimated" ? "Partly estimated" : "Official figures"}</td><td>${longDate(state.lastVerified)}</td><td>${state.sources
          .slice(0, 2)
          .map((src) => `<a href="${esc(src.url)}" rel="noopener">${esc(src.name)}</a>`)
          .join("; ")}</td></tr>`,
    )
    .join("");
  const allSources = [];
  const seen = new Set();
  const add = (src) => {
    if (!src?.url || seen.has(src.url)) return;
    seen.add(src.url);
    allSources.push(src);
  };
  fed.sources.forEach(add);
  wd.sources.forEach(add);
  fica.sources.forEach(add);
  tables.payroll.programs.forEach((row) => add(row.source));
  ctx.locals.forEach((row) => add(row.source));
  const stateSources = [];
  ctx.states.forEach((state) =>
    state.sources.forEach((src) => {
      if (!seen.has(src.url)) {
        seen.add(src.url);
        stateSources.push(src);
      }
    }),
  );
  const except = (kind) => {
    const names = ctx.states.filter((state) => state.wageTax && state.pretax?.[kind] === false).map((state) => state.name);
    if (!names.length) return "Lowers";
    return `Lowers, except in ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}`;
  };
  const bases = {
    gross: "Gross pay, before any deductions",
    "state-taxable": "The same taxable income as the state tax",
    "medicare-wages": "Medicare wages: a 401(k) does not reduce it, health premiums do",
    "federal-wages": "The same wages as federal income tax: a 401(k) and health premiums both reduce it",
    "state-wages": "The same wages the state taxes",
  };
  const baseRows = Object.entries(bases)
    .map(([key, label]) => {
      const places = ctx.locals.filter((row) => row.base === key && row.method === "flat");
      if (!places.length) return "";
      const byState = [...new Set(places.map((row) => ctx.byId[row.state].name))].sort();
      return `<tr><th scope="row">${label}</th><td>${places.length <= 6 ? places.map((row) => esc(row.name.replace(/,.*$/, ""))).join(", ") : `${places.length} places in ${byState.join(", ")}`}</td></tr>`;
    })
    .join("");

  /* A worked example, every number from the engine. */
  const ex = ctx.run({ grossAnnual: 85000, state: "OH", localId: "columbus-oh", deductions: { traditional401k: 4250, health: 2400 } });
  const exA = ex.annual;
  const cbus = ctx.locals.find((row) => row.id === "columbus-oh");
  const exRows = [
    ["Gross pay for the year", usd(exA.gross)],
    ["Traditional 401(k) (5%) and health premiums", `−${usd(exA.pretax)}`],
    ["Federal wages (gross less both deductions)", usd(exA.federalWages)],
    [`Federal taxable income (less the ${usd0(fed.standardDeduction.single)} standard deduction)`, usd(exA.federalTaxable)],
    ["Federal income tax", `−${usd(exA.federalIncome)}`],
    [`Social Security and Medicare wages (only the health premium comes off)`, usd(exA.ficaWages)],
    [`Social Security (${pct(fica.socialSecurity.employeeRate)}) and Medicare (${pct(fica.medicare.employeeRate)})`, `−${usd(exA.socialSecurity + exA.medicare + exA.additionalMedicare)}`],
    ["Ohio taxable income", usd(exA.stateTaxable)],
    ["Ohio income tax", `−${usd(exA.stateIncome)}`],
    [`Columbus city tax (${pct(cbus.residentRate)} of Medicare wages)`, `−${usd(exA.local)}`],
    ["Take-home pay for the year", usd(exA.net)],
    ["Each of 26 paychecks", usd(ex.periodNet)],
  ]
    .map(([label, value], i, all) => `<tr${i === all.length - 2 ? ' class="sum"' : ""}><th scope="row">${label}</th><td class="num">${value}</td></tr>`)
    .join("");
  const ssPeriods = Math.ceil(fica.socialSecurity.wageBase / (250000 / 26));

  return {
    path: "/methodology/",
    title: "How the LocalTakehome Calculator Works: Method and Sources (2026)",
    description: "The formulas, 2026 rates, official sources and known limits behind every LocalTakehome estimate: federal income tax, FICA, state and local taxes.",
    trail: [{ label: "How it works" }],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">How it works</p>
      <h1>Method and sources</h1>
      <p class="lede">How every figure on this site is worked out, where each rate comes from, and what the estimate leaves out. Rates were last checked against official sources on ${ctx.verifiedLong}.</p>
    </header>
    <div class="prose wide">
    <div class="prose">
      <h2>The method in one paragraph</h2>
      <p>The calculator works out your pay for the whole year, works out each tax on that year, rounds to the cent, and divides by your number of paychecks (52, 26, 24 or 12). That is the result payroll withholding is designed to arrive at over a year. Your employer's system uses per-paycheck tables that can differ from this by a few dollars a check, and evens out over the year.</p>
      <p>Every page on this site, including the tables on the state, city and salary pages, is generated by the same calculation code that runs in your browser. There are no hand-typed results.</p>

      <h2 id="order">Order of operations</h2>
      <p>Every result, whatever the page, goes through the same steps in the same order:</p>
      <ol>
        <li><strong>Pay for the year.</strong> A salary is used as entered. Hourly pay is the rate times hours times paid weeks, plus overtime at the multiplier you choose. Bonuses and tips are added. Unpaid weeks are taken out.</li>
        <li><strong>Before-tax deductions.</strong> A traditional 401(k), 403(b), 457 or TSP contribution comes off the wages used for income tax. Cafeteria-plan deductions (health, dental and vision premiums, HSA, health FSA, commuter benefits) also come off the wages used for Social Security and Medicare. If 401(k) contributions go over the 2026 employee limit, the calculator warns you but uses the amount you entered.</li>
        <li><strong>Federal income tax.</strong> Federal wages, plus other income from Step 4(a) of your W-4, less the standard deduction and any Step 4(b) deductions, the tips and overtime deductions, are taxed with the 2026 brackets for your filing status. Credits for children and other dependents come off the tax. Extra withholding from Step 4(c) is added.</li>
        <li><strong>Social Security and Medicare.</strong> Worked out on Social Security and Medicare wages, with the wage limit and the Additional Medicare threshold.</li>
        <li><strong>State income tax.</strong> Starting from the wages your state taxes (which may or may not exclude a 401(k), HSA or other deductions), less the state's own deduction and exemptions, taxed with its rate or brackets, less any state credits that are modeled.</li>
        <li><strong>State payroll programs.</strong> Disability, paid leave, unemployment and long-term care premiums, each on its own wage base and up to its own limit.</li>
        <li><strong>Local tax.</strong> On whichever wages that place taxes (gross pay, Medicare wages, federal wages or state taxable income), at the resident or nonresident rate that applies.</li>
        <li><strong>Take-home pay.</strong> Gross pay less all of the above and any after-tax deductions, such as a Roth 401(k) or union dues. The year’s total is divided by the number of paychecks.</li>
      </ol>

      <h3 id="example">A worked example</h3>
      <p>A single person earning ${usd0(85000)} in Columbus, Ohio, paid every two weeks, puts 5% of pay into a traditional 401(k) and pays ${usd0(2400)} a year in health premiums.</p>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Step</th><th scope="col" class="num">For the year</th></tr></thead><tbody>${exRows}</tbody></table></div>
    <div class="prose">
      <p>Note that the 401(k) lowers federal and Ohio tax but not Social Security, Medicare or the Columbus tax, while the health premium lowers all of them. The same inputs in the calculator show this breakdown under "Show the math".</p>

      <h2 id="exact">Estimated versus exact: how this differs from your pay stub</h2>
      <p>The calculator answers the question "what will this pay leave me over a normal year?" Your employer answers a slightly different one: "what should I withhold from this one paycheck?" Employers use the percentage method or wage-bracket tables in <a href="https://www.irs.gov/publications/p15t" rel="noopener">IRS Publication 15-T</a>, which annualize each paycheck, apply the year's brackets and divide again. For a steady salary and a 2020-or-later W-4 that gives the same answer as the calculator, within a few cents of rounding per check. The figures can differ when:</p>
      <ul>
        <li><strong>Pay varies.</strong> A large commission or overtime check is withheld as if you earned that much every period. The calculator spreads it over the year.</li>
        <li><strong>Bonuses are paid separately.</strong> Employers usually withhold a flat ${pct(fed.limits.supplementalWithholdingRate)} from supplemental wages. The calculator shows the tax the bonus really adds; the <a href="/bonus-calculator/">bonus calculator</a> shows both.</li>
        <li><strong>You pass the Social Security wage limit.</strong> Payroll stops Social Security in the paycheck where year-to-date pay reaches ${usd0(fica.socialSecurity.wageBase)}; someone on ${usd0(250000)} paid every two weeks stops after paycheck ${ssPeriods}. The calculator spreads the year's total evenly, so its per-check figure is an average.</li>
        <li><strong>State withholding tables differ from the tax.</strong> Some states publish withholding formulas that do not match their tax law exactly (for example tables not yet updated for a rate cut, or a flat percentage the employee chooses). The calculator shows the tax you will owe for the year; the state page notes where withholding is known to differ.</li>
        <li><strong>Your W-4 or benefits are different.</strong> Old pre-2020 W-4s with allowances, mid-year benefit changes and employer-specific rounding all move the real figure.</li>
      </ul>
      <p>So the calculator is an estimate of what you keep, not a copy of your stub. Over a full year, if your W-4 is accurate, the two should come out close, and any gap is settled on your tax return.</p>

      <h2 id="federal">Federal income tax</h2>
      <p>${esc(fed.method)}</p>
      <ul>
        <li><strong>Standard deduction:</strong> ${usd0(fed.standardDeduction.single)} single or married filing separately, ${usd0(fed.standardDeduction.mfj)} married filing jointly, ${usd0(fed.standardDeduction.hoh)} head of household.</li>
        <li><strong>Children and dependents:</strong> ${usd0(fed.credits.childTaxCredit)} off the tax for each child under 17 and ${usd0(fed.credits.otherDependentCredit)} for each other dependent, shrinking by $${fed.credits.phaseoutPer1000} per $1,000 of income above ${usd0(fed.credits.phaseoutStart.single)} (${usd0(fed.credits.phaseoutStart.mfj)} joint). The credit can reduce the tax to zero but is not paid out beyond that here.</li>
        <li><strong>Tips and overtime (${esc(wd.years)}):</strong> up to ${usd0(wd.tipsMax)} of tips and up to ${usd0(wd.overtimeMax.single)} of overtime premium pay (${usd0(wd.overtimeMax.mfj)} joint) are deducted, shrinking by $${wd.phaseoutPer1000} per $1,000 of income above ${usd0(wd.phaseoutStart.single)} (${usd0(wd.phaseoutStart.mfj)} joint). Not applied for married filing separately. For hourly pay the premium is the half in time-and-a-half; it is capped at half the regular rate whatever multiplier is entered.</li>
      </ul>
    </div>
    <div class="table-pair">
      <div class="table-wrap"><table><caption>Single, 2026</caption><thead><tr><th scope="col">Taxable income</th><th scope="col" class="num">Rate</th></tr></thead><tbody>${bracketRows(fed.brackets.single)}</tbody></table></div>
      <div class="table-wrap"><table><caption>Married filing jointly, 2026</caption><thead><tr><th scope="col">Taxable income</th><th scope="col" class="num">Rate</th></tr></thead><tbody>${bracketRows(fed.brackets.mfj)}</tbody></table></div>
    </div>
    <div class="prose">
      <h2 id="fica">Social Security and Medicare</h2>
      <p>Social Security is ${pct(fica.socialSecurity.employeeRate)} of pay up to ${usd0(fica.socialSecurity.wageBase)}. Medicare is ${pct(fica.medicare.employeeRate)} of all pay. Additional Medicare is ${pct(fica.additionalMedicare.rate)} of pay above ${usd0(fica.additionalMedicare.thresholds.single)} (single or head of household), ${usd0(fica.additionalMedicare.thresholds.mfj)} (married filing jointly) or ${usd0(fica.additionalMedicare.thresholds.mfs)} (married filing separately). Employers begin withholding it at ${usd0(fica.additionalMedicare.employerWithholdingThreshold)} whatever your status; the calculator uses the threshold for your filing status, which is what you finally owe.</p>

      <h2 id="deductions">Which deductions lower which taxes</h2>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Deduction</th><th scope="col">Federal income tax</th><th scope="col">Social Security and Medicare</th><th scope="col">State income tax</th></tr></thead><tbody>
      <tr><th scope="row">Traditional 401(k), 403(b), 457, TSP</th><td>Lowers</td><td>Does not lower</td><td>${except("k401")}</td></tr>
      <tr><th scope="row">Health, dental and vision premiums</th><td>Lowers</td><td>Lowers</td><td>${except("s125")}</td></tr>
      <tr><th scope="row">HSA through payroll</th><td>Lowers</td><td>Lowers</td><td>${except("hsa")}</td></tr>
      <tr><th scope="row">Health FSA</th><td>Lowers</td><td>Lowers</td><td>${except("fsa")}</td></tr>
      <tr><th scope="row">Commuter benefits</th><td>Lowers</td><td>Lowers</td><td>${except("commuter")}</td></tr>
      <tr><th scope="row">Roth 401(k), union dues, other after-tax</th><td>No effect</td><td>No effect</td><td>No effect</td></tr>
    </tbody></table></div>
    <div class="prose">
      <h2 id="states">State income tax</h2>
      <p>${esc(tables.states.method)}</p>
      <p>Each state page sets out that state's deduction, exemptions, brackets and any special rule, such as Oregon's subtraction for federal tax, Connecticut's and New York's recapture of lower-bracket benefits at higher incomes, Wisconsin's sliding standard deduction, or Alabama's and Missouri's deduction for federal income tax. Head of household uses the state's own schedule wherever it has one.</p>
      <p><strong>Tips and overtime.</strong> ${tipsOvertimeSentence(ctx)}</p>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">State</th><th scope="col">2026 rates</th><th scope="col">Status</th><th scope="col">Last checked</th><th scope="col">Sources</th></tr></thead><tbody>${stateRows}</tbody></table></div>
    <div class="prose">
      <p>“Partly estimated” means the state had not published every 2026 amount when it was checked, so one or more figures carry over from 2025. The state page says which, and the calculator shows a notice with the result.</p>

      <h2 id="payroll">State payroll programs</h2>
      <p>Employee contributions for state disability insurance, paid family and medical leave, unemployment insurance and long-term care are separate lines, charged on pay after cafeteria-plan deductions and up to each program's limit. Where the law lets an employer pay the employee's share, the line shows the most that can be taken from pay. The <a href="/guides/state-payroll-taxes-2026/">state payroll guide</a> lists all ${tables.payroll.programs.length}.</p>

      <h2 id="local">City and county income tax</h2>
      <p>${esc(tables.local.rule)} The calculator covers ${ctx.locals.length} of them; the <a href="/local-taxes/">local tax guide</a> lists each with its rate. Local taxes are not all charged on the same pay:</p>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Charged on</th><th scope="col">Where</th></tr></thead><tbody>${baseRows}</tbody></table></div>
    <div class="prose">
      <p>New York City and Anne Arundel County use their own brackets; Frederick County uses one rate that depends on income; Yonkers charges a percentage of state tax; Portland's two taxes start at high incomes; Denver's is a flat monthly amount.</p>

      <h2 id="contractor">Contractors</h2>
      <p>Self-employment tax is ${pct(fica.socialSecurity.selfEmployedRate)} Social Security (up to the wage limit) plus ${pct(fica.medicare.selfEmployedRate)} Medicare on ${pct(fica.selfEmploymentFactor)} of profit after expenses. Half of it is deducted before income tax. The qualified business income deduction is not included.</p>

      <h2 id="limits">What the estimate leaves out</h2>
      <ul>
        <li>Itemized deductions, and credits other than those for children and dependents (you can enter a credit amount yourself).</li>
        <li>Tax owed to a second state when you live in one and work in another. Reciprocity agreements are recognised; other cases are flagged but not calculated.</li>
        <li>Local taxes that are not in the list, unless you enter the rate.</li>
        <li>State-specific credits such as earned income credits and renter's credits.</li>
        <li>Wage garnishments, and sales and property tax.</li>
        <li>Pay that varies during the year: every paycheck is assumed to be the same.</li>
      </ul>

      <h2 id="tests">How it is checked</h2>
      <p>The calculation code has a test suite that runs before every release. Expected results were worked out by hand from the official schedules, not copied from the program's output. They cover the federal brackets and credits, the special rules of each state that has them, every kind of local tax, and the payroll programs. Other tests check that take-home pay never falls when pay rises, in every state and filing status, and that every line on a result adds up to the total.</p>
      <p>A second set of checks runs when the site is built: every rate file must carry a source and a date, and no page may be published with a figure that failed to compute.</p>

      <h2 id="corrections">Corrections</h2>
      <p>If you find a rate or a result that looks wrong, email ${EMAIL_LINK} with the page and the inputs, and a link to the official source if you have one. Corrections are listed on the <a href="/updates/">updates page</a>.</p>

      <h2 id="freshness">How the rates are kept current</h2>
      <p>Each rate file records the tax year, the official source for each figure and the date it was last checked against that source; the oldest relevant date is shown on each state page. Rates across the site were last checked on ${ctx.verifiedLong}. We re-check when the IRS publishes the next year's inflation adjustments (usually in October or November), when the Social Security Administration announces the new wage base, when a state legislature or revenue department changes a rate, and when a city changes its wage tax (Philadelphia, for example, changes its rate each July). Mid-year changes are applied from their effective date and noted on the <a href="/updates/">updates page</a>.</p>
      <p>Where a figure is not yet published, the previous year's figure is used and the state is marked "Partly estimated" in the table above and on its page. Nothing is filled in by guesswork; if a local rate has no published source, the calculator says so and adds nothing.</p>

      <h2 id="sources">Sources</h2>
      <h3>Federal</h3>
      ${sourcesList(allSources.filter((src) => /irs\.gov|ssa\.gov|taxfoundation/.test(src.url)))}
      <h3>States</h3>
      ${sourcesList(stateSources)}
      <h3>State payroll programs and local taxes</h3>
      ${sourcesList(allSources.filter((src) => !/irs\.gov|ssa\.gov|taxfoundation/.test(src.url)))}
    </div>
    </div>
  </div>`,
  };
}

function updates(ctx) {
  const stateItems = ctx.states
    .filter((state) => state.changed)
    .map((state) => `<li><strong><a href="${statePath(state)}">${esc(state.name)}</a>:</strong> ${esc(state.changed)}</li>`)
    .join("");
  return {
    path: "/updates/",
    title: "Updates and Corrections | LocalTakehome",
    description: "A dated log of changes to the LocalTakehome tax figures and calculators, including corrections.",
    trail: [{ label: "Updates and corrections" }],
    body: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">Updates</p><h1>Updates and corrections</h1>
    <p class="lede">Tax rates change, and mistakes get found. Every change to the figures on this site is listed here.</p></header>
    <h2>${ctx.verifiedLong}</h2>
    <p>A full review of every state against official state sources, and a rebuilt calculator.</p>
    <h3>Added</h3>
    <ul>
      <li>The federal deductions for tips and for overtime premium pay (2025 through 2028).</li>
      <li>The child tax credit and the credit for other dependents, from the number of children you enter.</li>
      <li>“Show the math” for the federal and state calculation behind every result.</li>
      <li>All 92 Indiana counties, Frederick County in Maryland, Denver's occupational privilege tax and Pittsburgh's Local Services Tax.</li>
      <li>Employee payroll deductions in Alaska, Delaware, Hawaii, Maine, Massachusetts, Minnesota, New Jersey, Oregon, Pennsylvania and Rhode Island.</li>
      <li>New calculators: salary needed for a target take-home pay, salary to hourly, tips, and take-home pay by state.</li>
    </ul>
    <h3>Corrected</h3>
    <ul>
      <li>Head of household now uses each state's own rate schedule and deduction, not the single schedule.</li>
      <li>Philadelphia's wage tax uses the rates in effect from July 1, 2026.</li>
      <li>Ohio city taxes are charged on pay before a 401(k) contribution; Michigan city taxes, Kansas City and St. Louis on pay after it; Pittsburgh on Pennsylvania wages. Detroit's $600 exemption is applied.</li>
      <li>Maryland and Indiana county taxes follow the county you live in.</li>
    </ul>
    <h3>State by state</h3>
    <ul>${stateItems}</ul>
    <p>To report a problem, see the <a href="/contact/">contact page</a>.</p>
  </div>`,
  };
}

function embed(ctx) {
  const code = `<iframe title="Paycheck calculator" src="${SITE.origin}/paycheck-calculator/?embed=1" width="100%" height="1900" style="border:0;max-width:1100px" loading="lazy"></iframe>
<p style="font-size:14px">Paycheck calculator by <a href="${SITE.origin}/">LocalTakehome</a></p>`;
  const stateCode = `<iframe title="Texas paycheck calculator" src="${SITE.origin}/texas-paycheck-calculator/?embed=1" width="100%" height="1900" style="border:0;max-width:1100px" loading="lazy"></iframe>
<p style="font-size:14px">Texas paycheck calculator by <a href="${SITE.origin}/texas-paycheck-calculator/">LocalTakehome</a></p>`;
  return {
    path: "/embed/",
    title: "Add the Paycheck Calculator to Your Website | LocalTakehome",
    description: "Free embed code for the LocalTakehome 2026 paycheck calculator. Paste it into any web page, HR portal or blog post.",
    trail: [{ label: "Add it to your site" }],
    body: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">Free to use</p><h1>Add the calculator to your site</h1>
    <p class="lede">Paste the code below into any web page: a benefits portal, an HR handbook, a personal finance blog, a job board. It is free, has no sign-up, and your visitors' numbers never leave their browser.</p></header>
    <h2>The full calculator</h2>
    <div class="embed-code"><pre><code id="embed-main">${esc(code)}</code></pre><p><button type="button" class="btn ghost small" data-copy="#embed-main">Copy the code</button> <a href="/paycheck-calculator/?embed=1">See how it looks</a></p></div>
    <h2>Starting in one state or city</h2>
    <p>Any state or city page can be embedded the same way: add <code>?embed=1</code> to its address. For example, for Texas:</p>
    <div class="embed-code"><pre><code id="embed-state">${esc(stateCode)}</code></pre><p><button type="button" class="btn ghost small" data-copy="#embed-state">Copy the code</button></p></div>
    <p>State pages: ${ctx.states.map((state) => `<a href="${statePath(state)}">${esc(state.name)}</a>`).join(", ")}.</p>
    <h2>Good to know</h2>
    <ul>
      <li>The embedded calculator is always up to date: when a rate changes here, it changes on your page.</li>
      <li>Set the height to suit your layout. The form and the result stack on narrow pages, so a phone-width column needs more height.</li>
      <li>Please keep the credit link, and do not present the results as tax advice. The <a href="/terms/">terms of use</a> apply.</li>
      <li>You can also simply link to any page, or to a set of numbers: use “Copy a link to this estimate” under any result.</li>
    </ul>
    <p>Questions: ${EMAIL_LINK}.</p>
  </div>`,
  };
}

function notFound(ctx) {
  return {
    path: "/404.html",
    noindex: true,
    title: "Page Not Found | LocalTakehome",
    description: "That page is not here, but the 2026 paycheck calculator is. Enter a salary and a state.",
    body: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">404</p><h1>That page is not here.</h1>
    <p class="lede">The link may be old. The calculator is still here: enter a salary and a state to go straight to an estimate.</p></header>
    <form action="/" method="get" class="tool-form" style="padding:0;max-width:520px">
      <div class="grid-2">
        <label class="field big"><span class="label">Salary</span><span class="control"><span class="affix">$</span><input name="pay" inputmode="decimal" autocomplete="off" placeholder="85,000"></span></label>
        <label class="field"><span class="label">State</span><select name="state">${stateOptions(ctx.tables, "CA")}</select></label>
      </div>
      <button class="btn solid" type="submit">Work out my take-home pay</button>
    </form>
    <p><a href="/">Home</a> · <a href="/states/">States</a> · <a href="/cities/">Cities</a> · <a href="/guides/">Guides</a> · <a href="/methodology/">How it works</a></p>
  </div>`,
  };
}

export function infoPages(ctx) {
  const simple = (path, name, title, description, trail) => ({ path, title, description, trail: [{ label: trail }], body: fragment(ctx, name) });
  return [
    simple("/about/", "about", "About LocalTakehome", "Who runs LocalTakehome, how the take-home pay estimates are made, and how to check or correct the numbers.", "About"),
    simple("/contact/", "contact", "Contact LocalTakehome", "How to reach LocalTakehome with a question, a correction or a privacy request.", "Contact"),
    simple("/privacy/", "privacy", "Privacy Policy | LocalTakehome", "What LocalTakehome stores (nothing you type is uploaded), how analytics and advertising work, and your choices.", "Privacy"),
    simple("/terms/", "terms", "Terms of Use | LocalTakehome", "The terms for using localtakehome.com. Results are educational estimates, not tax advice.", "Terms"),
    methodology(ctx),
    updates(ctx),
    embed(ctx),
    notFound(ctx),
  ];
}
