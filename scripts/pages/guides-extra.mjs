/**
 * Longer guides added for 2026. Every dollar amount and rate is computed from
 * the rate files or the engine; none is typed into the copy.
 */
import { esc, pct, statePath, usd, usd0 } from "../lib/shared.mjs";
import { compareBonus, keepOfNext } from "../../src/js/engine.mjs";

const IRS_W4 = { name: "IRS, About Form W-4, Employee's Withholding Certificate", url: "https://www.irs.gov/forms-pubs/about-form-w-4" };
const IRS_TWE = { name: "IRS Tax Withholding Estimator", url: "https://www.irs.gov/individuals/tax-withholding-estimator" };
const TF_LOCAL = { name: "Tax Foundation, Local Income Taxes: A Primer (2023)", url: "https://taxfoundation.org/research/all/state/local-income-taxes-2023/" };

export function extraGuides(ctx, guide) {
  const { tables, run } = ctx;
  const fed = tables.federal;
  const fica = tables.fica;
  const L = fed.limits;
  const local = (id) => ctx.locals.find((row) => row.id === id);
  const stateLink = (id) => `<a href="${statePath(ctx.byId[id])}">${esc(ctx.byId[id].name)}</a>`;
  const supp = pct(L.supplementalWithholdingRate);
  const out = [];

  /* A. Local income taxes explained */
  {
    const byState = {};
    for (const row of ctx.locals) (byState[row.state] ||= []).push(row);
    const rows = Object.entries(byState)
      .sort((a, b) => ctx.byId[a[0]].name.localeCompare(ctx.byId[b[0]].name))
      .map(([id, list]) => `<tr><th scope="row">${stateLink(id)}</th><td class="num">${list.length}</td><td>${esc(list.slice(0, 3).map((row) => row.name.replace(/,.*$/, "")).join(", "))}${list.length > 3 ? " and more" : ""}</td></tr>`)
      .join("");
    const phl = local("philadelphia");
    const cbus = local("columbus-oh");
    const det = local("detroit");
    const nyc = local("nyc");
    const kc = local("kansas-city-mo");
    const ny = run({ grossAnnual: 75000, state: "NY" });
    const nycR = run({ grossAnnual: 75000, state: "NY", localId: "nyc" });
    const phlPlain = run({ grossAnnual: 75000, state: "PA", localId: "philadelphia" });
    const phl401 = run({ grossAnnual: 75000, state: "PA", localId: "philadelphia", deductions: { traditional401k: 7500 } });
    out.push(
      guide(ctx, {
        slug: "local-income-taxes",
        crumb: "Local income taxes explained",
        blurb: "City, county and school district taxes on wages, and who pays them",
        title: "Local Income Taxes Explained: City and County Wage Taxes in 2026 | LocalTakehome",
        description: "How city, county and school district income taxes work in 2026: where they exist, who pays, what pay they apply to, and how they change take-home pay.",
        h1: "Local income taxes explained",
        lede: "Federal and state income taxes get the attention, but in parts of more than a dozen states a city, county or school district also taxes your wages. Here is how those local taxes work and how to tell whether you owe one.",
        body: `<div class="prose">
          <h2>What a local income tax is</h2>
          <p>A local income tax is a tax on earnings charged by a government smaller than a state: a city, a county, a school district, or a special district such as a transit authority. The <a href="https://taxfoundation.org/research/all/state/local-income-taxes-2023/" rel="noopener">Tax Foundation</a> counts local income taxes in more than a dozen states, levied by thousands of separate jurisdictions. Most of them are in Pennsylvania and Ohio, where nearly every town or school district has one, but some of the largest are single cities: New York City, Philadelphia, Detroit, Kansas City and St. Louis.</p>
          <p>For a worker, the important thing is that a local tax is a separate line on top of state tax. It is usually withheld by your employer along with federal and state tax, and it can be larger than the state tax itself. In Columbus, Ohio, for example, the city charges ${pct(cbus.residentRate)} of wages, which for many people is more than Ohio's state income tax.</p>

          <h2>The names they go by</h2>
          <ul>
            <li><strong>City or county income tax:</strong> the plain version, as in New York City, Maryland's counties and Indiana's counties.</li>
            <li><strong>Wage tax or earnings tax:</strong> Philadelphia's wage tax, and the earnings taxes in Kansas City and St. Louis.</li>
            <li><strong>Earned income tax (EIT):</strong> Pennsylvania's local tax, split between the municipality and the school district.</li>
            <li><strong>Occupational license tax:</strong> Kentucky and some Alabama cities, charged on wages earned within the city or county.</li>
            <li><strong>Occupational privilege tax or head tax:</strong> a flat dollar amount each month, as in Denver, rather than a percentage.</li>
            <li><strong>School district income tax:</strong> in Ohio and Iowa, paid by residents of districts that adopt one.</li>
          </ul>

          <h2>Four questions that decide what you owe</h2>
          <h3>1. Does it follow where you live or where you work?</h3>
          <p>This is the biggest difference between local taxes. New York City's tax applies only to residents, so a commuter from New Jersey or Westchester does not pay it. Maryland and Indiana county taxes are also based on where you live (Indiana uses the county you lived in on January 1). Philadelphia, Detroit, Kansas City, Ohio cities and Kentucky occupational taxes apply to people who work there as well, so you can owe a city tax in a place you do not live. Philadelphia, for example, charges residents ${pct(phl.residentRate, 3)} and commuters ${pct(phl.nonresidentRate, 3)}; Detroit charges commuters ${pct(det.nonresidentRate)}, half its resident rate.</p>
          <h3>2. What pay does it apply to?</h3>
          <p>Some local taxes use your state taxable income, so the standard deduction and a traditional 401(k) lower them. Others are charged on gross wages or Medicare wages, so a 401(k) does nothing for them. A Philadelphia resident earning ${usd0(75000)} who puts ${usd0(7500)} into a traditional 401(k) still pays ${usd0(phl401.annual.local)} in wage tax, against ${usd0(phlPlain.annual.local)} without it: the city taxes the contribution anyway. The <a href="/guides/pre-tax-vs-roth-401k/">401(k) guide</a> covers this in more detail.</p>
          <h3>3. Is it a flat rate, brackets, or a flat fee?</h3>
          <p>Most local taxes are a single percentage. New York City uses brackets, from ${pct(nyc.brackets.single[0].rate, 3)} to ${pct(nyc.brackets.single.at(-1).rate, 3)}. Yonkers charges a surcharge equal to a share of your New York State tax. Portland's Metro and Multnomah County taxes apply only to income above a high threshold. Denver's occupational privilege tax is a small flat amount each month.</p>
          <h3>4. Do you get a credit if two places tax you?</h3>
          <p>If you live in one taxing city and work in another, you may owe both. Ohio cities usually give their residents a full or partial credit for tax paid to the city where they work, so you end up paying roughly the higher of the two rates. Pennsylvania employers withhold the higher of your home and work rates. Michigan and Missouri cities have their own rules. Check your city's instructions if you are in this situation.</p>

          <h2>How much difference it makes</h2>
          <p>On ${usd0(75000)} a year, a single person living in New York State outside the city takes home about ${usd0(ny.annual.net)}. The same person living in one of the five boroughs pays ${usd0(nycR.annual.local)} in city tax and takes home ${usd0(nycR.annual.net)}. Kansas City and St. Louis take ${pct(kc.residentRate)} of earnings from residents and commuters alike. The <a href="/">home page</a> shows more same-state comparisons, and the <a href="/local-taxes/">local tax table</a> works out every local tax in the calculator on the same salary.</p>

          <h2>Local taxes in this calculator</h2>
          <p>The calculator covers ${ctx.locals.length} local income taxes. It includes every county in Maryland and Indiana and the largest cities elsewhere. Pennsylvania's EIT is included for Philadelphia and Pittsburgh only, and Ohio's for the six largest cities, because there are thousands of smaller ones. If your place is missing, enter its rate under "W-4 and other details".</p>
          </div>
          <div class="table-wrap"><table><caption>Local income taxes covered, by state</caption><thead><tr><th scope="col">State</th><th scope="col" class="num">Local taxes</th><th scope="col">Including</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <h2>How to find out whether you owe one</h2>
          <ol>
            <li>Look at a recent pay stub. Local taxes appear under names such as "NYC", "PHL wage", "Local", "City", "EIT", "OLT" or a county name.</li>
            <li>Check your state's page here; each one has a section on city and county taxes and links to the official source.</li>
            <li>Search your city or county name with "income tax" or "earned income tax". Official city and state revenue sites list the current rate.</li>
            <li>If you work from home for an employer based in a taxing city, ask payroll which locality they withhold for. Rules for remote workers differ from place to place.</li>
          </ol>
          <p>If a local tax should be withheld and is not, you may owe it when you file, sometimes on a separate city return. Fixing the withholding with your employer early avoids a surprise bill.</p>
          </div>`,
        faqs: [
          ["Which states have local income taxes?", `Local wage taxes are common in Pennsylvania, Ohio, Maryland, Indiana, Kentucky and Michigan, and exist in parts of New York, Missouri, Oregon, Delaware, Colorado, Alabama, Iowa, New Jersey, West Virginia and California. Some, such as Newark's and San Francisco's payroll taxes, are paid by employers rather than withheld from pay. The calculator covers ${ctx.locals.length} local taxes in ${Object.keys(byState).length} states.`],
          ["Do I pay a city's income tax if I only work there?", "It depends on the city. New York City, Maryland counties and Indiana counties tax only residents (Indiana also taxes some out-of-state workers). Philadelphia, Detroit, Kansas City, St. Louis, Ohio cities and Kentucky occupational taxes also tax people who work there."],
          ["Does a 401(k) lower my local tax?", "Only for local taxes based on state taxable income, such as New York City's and the Maryland and Indiana county taxes. Taxes on gross or Medicare wages, such as Philadelphia's wage tax and most Ohio city taxes, are not reduced by 401(k) contributions."],
        ],
        sources: [TF_LOCAL, phl.source, cbus.source, det.source, nyc.source].filter(Boolean),
      }),
    );
  }

  /* B. Working in one state and living in another */
  {
    const rec = tables.states.reciprocity;
    const pairs = Object.entries(rec)
      .sort((a, b) => ctx.byId[a[0]].name.localeCompare(ctx.byId[b[0]].name))
      .map(([id, list]) => `<tr><th scope="row">${stateLink(id)}</th><td>${list.map((other) => esc(ctx.byId[other]?.name || other)).join(", ")}</td></tr>`)
      .join("");
    const nj = run({ grossAnnual: 90000, state: "NJ" });
    const ny = run({ grossAnnual: 90000, state: "NY" });
    const pa = run({ grossAnnual: 70000, state: "PA" });
    const md = run({ grossAnnual: 70000, state: "MD", localId: "baltimore-county-md" });
    out.push(
      guide(ctx, {
        slug: "working-in-another-state",
        crumb: "Living and working in different states",
        blurb: "Reciprocity, commuter credits and moving mid-year",
        title: "Living in One State and Working in Another: Taxes in 2026 | LocalTakehome",
        description: "Which state taxes your paycheck when you live in one state and work in another: reciprocal agreements, credits for tax paid, remote work and moving mid-year.",
        h1: "Living in one state and working in another",
        lede: "Millions of people cross a state line to get to work, and more work remotely for employers in other states. Which state taxes your pay depends on three things: where you live, where you physically work, and whether the two states have an agreement.",
        body: `<div class="prose">
          <h2>The basic rule</h2>
          <p>Your home state can tax all of your income, wherever you earn it. The state where you physically do the work can also tax the wages you earn there. To stop people paying twice, your home state usually gives you a <strong>credit for tax paid to the other state</strong>. The result is that you pay roughly the higher of the two states' tax on those wages: the work state gets its tax first, and your home state collects only the difference, if any.</p>
          <p>Take a New Jersey resident earning ${usd0(90000)} in a Manhattan office. New York taxes the wages as a nonresident. New Jersey taxes the same income as a resident, then credits the New York tax. For a single person with no other income, New Jersey tax on that salary alone would be about ${usd0(nj.annual.stateIncome)} and New York tax about ${usd0(ny.annual.stateIncome)}, so in practice most of the bill goes to New York. The commuter does not pay New York City tax, which applies only to city residents.</p>

          <h2>Reciprocal agreements</h2>
          <p>Some neighboring states have agreed not to tax each other's residents on wages at all. Under a reciprocal agreement you file a certificate with your employer, and the employer withholds only your home state's tax. You file one state return instead of two. Reciprocity covers wages only; it does not cover rental, business or gambling income earned in the other state.</p>
          </div>
          <div class="table-wrap"><table><caption>Reciprocal agreements on wages in 2026</caption><thead><tr><th scope="col">If you work in</th><th scope="col">Residents of these states can be taxed only at home</th></tr></thead><tbody>${pairs}</tbody></table></div>
          <div class="prose">
          <p>Each state uses its own exemption form, for example Form REV-419 in Pennsylvania, Form MW507 in Maryland, Form IL-W-5-NR in Illinois, Form W-220 in Wisconsin and Form NDW-R in North Dakota. If you never file the form, your employer may withhold for the work state, and you will have to file a nonresident return there to get it back.</p>
          <p>Reciprocity can make a large difference. A Pennsylvania resident working in Maryland pays Pennsylvania's flat tax (about ${usd0(pa.annual.stateIncome)} on ${usd0(70000)}) instead of Maryland's graduated tax plus a county tax (about ${usd0(md.annual.stateIncome + md.annual.local)} in Baltimore County on the same pay). The commuter still owes any Pennsylvania local earned income tax at home.</p>

          <h2>Local taxes do not follow state agreements</h2>
          <p>State reciprocity does not cover city taxes. Someone living in New Jersey and working in Philadelphia owes Philadelphia's nonresident wage tax (${pct(local("philadelphia").nonresidentRate, 3)}) even though New Jersey and Pennsylvania have a reciprocal agreement. A Kansas resident working in Kansas City, Missouri pays the city's ${pct(local("kansas-city-mo").nonresidentRate)} earnings tax. Detroit, Ohio cities and Kentucky occupational taxes also charge commuters. On the other hand, a Maryland county tax or the New York City tax applies only to residents. The <a href="/guides/local-income-taxes/">local income tax guide</a> sets out which is which.</p>

          <h2>Remote and hybrid work</h2>
          <p>As a rule, wages are earned where you sit when you do the work. If you live and work from home in one state for an employer based in another, usually only your home state taxes you. The main exception is the <strong>convenience of the employer rule</strong> used by New York and a few other states: if you work from home for your own convenience rather than because the employer requires it, New York treats the days as New York days and taxes them. Your home state may or may not give a credit for that tax. If you split time, wages are generally divided by the share of working days spent in each state.</p>
          <p>Employers are supposed to withhold for the state where you work, and many payroll systems only know your office address. If you have moved or work from home, tell payroll so the right state is withheld.</p>

          <h2>Moving to another state during the year</h2>
          <p>If you move in the middle of the year you are a part-year resident of both states. Each taxes the income you earned while living there, and you file a part-year return in each. Your withholding should switch on the date you move: file the new state's withholding form and update your address with payroll the same week.</p>
          <p>To estimate a year with a move, run the calculator once for each state on your full salary, then take each state's share of the year. For example, if you move after four months, add a third of the first state's tax to two thirds of the second's. Federal tax, Social Security and Medicare do not change with your address.</p>

          <h2>What this calculator does</h2>
          <p>The calculator taxes one state: the one you select. It does not prepare two state returns or compute a credit for tax paid to another state. If you commute across a state line, choose the state that will end up with most of the tax (usually the higher-tax state, or your home state under reciprocity), and use the <a href="/compare/">compare tool</a> to see both states side by side.</p>
          </div>`,
        faqs: [
          ["Do I pay taxes to two states if I work in one and live in another?", "You may have to file in both, but you usually do not pay full tax twice. Your home state gives a credit for tax paid to the state where you work, or, if the two states have a reciprocal agreement, only your home state taxes your wages."],
          ["Which states have reciprocal tax agreements?", `${Object.keys(rec).length} states and D.C. have at least one, mostly in the Midwest and Mid-Atlantic: ${Object.keys(rec).map((id) => ctx.byId[id].name).join(", ")}. The table on this page lists every pair.`],
          ["I work from home for a company in another state. Which state taxes me?", "Usually only your home state, because the work is done there. New York and a few other states may still tax remote employees of in-state employers under the convenience of the employer rule."],
        ],
        sources: [
          ...["PA", "MD", "NJ", "NY"].map((id) => ctx.byId[id].sources?.[0]).filter(Boolean),
          local("philadelphia").source,
        ],
      }),
    );
  }

  /* C. Pre-tax vs Roth 401(k) */
  {
    const salary = 75000;
    const k = 7500;
    const cases = [
      { label: "Texas", state: "TX" },
      { label: "California", state: "CA" },
      { label: "Pennsylvania", state: "PA" },
      { label: "Columbus, Ohio", state: "OH", localId: "columbus-oh" },
      { label: "New York City", state: "NY", localId: "nyc" },
    ];
    const rows = cases
      .map((c) => {
        const base = { grossAnnual: salary, state: c.state, ...(c.localId ? { localId: c.localId } : {}) };
        const trad = run({ ...base, deductions: { traditional401k: k } });
        const roth = run({ ...base, deductions: { roth401k: k } });
        return { c, trad, roth, saved: trad.annual.net - roth.annual.net };
      });
    const tableRows = rows
      .map(({ c, trad, roth, saved }) => `<tr><th scope="row">${esc(c.label)}</th><td class="num">${usd0(trad.annual.net)}</td><td class="num">${usd0(roth.annual.net)}</td><td class="num">${usd0(saved)}</td><td class="num">${pct(saved / k, 1)}</td></tr>`)
      .join("");
    const tx = rows[0];
    const pa = rows[2];
    const ca = rows[1];
    out.push(
      guide(ctx, {
        slug: "pre-tax-vs-roth-401k",
        crumb: "Pre-tax vs Roth 401(k)",
        blurb: "What each does to your paycheck now",
        title: "Pre-Tax vs Roth 401(k): The Effect on Your 2026 Paycheck | LocalTakehome",
        description: `How a traditional (pre-tax) or Roth 401(k) changes take-home pay in 2026, state by state, including the ${usd0(L.electiveDeferral401k)} limit and which taxes each one lowers.`,
        h1: "Pre-tax vs Roth 401(k): what each does to your paycheck",
        lede: "Both kinds of 401(k) take the same dollars out of your pay. The difference is when the tax is paid, and that changes how much smaller your paycheck gets today.",
        body: `<div class="prose">
          <h2>The short version</h2>
          <p>A <strong>traditional</strong> (pre-tax) 401(k) contribution comes out before federal income tax and, in most states, before state income tax. You pay income tax on the money later, when you withdraw it in retirement. A <strong>Roth</strong> 401(k) contribution comes out after tax. You pay the income tax now and, if you follow the rules, the money and its growth come out tax-free later.</p>
          <p>Neither kind lowers Social Security or Medicare. Both are charged on your full pay, including what you put into a 401(k).</p>

          <h2>The 2026 limits</h2>
          <p>In 2026 you can put up to ${usd0(L.electiveDeferral401k)} of your own pay into 401(k), 403(b) and federal Thrift Savings Plan accounts combined, traditional and Roth together. Workers 50 and over can add a catch-up of ${usd0(L.catchUp401k)}, and those aged 60 to 63 a larger catch-up of ${usd0(L.catchUp401kAge60to63)}. Employer matching contributions do not count against your limit and do not appear on your paycheck.</p>

          <h2>How much a pre-tax contribution really costs</h2>
          <p>Because a traditional contribution lowers your taxes now, it shrinks your take-home pay by less than the amount you save. The table compares putting ${usd0(k)} (10% of a ${usd0(salary)} salary) into a traditional 401(k) and into a Roth 401(k), for a single filer. The last column is the share of the contribution you get back as lower tax this year.</p>
          </div>
          <div class="table-wrap"><table><caption>Take-home for the year on ${usd0(salary)}, single, with ${usd0(k)} in a 401(k). Tax year 2026.</caption><thead><tr><th scope="col">Where you live</th><th scope="col" class="num">Traditional</th><th scope="col" class="num">Roth</th><th scope="col" class="num">Traditional keeps more by</th><th scope="col" class="num">Tax saved per dollar</th></tr></thead><tbody>${tableRows}</tbody></table></div>
          <div class="prose">
          <p>In Texas the only saving is federal income tax: ${usd0(tx.saved)} on ${usd0(k)}, because the contribution comes out of the ${pct(fed.brackets.single.find((row, i, all) => !all[i + 1] || all[i + 1].over > tx.roth.annual.federalTaxable).rate)} federal bracket. In California the state income tax saving is added on top, for ${usd0(ca.saved)} in all.</p>
          <p>Pennsylvania is the odd one out. It is the one state that taxes traditional 401(k) contributions in the year you make them, so the state saving is zero and the result matches Texas: ${usd0(pa.saved)}. Local taxes vary too. New York City's tax uses state taxable income, so a traditional contribution lowers it. Columbus and most Ohio cities tax Medicare wages, and Philadelphia taxes gross pay, so a 401(k) does not lower those city taxes at all.</p>

          <h2>Which is better?</h2>
          <p>The usual rule of thumb compares your tax rate now with your expected rate in retirement:</p>
          <ul>
            <li><strong>Traditional tends to win</strong> if your tax rate now is higher than it will be when you withdraw: mid-career and high earners, people in high-tax states who plan to retire somewhere cheaper, and anyone who needs the bigger paycheck today.</li>
            <li><strong>Roth tends to win</strong> if your rate now is low and likely to rise: early-career workers in the lower brackets, people in no-tax states who may retire in a taxing state, and savers who want tax-free money to draw on later.</li>
            <li><strong>Splitting</strong> between the two is a reasonable hedge when you are not sure. Many plans let you set separate percentages.</li>
          </ul>
          <p>Remember that a Roth contribution of the same size leaves you with a smaller paycheck, because you are paying the tax now. If your budget is set by take-home pay, the honest comparison is a traditional contribution against a smaller Roth contribution that costs the same out of each paycheck.</p>

          <h2>Things that are easy to miss</h2>
          <ul>
            <li>Employer matches go into a pre-tax account, even when you contribute to the Roth side (some plans now let you choose Roth treatment for the match, which makes it taxable to you now).</li>
            <li>A traditional contribution lowers your adjusted gross income, which can help you qualify for income-tested credits and deductions, including the federal deductions for <a href="/guides/no-tax-on-tips/">tips</a> and <a href="/guides/no-tax-on-overtime/">overtime</a>, which shrink at higher incomes.</li>
            <li>An HSA, if you have one through work, lowers federal income tax and Social Security and Medicare as well, which a 401(k) does not. The <a href="/guides/401k-and-hsa-limits-2026/">limits guide</a> lists the 2026 HSA limits.</li>
          </ul>
          <p>To see the effect on your own pay, open the <a href="/401k-calculator/">401(k) calculator</a> or enter a contribution in the main calculator under "Retirement and benefits". Both show the per-paycheck cost for your state and city.</p>
          </div>`,
        faqs: [
          ["Does a Roth 401(k) lower my taxes now?", "No. Roth contributions come out after tax, so they do not change any tax line on your paycheck. The benefit comes later, when qualified withdrawals are tax-free."],
          ["Does a traditional 401(k) lower Social Security and Medicare?", "No. Social Security and Medicare are charged on your pay before 401(k) contributions, whether traditional or Roth."],
          ["Does every state let me deduct 401(k) contributions?", "Every state with a wage-based income tax except Pennsylvania excludes traditional 401(k) contributions from state taxable income. Some local taxes, such as Philadelphia's wage tax and most Ohio city taxes, do not exclude them either."],
        ],
        sources: [fed.sources[4], fed.sources[0], ctx.byId.PA.sources?.[0]].filter(Boolean),
      }),
    );
  }

  /* D. Bonus withholding */
  {
    const low = compareBonus({ grossAnnual: 50000, state: "TX", payType: "salary", frequency: "biweekly", filingStatus: "single", bonusAnnual: 5000 }, tables);
    const high = compareBonus({ grossAnnual: 260000, state: "TX", payType: "salary", frequency: "biweekly", filingStatus: "single", bonusAnnual: 5000 }, tables);
    const co = compareBonus({ grossAnnual: 70000, state: "CO", payType: "salary", frequency: "biweekly", filingStatus: "single", bonusAnnual: 5000 }, tables);
    const fic = (b) => b.aggregate.socialSecurity + b.aggregate.medicare + b.aggregate.additionalMedicare;
    const net = (b) => b.bonus - b.supplementalFederal - fic(b) - b.aggregate.state - b.aggregate.payroll - b.aggregate.local;
    out.push(
      guide(ctx, {
        slug: "bonus-tax-withholding",
        crumb: "How bonuses are taxed",
        blurb: `Why ${supp} comes out, and what you really owe`,
        title: `How Bonuses Are Taxed in 2026: The ${supp} Rule Explained | LocalTakehome`,
        description: `Why employers withhold ${supp} federal tax from a bonus, how that compares with the tax you really owe, and what a bonus check looks like after state tax, Social Security and Medicare.`,
        h1: "How bonuses are taxed",
        lede: `A bonus check often looks smaller than expected. Usually that is withholding, not a special bonus tax: employers take a flat ${supp} for federal income tax, and the real tax is settled when you file.`,
        body: `<div class="prose">
          <h2>A bonus is ordinary income</h2>
          <p>There is no separate tax rate for bonuses. A bonus, commission, award or retroactive raise is wages, and at the end of the year it is added to your salary and taxed in the same brackets. What is different is how much your employer <em>withholds</em> from the bonus check, because the IRS lets employers treat it as "supplemental wages".</p>

          <h2>The two ways employers withhold</h2>
          <h3>The flat-rate (percentage) method</h3>
          <p>If the bonus is paid separately from your regular pay, or shown separately on the stub, most employers withhold a flat ${supp} of it for federal income tax. That rate comes from IRS Publication 15 and is the same for everyone, whatever your salary, filing status or W-4. Supplemental wages over a million dollars in a year are withheld at the top federal rate instead.</p>
          <h3>The aggregate method</h3>
          <p>Some employers add the bonus to a regular paycheck and run the total through the normal withholding tables, as if you earned that much every pay period. That can withhold much more than ${supp}, because the tables assume the large check repeats all year. This is why a bonus paid with a regular check sometimes seems to vanish.</p>
          <p>Either way, Social Security (${pct(fica.socialSecurity.employeeRate)} until your pay for the year reaches ${usd0(fica.socialSecurity.wageBase)}) and Medicare (${pct(fica.medicare.employeeRate)}) come out of the bonus in full, along with state and local tax where they apply.</p>

          <h2>Withheld versus owed</h2>
          <p>Flat-rate withholding is a rough average. Whether it is too much or too little depends on your real top bracket:</p>
          <ul>
            <li>A single person on ${usd0(50000)} in Texas who gets a ${usd0(5000)} bonus has ${usd0(low.supplementalFederal)} withheld for federal tax. The bonus actually adds about ${usd0(low.aggregate.federal)} to the year's federal tax, so roughly ${usd0(low.supplementalFederal - low.aggregate.federal)} comes back as a refund or lower balance due.</li>
            <li>A single person on ${usd0(260000)} gets the same ${usd0(low.supplementalFederal)} withheld, but the bonus adds about ${usd0(high.aggregate.federal)} to their tax, because it lands in a higher bracket. They will owe about ${usd0(high.aggregate.federal - high.supplementalFederal)} more when they file.</li>
          </ul>
          <p>For most people with salaries in the middle brackets, ${supp} is close to the real rate, so the difference is small.</p>

          <h2>What a bonus check looks like</h2>
          <p>Here is a ${usd0(5000)} bonus for a single person earning ${usd0(70000)} in ${stateLink("CO")}, withheld with the flat-rate method:</p>
          <ul>
            <li>Federal income tax at ${supp}: ${usd(co.supplementalFederal)}</li>
            <li>Social Security and Medicare: ${usd(fic(co))}</li>
            <li>Colorado income tax${co.aggregate.payroll ? " and FAMLI premium" : ""}: ${usd(co.aggregate.state + co.aggregate.payroll)}</li>
            <li><strong>Check: about ${usd(net(co))}</strong>, or ${pct(net(co) / co.bonus, 0)} of the bonus</li>
          </ul>
          <h2>State and local tax on a bonus</h2>
          <p>States set their own rules for supplemental wages. Many have a flat bonus withholding rate of their own, some use the regular tables, and a few let employers choose. As with federal tax, the state's withholding is not the final word: the bonus is added to your income on the state return. Local wage taxes, such as Philadelphia's or an Ohio city's, apply to bonuses at the same rate as regular pay, and Social Security stops once your pay for the year, bonus included, passes ${usd0(fica.socialSecurity.wageBase)}. That is why a December bonus for a high earner can have less taken out for Social Security than a bonus earlier in the year.</p>
          <p> The <a href="/bonus-calculator/">bonus calculator</a> shows both the withholding and the real tax the bonus adds for your state and city.</p>

          <h2>Ways to keep more of a bonus</h2>
          <ul>
            <li><strong>Put some into your 401(k).</strong> Many plans let your deferral percentage apply to bonuses. A traditional contribution avoids income tax on that part now (see the <a href="/guides/pre-tax-vs-roth-401k/">401(k) guide</a>), up to the ${usd0(L.electiveDeferral401k)} yearly limit.</li>
            <li><strong>Check the timing.</strong> A bonus paid in January instead of December falls in the next tax year. That matters if you expect a lower income next year.</li>
            <li><strong>Do not change your W-4 just for the bonus.</strong> The extra withholding is usually settled at filing. If you consistently owe or get large refunds, adjust the W-4 as explained in the <a href="/guides/w4-form-explained/">W-4 guide</a>.</li>
          </ul>
          </div>`,
        faqs: [
          ["Are bonuses taxed at a higher rate?", `No. A bonus is taxed as ordinary wages. Employers often withhold a flat ${supp} for federal tax, which can be more or less than the tax you really owe on it; the difference is settled when you file your return.`],
          ["Why did my bonus have more than the flat rate taken out?", "Your employer probably used the aggregate method, adding the bonus to a regular paycheck and withholding as if you earned that much every pay period. The extra usually comes back as a refund."],
          ["Do I pay Social Security on a bonus?", `Yes, until your total pay for the year passes the Social Security wage base of ${usd0(fica.socialSecurity.wageBase)}. Medicare applies to all of it.`],
        ],
        sources: [fica.sources[1], fed.sources[3], fed.sources[0]].filter(Boolean),
      }),
    );
  }

  /* E. W-4 explained */
  {
    const base = { grossAnnual: 60000, state: "TX", frequency: "biweekly" };
    const plain = run(base);
    const twoJobs = run({ ...base, w4: { multipleJobs: true } });
    const kids = run({ ...base, filingStatus: "mfj", childrenUnder17: 2, w4: { dependentsCredit: 2 * fed.credits.childTaxCredit } });
    const kidsNo = run({ ...base, filingStatus: "mfj" });
    const per = (r) => r.annual.federalIncome / r.periods;
    out.push(
      guide(ctx, {
        slug: "w4-form-explained",
        crumb: "Form W-4 explained",
        blurb: "Each step, and what it does to your paycheck",
        title: "Form W-4 Explained for 2026: Each Step and What It Changes | LocalTakehome",
        description: "A plain-English walk through the 2026 Form W-4: filing status, multiple jobs, dependents, other income and extra withholding, with what each step does to your paycheck.",
        h1: "Form W-4 explained",
        lede: "Form W-4 tells your employer how much federal income tax to withhold from each paycheck. It does not change the tax you owe for the year, only how much is paid as you go. Getting it right means a smaller bill or refund in April.",
        body: `<div class="prose">
          <h2>What the W-4 does</h2>
          <p>Your employer works out federal withholding from your pay and the answers on your most recent W-4, using the tables in IRS Publication 15-T. If you never filed one, they must treat you as single with no adjustments. The form has had five steps since 2020; the old "allowances" are gone. Only Steps 1 and 5 are required. The others are optional and only change anything if they apply to you.</p>

          <h2>Step 1: personal information and filing status</h2>
          <p>Choose single (or married filing separately), married filing jointly, or head of household. Filing status sets the standard deduction and bracket widths used for withholding: in 2026 the standard deduction is ${usd0(fed.standardDeduction.single)} single, ${usd0(fed.standardDeduction.mfj)} married filing jointly and ${usd0(fed.standardDeduction.hoh)} head of household. Choose head of household only if you are unmarried and pay more than half the cost of a home for a qualifying person.</p>

          <h2>Step 2: multiple jobs or a working spouse</h2>
          <p>This is the step people skip most, and the one that most often causes a tax bill. Each employer withholds as if its job were your only income, so each one applies the full standard deduction and starts you in the lowest bracket. With two incomes, the second one is really taxed at a higher rate.</p>
          <p>The simplest fix is the checkbox in Step 2(c). Tick it on the W-4 for both jobs (or for both spouses' jobs), and each employer uses half the standard deduction and brackets half as wide. For a single person earning ${usd0(60000)} paid every two weeks, ticking the box raises federal withholding from about ${usd(per(plain))} to ${usd(per(twoJobs))} a paycheck. It works best when the two jobs pay about the same. If they are very different, use the IRS Tax Withholding Estimator or the worksheet in the W-4 instructions, and put the result in Step 4(c) on the higher-paying job only.</p>

          <h2>Step 3: dependents</h2>
          <p>Multiply the number of children under 17 by ${usd0(fed.credits.childTaxCredit)} and other dependents by ${usd0(fed.credits.otherDependentCredit)}, then enter the total. Withholding is reduced by that amount spread across the year. For a married couple filing jointly on ${usd0(60000)} with two children, claiming them lowers federal withholding from about ${usd(per(kidsNo))} to ${usd(per(kids))} a paycheck. The credit begins to shrink at ${usd0(fed.credits.phaseoutStart.single)} of income (${usd0(fed.credits.phaseoutStart.mfj)} joint), so higher earners should claim less. If both spouses work, claim the children on one W-4 only.</p>

          <h2>Step 4: other adjustments</h2>
          <ul>
            <li><strong>4(a) Other income:</strong> interest, dividends, retirement income or side income with no withholding. Entering it adds withholding so you do not owe at filing.</li>
            <li><strong>4(b) Deductions:</strong> deductions beyond the standard deduction, such as itemized deductions or the new federal deductions for qualified tips and overtime, which can lower withholding during the year.</li>
            <li><strong>4(c) Extra withholding:</strong> a flat dollar amount taken from every paycheck. This is the simplest way to fix a recurring balance due: divide what you owed last year by your number of paychecks.</li>
          </ul>

          <h2>Claiming exempt</h2>
          <p>You can claim exemption from federal withholding only if you owed no federal income tax last year and expect to owe none this year. An exempt W-4 expires each year; you must file a new one early in the next year or your employer goes back to withholding as single. Social Security and Medicare are still withheld either way.</p>

          <h2>State withholding forms</h2>
          <p>The federal W-4 does not control state withholding in most states. Many have their own form, such as California's DE 4, New York's IT-2104, Maryland's MW507 (which also asks your county) and Ohio's IT 4 (which asks your school district). A few states, such as Colorado, Nebraska and North Dakota, use your federal W-4 answers. Each <a href="/states/">state page</a> names the form.</p>

          <h2>When to file a new W-4</h2>
          <ul>
            <li>You marry, divorce or have a child.</li>
            <li>You or your spouse start or leave a second job.</li>
            <li>You got a large refund or owed a lot last April.</li>
            <li>You start getting regular tips, overtime or side income.</li>
          </ul>
          <p>You can file a new W-4 at any time; the change normally shows up within a pay period or two. To test changes before you make them, use the <a href="/w4-calculator/">W-4 calculator</a>, which shows the per-paycheck effect of each step.</p>
          </div>`,
        faqs: [
          ["Do I need to fill out a new W-4 every year?", "No. Your last W-4 stays in effect until you change it. The exception is a W-4 claiming exemption from withholding, which must be renewed each year."],
          ["Should I check the box in Step 2?", "Check it if you have two jobs at the same time, or if you are married filing jointly and your spouse also works, and the two incomes are roughly similar. Check it on both W-4s. For very different incomes, the IRS estimator gives a more accurate figure."],
          ["Does the W-4 change how much tax I owe?", "No. It changes only how much is withheld during the year. Your actual tax is worked out on your return; too much withheld comes back as a refund, too little is a balance due."],
        ],
        sources: [IRS_W4, IRS_TWE, fed.sources[3], fed.sources[0]],
      }),
    );
  }

  /* F. How much of a raise you keep */
  {
    const places = [
      { label: "Texas", state: "TX" },
      { label: "Florida", state: "FL" },
      { label: "Illinois", state: "IL" },
      { label: "Columbus, Ohio", state: "OH", localId: "columbus-oh" },
      { label: "Philadelphia", state: "PA", localId: "philadelphia" },
      { label: "California", state: "CA" },
      { label: "New York City", state: "NY", localId: "nyc" },
    ];
    const raise = 5000;
    const rows = places
      .map((p) => {
        const base = { grossAnnual: 60000, state: p.state, ...(p.localId ? { localId: p.localId } : {}) };
        const before = run(base);
        const after = run({ ...base, grossAnnual: 60000 + raise });
        const gain = after.annual.net - before.annual.net;
        return `<tr><th scope="row">${esc(p.label)}</th><td class="num">${usd0(gain)}</td><td class="num">${usd(gain / 26)}</td><td class="num">${pct(gain / raise, 0)}</td></tr>`;
      })
      .join("");
    const raiseInput = (gross) => ({ grossAnnual: gross, state: "TX", payType: "salary", frequency: "biweekly", filingStatus: "single" });
    const k40 = keepOfNext(raiseInput(40000), tables);
    const k100 = keepOfNext(raiseInput(100000), tables);
    const k190 = keepOfNext(raiseInput(190000), tables);
    const k250 = keepOfNext(raiseInput(250000), tables);
    const ssMax = fica.socialSecurity.wageBase;
    out.push(
      guide(ctx, {
        slug: "how-much-of-a-raise-do-you-keep",
        crumb: "How much of a raise you keep",
        blurb: "A raise after tax, by state and city",
        title: "How Much of a Raise Do You Keep After Taxes? (2026) | LocalTakehome",
        description: `What a raise is worth after federal, state and local taxes in 2026: how much of each extra dollar you keep, why a raise never lowers take-home pay, and how it varies by place.`,
        h1: "How much of a raise do you keep?",
        lede: "A raise is quoted in gross pay, but what you notice is the change in each paycheck. That change depends on your marginal tax rates, the taxes on your next dollar, which vary by income and by where you live.",
        body: `<div class="prose">
          <h2>The myth: a raise can push you into a higher bracket and lower your pay</h2>
          <p>It cannot, at least not through income tax brackets. U.S. income tax is marginal: each rate applies only to the dollars inside its band. When a raise pushes part of your income into a higher bracket, only the part above the line is taxed at the higher rate. Everything below is taxed exactly as before. So a raise always increases take-home pay; it is just smaller than the headline number.</p>
          <p>(There are rare exceptions outside the brackets, where a benefit or credit stops all at once at an income limit, such as some state exemptions and subsidies. Illinois, for example, removes its personal exemption entirely above a set income. These cliffs are uncommon for ordinary wages.)</p>

          <h2>What a ${usd0(raise)} raise is worth</h2>
          <p>The table shows a ${usd0(raise)} raise on a ${usd0(60000)} salary, single filer, paid every two weeks.</p>
          </div>
          <div class="table-wrap"><table><caption>A ${usd0(raise)} raise from ${usd0(60000)}, single. Tax year 2026.</caption><thead><tr><th scope="col">Where you live</th><th scope="col" class="num">More take-home a year</th><th scope="col" class="num">More per paycheck</th><th scope="col" class="num">Share you keep</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <p>The spread comes from state and local taxes. Federal income tax, Social Security and Medicare take the same share everywhere; the rest depends on your state's marginal rate and any city or county tax. A local wage tax charged on all pay, like Philadelphia's or Columbus's, takes its full rate from every extra dollar.</p>

          <h2>How your share changes with income</h2>
          <p>Your marginal rate rises in steps as income grows, so the share of each extra dollar you keep usually falls. For a single person in Texas, with no state tax:</p>
          <ul>
            <li>At ${usd0(40000)}, about ${usd(k40 * 100)} of each extra ${usd0(100)}.</li>
            <li>At ${usd0(100000)}, about ${usd(k100 * 100)}.</li>
            <li>At ${usd0(190000)}, about ${usd(k190 * 100)}.</li>
            <li>At ${usd0(250000)}, about ${usd(k250 * 100)}.</li>
          </ul>
          <p>The pattern is not perfectly smooth. Social Security stops at ${usd0(ssMax)} of wages, so earnings above that keep an extra ${pct(fica.socialSecurity.employeeRate)}. And Additional Medicare adds ${pct(fica.additionalMedicare.rate)} on wages above ${usd0(fica.additionalMedicare.thresholds.single)}.</p>
          <p>Some federal benefits shrink as income rises, which acts like a higher marginal rate for a range of income. The child tax credit falls by ${usd0(fed.credits.phaseoutPer1000)} for every ${usd0(1000)} above ${usd0(fed.credits.phaseoutStart.single)} (${usd0(fed.credits.phaseoutStart.mfj)} joint), and the tips and overtime deductions shrink above ${usd0(fed.workerDeductions.phaseoutStart.single)}.</p>

          <h2>Hourly raises and overtime</h2>
          <p>For hourly workers, a raise also lifts the overtime rate, because overtime is paid at one and a half times the regular rate. The extra overtime pay is taxed like other wages, though the premium part (the extra half) can qualify for the federal overtime deduction of up to ${usd0(fed.workerDeductions.overtimeMax.single)} a year (${usd0(fed.workerDeductions.overtimeMax.mfj)} joint) through 2028. That deduction lowers federal income tax only; Social Security, Medicare and most state taxes still apply. The <a href="/overtime-calculator/">overtime calculator</a> shows the effect per paycheck.</p>

          <h2>Turning a raise into a budget number</h2>
          <ol>
            <li>Find your marginal rates: federal bracket, ${pct(fica.socialSecurity.employeeRate + fica.medicare.employeeRate)} for Social Security and Medicare, your state's top rate on your income, and any local tax.</li>
            <li>Add them up and subtract from 100%. That is the share of the raise you keep.</li>
            <li>Multiply by the raise and divide by your number of paychecks.</li>
          </ol>
          <p>Or let the <a href="/raise-calculator/">raise calculator</a> do it for your state and city. It also shows the effect of keeping your 401(k) percentage the same: a percentage contribution grows with the raise, which lowers the change in take-home pay but adds to your savings.</p>

          <h2>Raise or move?</h2>
          <p>The same logic explains why a job in another city can be worth more or less than it looks. A ${usd0(raise)} raise that comes with a move from a no-tax state into a city with a wage tax may leave you with less, not more. The <a href="/guides/comparing-job-offers-in-different-cities/">job offer guide</a> walks through those comparisons.</p>
          </div>`,
        faqs: [
          ["Can a raise lower my take-home pay?", "Not through income tax brackets, because each rate applies only to the income inside its band. A few income-tested benefits end all at once at a limit, which in rare cases can offset a small raise."],
          ["How do I work out a raise after taxes?", "Multiply the raise by one minus your combined marginal rate: federal bracket, Social Security and Medicare, state rate and any local tax. The raise calculator does this for your state and city."],
          ["Why is my first paycheck after a raise smaller than I expected?", "Your 401(k) percentage grows with your pay, and withholding uses your new annual pay. Check the stub for the new contribution amount."],
        ],
        sources: [fed.sources[0], fica.sources[0], fed.sources[3]].filter(Boolean),
      }),
    );
  }

  /* G. Comparing job offers in different cities */
  {
    const salary = 100000;
    const r = (state, localId) => run({ grossAnnual: salary, state, ...(localId ? { localId } : {}) });
    const offers = [
      ["Philadelphia (resident)", r("PA", "philadelphia")],
      ["Pittsburgh (resident)", r("PA", "pittsburgh")],
      ["Detroit (resident)", r("MI", "detroit")],
      ["Elsewhere in Michigan", r("MI")],
      ["New York City (resident)", r("NY", "nyc")],
      ["Jersey City, New Jersey", r("NJ")],
      ["Portland, Oregon (resident)", r("OR", "portland-multnomah")],
      ["Vancouver, Washington", r("WA")],
      ["Kansas City, Missouri", r("MO", "kansas-city-mo")],
      ["Overland Park, Kansas", r("KS")],
    ];
    const rows = offers
      .map(([label, res]) => `<tr><th scope="row">${esc(label)}</th><td class="num">${usd0(res.annual.stateIncome + res.annual.statePayroll)}</td><td class="num">${usd0(res.annual.local)}</td><td class="num">${usd0(res.annual.net)}</td><td class="num">${usd0(res.annual.net / 12)}</td></tr>`)
      .join("");
    const pdx = offers[6][1];
    const van = offers[7][1];
    const nyc = offers[4][1];
    const jc = offers[5][1];
    out.push(
      guide(ctx, {
        slug: "comparing-job-offers-in-different-cities",
        crumb: "Comparing job offers by city",
        blurb: "Same salary, different take-home",
        title: "Comparing Job Offers in Different Cities: Take-Home Pay in 2026 | LocalTakehome",
        description: "How to compare job offers in different cities and states after taxes in 2026: state and local income taxes, commuter rules, payroll premiums and cost of living.",
        h1: "Comparing job offers in different cities",
        lede: "Two offers with the same salary can put very different amounts in your bank account. Before comparing rent or commute times, compare what each job pays after tax, including the city and county taxes that are easy to miss.",
        body: `<div class="prose">
          <h2>Step 1: compare take-home, not salary</h2>
          <p>Federal income tax, Social Security and Medicare are the same everywhere in the country, so the differences come from three places: state income tax, state payroll premiums (such as disability or paid leave), and local income taxes. The table shows a ${usd0(salary)} salary for a single person in pairs of nearby places.</p>
          </div>
          <div class="table-wrap"><table><caption>${usd0(salary)} salary, single, no retirement deductions. Tax year 2026. Portland's Metro and Multnomah County taxes start above ${usd0(local("portland-multnomah").layers[1].tiers[0].threshold.single)} of Oregon taxable income, so they do not apply at this salary.</caption><thead><tr><th scope="col">Living in</th><th scope="col" class="num">State tax and premiums</th><th scope="col" class="num">Local tax</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="prose">
          <p>Across the Columbia River, a Portland resident on ${usd0(salary)} keeps about ${usd0(pdx.annual.net)} and a Vancouver resident about ${usd0(van.annual.net)}, a gap of ${usd0(Math.abs(van.annual.net - pdx.annual.net))} a year. Oregon has one of the highest state income taxes; Washington has none, though it charges paid leave and long-term care premiums. Across the Hudson, living in New York City costs ${usd0(nyc.annual.local)} a year in city tax that a Jersey City resident does not pay, though New Jersey's state tax and premiums are different from New York's.</p>

          <h2>Step 2: check where the tax follows you</h2>
          <p>The table assumes you live and work in the same place. Many people do not, and the rules for each tax decide which one you pay:</p>
          <ul>
            <li><strong>City taxes that follow the job:</strong> Kansas City's earnings tax (${pct(local("kansas-city-mo").nonresidentRate)}) applies to people who work in the city, so living in Overland Park does not avoid it if the office is in Kansas City, Missouri. The same is true of Philadelphia, Detroit (at a lower commuter rate), Ohio cities and Kentucky occupational taxes.</li>
            <li><strong>City taxes that follow your home:</strong> New York City, Maryland counties and Indiana counties tax residents. Living outside the city or in a lower-rate county changes your take-home even with the same job.</li>
            <li><strong>State taxes across a border:</strong> if you live in one state and work in another, you usually pay the higher of the two states' taxes, unless the states have a reciprocal agreement. The <a href="/guides/working-in-another-state/">guide to working in another state</a> covers this.</li>
            <li><strong>Remote jobs:</strong> generally taxed where you live and work from, with exceptions such as New York's convenience rule for employees of New York employers.</li>
          </ul>

          <h2>Step 3: compare benefits that change the paycheck</h2>
          <p>Health premiums, retirement matches and HSA contributions can easily outweigh a state tax difference. A job with a cheaper health plan leaves more in each paycheck; a job with a generous 401(k) match adds savings that never appear in take-home pay. When comparing, put each offer's own premiums and contributions into the calculator rather than assuming they are the same.</p>

          <h2>Step 4: then look at living costs</h2>
          <p>Take-home pay is only half of the picture. Rent, home prices, car insurance and commuting costs often vary more between cities than taxes do. A no-income-tax state may make up for it with higher property or sales taxes. A sensible order is: take-home pay first, then fixed costs, then what is left.</p>

          <h2>A quick checklist</h2>
          <ol>
            <li>Run each offer through the <a href="/compare/">compare tool</a> with the right state and city for where you would live.</li>
            <li>Check whether the work city taxes commuters.</li>
            <li>Add each employer's benefit deductions.</li>
            <li>Convert both to a monthly figure and compare with expected rent or mortgage.</li>
            <li>For hourly roles, use the <a href="/hourly-paycheck-calculator/">hourly calculator</a> with realistic overtime.</li>
          </ol>
          <p>City pages such as <a href="/cities/">the city paycheck calculators</a> are preset with the local tax, and each <a href="/states/">state page</a> ranks its neighbors on the same salary.</p>
          </div>`,
        faqs: [
          ["How do I compare salaries between two cities?", "Work out the take-home pay for each, using the state and any city or county tax where you would live and work, then subtract each employer's benefit deductions. Compare the monthly figures against housing and commuting costs."],
          ["Is it cheaper to live outside a city with an income tax?", "It depends on the tax. Taxes based on residence, such as New York City's, stop when you move out. Taxes on people who work in the city, such as Philadelphia's and Kansas City's, still apply to commuters, though sometimes at a lower rate."],
        ],
        sources: [TF_LOCAL, local("kansas-city-mo").source, local("portland-multnomah").source, local("nyc").source].filter(Boolean),
      }),
    );
  }

  return out;
}
