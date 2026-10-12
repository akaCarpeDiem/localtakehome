/** City and county pages, the city directory, and the local tax guide. */
import { faqHTML, faqLd } from "../lib/layout.mjs";
import { calculatorBlock, esc, linkList, longDate, pct, rateLabel, sourcesList, statePath, takeHomeTable, usd, usd0 } from "../lib/shared.mjs";
import { CITIES, CITY_BY_LOCAL, cityPath } from "../content/cities.mjs";

const BIG = ["new-york-city", "los-angeles", "chicago", "houston", "phoenix", "philadelphia", "seattle", "miami", "denver", "atlanta", "boston"];

function localRateText(local) {
  if (!local) return "";
  if (local.method === "flat") return local.nonresidentRate != null && local.nonresidentRate !== local.residentRate && local.appliesWhen === "resident-or-work" ? `${pct(local.residentRate, 4)} for residents and ${pct(local.nonresidentRate, 4)} for people who only work there` : pct(local.residentRate, 4);
  if (local.method === "brackets") return `${pct(local.brackets.single[0].rate, 4)} to ${pct(local.brackets.single.at(-1).rate, 4)}`;
  if (local.method === "tiered-flat") return `${pct(local.tiers.single[0][1], 4)} to ${pct(local.tiers.single.at(-1)[1], 4)}, depending on income`;
  if (local.method === "surcharge") return `${pct(local.residentSurchargeOfStateTax, 4)} of your state income tax`;
  if (local.method === "layered-threshold") return "up to 4% on higher incomes";
  if (local.method === "fixed") return `${usd(local.monthly)} a month`;
  return "";
}

function cityPage(ctx, city) {
  const state = ctx.byId[city.state];
  const local = city.local ? ctx.locals.find((row) => row.id === city.local) : null;
  const base = { state: state.id, localId: city.local || "" };
  const at = (amount, extra = {}) => ctx.run({ ...base, grossAnnual: amount, ...extra });
  const r85 = at(85000);
  const r60 = at(60000);
  const stateOnly = ctx.run({ state: state.id, grossAnnual: 85000 });
  const place = city.name;
  const inPlace = `${city.county ? "in " : "in "}${place}`;
  const localCost = r85.annual.local;
  const preset = { state: state.id, ...(city.local ? { local: city.local } : {}) };

  let localSection;
  if (local) {
    const nonres = local.appliesWhen === "resident-or-work" && local.method !== "fixed" ? at(85000, { livesInPlace: false }) : null;
    const resVsNon =
      nonres && Math.abs(nonres.annual.local - r85.annual.local) > 0.5
        ? `<div class="table-wrap narrow"><table><caption>${esc(place)} local tax on ${usd0(85000)} a year</caption><thead><tr><th scope="col">You</th><th scope="col" class="num">Local tax a year</th><th scope="col" class="num">Take-home a year</th></tr></thead><tbody><tr><th scope="row">Live ${city.county ? "in the county" : "in the city"}</th><td class="num">${usd0(r85.annual.local)}</td><td class="num">${usd0(r85.annual.net)}</td></tr><tr><th scope="row">Only work there</th><td class="num">${usd0(nonres.annual.local)}</td><td class="num">${usd0(nonres.annual.net)}</td></tr></tbody></table></div>`
        : "";
    const lines = r85.localTaxes.map((line) => `<li><strong>${esc(line.name)}:</strong> ${usd0(line.annual)} a year on ${usd0(85000)} (${esc(line.rateOrNote)})</li>`).join("");
    localSection = `<section class="prose wide">
      <h2>The ${esc(place)} local income tax</h2>
      <div class="prose">
        <p>${esc(local.notes || "")}</p>
        ${city.note ? `<p>${esc(city.note)}</p>` : ""}
        ${lines ? `<ul>${lines}</ul>` : ""}
        <p>For a single person on ${usd0(85000)}, that is ${usd0(localCost)} a year on top of state and federal tax: ${localCost > 0 ? `about ${usd(localCost / 26)} from each biweekly paycheck` : "nothing at this income"}.</p>
      </div>
      ${resVsNon}
      <p class="updated">Source: <a href="${esc(local.source.url)}" rel="noopener">${esc(local.source.name)}</a>. Last checked ${longDate(local.lastVerified)}.</p>
    </section>`;
  } else {
    localSection = `<section class="prose">
      <h2>Does ${esc(place)} have a city income tax?</h2>
      <p>No. ${esc(place)} does not tax wages, so nothing is taken from a paycheck for the city. ${state.wageTax ? `You pay federal income tax, Social Security, Medicare and ${esc(state.name)} income tax.` : `${esc(state.name)} does not tax wages either, so only federal income tax, Social Security and Medicare come out.`}</p>
      ${city.note ? `<p>${esc(city.note)}</p>` : ""}
      <p>Living costs such as rent, sales tax and property tax differ from city to city, but they do not change your paycheck and are not part of this estimate.</p>
    </section>`;
  }

  const others = BIG.filter((slug) => slug !== city.slug)
    .map((slug) => CITIES.find((row) => row.slug === slug))
    .slice(0, 7);
  const compareRows = [city, ...others]
    .map((row) => {
      const r = row === city ? r85 : ctx.run({ state: row.state, localId: row.local || "", grossAnnual: 85000 });
      const diff = r.annual.net - r85.annual.net;
      return `<tr${row === city ? ' class="sum"' : ""}><th scope="row">${row === city ? esc(row.name) : `<a href="${cityPath(row)}">${esc(row.name)}</a>`}</th><td class="num">${usd0(r.annual.stateIncome + r.annual.statePayroll)}</td><td class="num">${usd0(r.annual.local)}</td><td class="num">${usd0(r.annual.net)}</td><td class="num diff">${row === city ? "" : Math.abs(diff) < 0.5 ? "same" : `${diff > 0 ? "+" : "−"}${usd0(Math.abs(diff))}`}</td></tr>`;
    })
    .join("");

  const faqs = [
    [`How much is ${usd0(60000)} a year after taxes ${inPlace}?`, `About ${usd0(r60.annual.net)} a year, or ${usd0(r60.annual.net / 12)} a month, for a single person with no other deductions. Federal income tax takes ${usd0(r60.annual.federalIncome)}, Social Security and Medicare ${usd0(r60.annual.socialSecurity + r60.annual.medicare)}${r60.annual.stateIncome > 0 ? `, ${state.name} income tax ${usd0(r60.annual.stateIncome)}` : ""}${r60.annual.statePayroll > 0 ? `, state payroll programs ${usd0(r60.annual.statePayroll)}` : ""}${r60.annual.local > 0 ? ` and the local tax ${usd0(r60.annual.local)}` : ""}.`],
    [
      `Does ${place} have a ${city.county ? "county" : "city"} income tax?`,
      local
        ? `Yes: ${localRateText(local)}. On ${usd0(85000)} a year it comes to ${usd0(localCost)}.`
        : `No. ${place} does not tax wages. ${state.wageTax ? `${state.name} income tax still applies.` : `${state.name} has no income tax on wages either.`}`,
    ],
    [`What taxes come out of a paycheck ${inPlace}?`, `Federal income tax, Social Security (6.2%) and Medicare (1.45%)${state.wageTax ? `, ${state.name} income tax (${rateLabel(state)})` : ""}${r85.statePayrollTaxes.length ? `, ${r85.statePayrollTaxes.map((line) => line.name).join(" and ")}` : ""}${local ? `, and the ${place} local tax` : ""}.`],
  ];
  if (local && local.appliesWhen === "resident-or-work") faqs.push([`I work in ${place} but live somewhere else. Do I pay the tax?`, local.method === "fixed" ? `Yes. It is charged to people who work in ${place}, wherever they live.` : local.nonresidentRate ? `Usually yes, at ${pct(local.nonresidentRate, 4)}. Untick “I live there” in the calculator to see it.` : `Usually yes. Untick “I live there” in the calculator to see it.`]);
  if (local && local.appliesWhen === "resident-only") faqs.push([`I work in ${place} but live somewhere else. Do I pay the tax?`, `No. It follows where you live. You pay the local tax, if any, of the place you live in.`]);

  const stateNote = state.wageTax ? `${esc(state.why)}` : `${esc(state.why)}`;
  const body = `<div class="wrap page">
    <header class="mast">
      <p class="kicker">${esc(state.name)} · tax year 2026</p>
      <h1>${esc(place)} paycheck calculator</h1>
      <p class="lede">${local ? `People ${city.county ? "who live in" : "in"} ${esc(place)} pay a local income tax of ${localRateText(local)} on top of ${state.wageTax ? `${esc(state.name)} income tax` : "federal tax"}.` : `${esc(place)} has no city income tax. ${state.wageTax ? `Paychecks here are taxed by the federal government and by ${esc(state.name)}.` : `${esc(state.name)} has no income tax on wages either, so only federal taxes come out.`}`} On ${usd0(85000)} a year, a single person takes home about <strong>${usd0(r85.annual.net)}</strong>, or ${usd(r85.periodNet)} every two weeks.</p>
    </header>
    ${calculatorBlock(ctx, preset, { examples: false })}
    <div class="below">
      <section>
        <h2>Take-home pay ${inPlace} by salary</h2>
        ${takeHomeTable(ctx, base, { amounts: [30000, 40000, 50000, 60000, 75000, 100000, 150000, 200000], caption: `Single filer living ${inPlace}, no dependents, no retirement or benefit deductions. Tax year 2026.` })}
      </section>
      ${localSection}
      <section class="prose">
        <h2>${esc(state.name)} taxes ${inPlace}</h2>
        <p>${stateNote}${local && Math.abs(stateOnly.annual.net - r85.annual.net) > 0.5 ? ` Elsewhere in ${esc(state.name)}, with no local tax, the same ${usd0(85000)} leaves ${usd0(stateOnly.annual.net)}.` : ""}</p>
        <p><a href="${statePath(state)}">${esc(state.name)} paycheck calculator and tax rates</a></p>
      </section>
      <section>
        <h2>${esc(place)} against other cities</h2>
        <div class="table-wrap"><table><caption>Single person earning ${usd0(85000)} a year and living in each place. Taxes only; living costs are not counted.</caption><thead><tr><th scope="col">Place</th><th scope="col" class="num">State taxes</th><th scope="col" class="num">Local tax</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">Against ${esc(place)}</th></tr></thead><tbody>${compareRows}</tbody></table></div>
        <p><a href="/compare/?a.state=${state.id}${city.local ? `&amp;a.local=${city.local}` : ""}&amp;salary=85000">Compare ${esc(place)} with anywhere else</a> · <a href="/cities/">All cities</a></p>
      </section>
      ${faqHTML(faqs, `${place} paycheck questions`)}
      <section class="prose">
        <h2>Sources</h2>
        ${sourcesList([...(local ? [local.source] : []), ...state.sources, ctx.tables.federal.sources[0], ctx.tables.fica.sources[0]])}
        <p class="updated">Figures last checked on ${longDate(local ? local.lastVerified : state.lastVerified)}. If something looks wrong, <a href="/contact/">tell us</a>.</p>
      </section>
    </div>
  </div>`;

  return {
    path: cityPath(city),
    section: "/states/",
    kind: "calculator",
    title: `${place}${city.county ? ", Maryland" : ""} Paycheck Calculator 2026: Take-Home Pay | LocalTakehome`,
    description: `Work out your 2026 take-home pay ${inPlace}${city.county ? ", Maryland" : `, ${state.name}`}: federal tax, ${state.wageTax ? `${state.name} income tax` : "no state income tax"}${local ? ` and the ${place} local tax (${localRateText(local)})` : ", and no city income tax"}, line by line.`,
    h1: `${place} paycheck calculator`,
    trail: [{ label: "States", href: "/states/" }, { label: state.name, href: statePath(state) }, { label: place }],
    ld: [faqLd(faqs)],
    body,
  };
}

function cityDirectory(ctx) {
  const card = (city) => {
    const r = ctx.run({ state: city.state, localId: city.local || "", grossAnnual: 85000 });
    const local = city.local ? ctx.locals.find((row) => row.id === city.local) : null;
    return `<a class="state-card" href="${cityPath(city)}"><strong>${esc(city.name)}, ${city.state}</strong><em>${usd0(r.annual.net)}</em><span>${local ? `Local tax: ${localRateText(local)}` : "No city income tax"}</span></a>`;
  };
  const withTax = CITIES.filter((city) => city.local).sort((a, b) => a.name.localeCompare(b.name));
  const without = CITIES.filter((city) => !city.local).sort((a, b) => a.name.localeCompare(b.name));
  return {
    path: "/cities/",
    section: "/states/",
    title: "City Paycheck Calculators (2026): Take-Home Pay by City | LocalTakehome",
    description: "Paycheck calculators for major U.S. cities and counties, with every city income tax included. See take-home pay on the same salary in each place.",
    trail: [{ label: "Cities" }],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>Paycheck calculators by city</h1>
      <p class="lede">The figure on each card is the take-home pay on an ${usd0(85000)} salary for a single person living there.</p>
    </header>
    <h2>Cities and counties with their own income tax</h2>
    <div class="state-grid">${withTax.map(card).join("")}</div>
    <p>These are the places with a page of their own. The calculator covers ${ctx.locals.length} local income taxes in all, including every county in Indiana and Maryland: see the <a href="/local-taxes/">full list</a>.</p>
    <h2>Large cities with no city income tax</h2>
    <div class="state-grid">${without.map(card).join("")}</div>
    <p>Not listed? Choose your state on the <a href="/states/">states page</a>. If your city or county charges an income tax we do not have, you can type its percentage into the calculator.</p>
  </div>`,
  };
}

function localTaxGuide(ctx) {
  const byState = new Map();
  for (const local of ctx.locals) {
    if (!byState.has(local.state)) byState.set(local.state, []);
    byState.get(local.state).push(local);
  }
  const sections = [...byState.entries()]
    .sort((a, b) => ctx.byId[a[0]].name.localeCompare(ctx.byId[b[0]].name))
    .map(([stateId, rows]) => {
      const state = ctx.byId[stateId];
      const body = rows
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => {
          const city = CITY_BY_LOCAL[row.id];
          const on = ctx.run({ state: stateId, localId: row.id, grossAnnual: 85000 }).annual.local;
          const name = row.name.replace(/, (Indiana|Maryland|Ohio|Missouri|Delaware)$/, "");
          const who = row.appliesWhen === "resident-only" ? "People who live there" : row.appliesWhen === "work" ? "People who work there" : "People who live or work there";
          return `<tr><th scope="row">${city ? `<a href="${cityPath(city)}">${esc(name)}</a>` : esc(name)}</th><td>${localRateText(row)}</td><td>${who}</td><td class="num">${usd0(on)}</td></tr>`;
        })
        .join("");
      return `<h3 id="${stateId.toLowerCase()}">${esc(state.name)}</h3>
      <div class="table-wrap"><table><thead><tr><th scope="col">Place</th><th scope="col">Rate in 2026</th><th scope="col">Who pays</th><th scope="col" class="num">On ${usd0(85000)} a year</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="fine"><a href="${statePath(state)}">${esc(state.name)} calculator</a></p>`;
    })
    .join("");
  const faqs = [
    ["Which states have city or county income taxes?", `In this calculator: ${[...byState.keys()].map((id) => ctx.byId[id].name).sort().join(", ")}. Many more municipalities in Ohio, Pennsylvania and Kentucky, and some cities in Alabama, also tax wages; you can enter any of those as a percentage.`],
    ["Do I pay the tax where I live or where I work?", "It depends on the state. In Indiana, Maryland and New York City the tax follows where you live. In Ohio, Kentucky, Missouri and Denver it mostly follows where you work. In Michigan and Philadelphia both residents and people who commute in pay, at different rates."],
    ["Does a 401(k) lower local income tax?", "Sometimes. Local taxes charged on state taxable income (Indiana, Maryland, New York City) and on federal wages (Michigan cities, Kansas City, St. Louis) are lower when you contribute. Ohio cities, Philadelphia, Pittsburgh and Kentucky cities tax the pay before a 401(k) comes out."],
    ["What if my city is not in the list?", "Open “W-4 and other details” in the calculator and enter your local rate as a percentage of pay. It is then included as its own line."],
  ];
  return {
    path: "/local-taxes/",
    title: "City and County Income Taxes on a Paycheck (2026) | LocalTakehome",
    description: `Every local income tax in the LocalTakehome calculator: ${ctx.locals.length} cities and counties in ${byState.size} states, with 2026 rates, who pays, and what each costs on an $85,000 salary.`,
    trail: [{ label: "City and county taxes" }],
    ld: [faqLd(faqs)],
    body: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>City and county income taxes</h1>
      <p class="lede">Most paycheck calculators stop at the state line. These ${ctx.locals.length} local income taxes are built into this one, each with its 2026 rate and an official source.</p>
    </header>
    <div class="below" style="margin-top:0">
      ${linkList([...byState.keys()].sort((a, b) => ctx.byId[a].name.localeCompare(ctx.byId[b].name)).map((id) => ({ href: `#${id.toLowerCase()}`, label: `${ctx.byId[id].name} (${byState.get(id).length})` })))}
      <section class="prose wide">
        <div class="prose">
          <h2>How local income taxes work</h2>
          <p>A local income tax is a tax on wages charged by a city, county or school district, on top of state and federal tax. Only some states allow them, but where they exist they can take 1% to nearly 4% of pay. They appear on a pay stub as a separate line, often labeled “local”, “city”, “county”, “EIT” or “OPT”.</p>
          <p>Each one has its own rules about who pays (residents, people who work there, or both) and about which pay is taxed. The calculator applies those rules for each place below. A local tax is added only when you choose the place.</p>
        </div>
        ${sections}
      </section>
      ${faqHTML(faqs)}
    </div>
  </div>`,
  };
}

export function cityPages(ctx) {
  return [cityDirectory(ctx), localTaxGuide(ctx), ...CITIES.map((city) => cityPage(ctx, city))];
}
