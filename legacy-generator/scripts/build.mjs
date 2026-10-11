import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { locations as launchLocations } from "../src/content/locations.mjs";
import { generateStateLocations } from "../src/content/generate-locations.mjs";
import { calculateTakeHome, compareBonus } from "../src/js/engine.mjs";
import { monetize } from "../src/js/partners.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const SITE = "https://localtakehome.com";
const VERIFIED = "September 27, 2026";

const readJson = (name) => JSON.parse(readFileSync(join(root, "data", name), "utf8"));
const tables = {
  federal: readJson("federal-2026.json"),
  fica: readJson("fica-2026.json"),
  states: readJson("states-2026.json"),
  local: readJson("local-2026.json"),
  payroll: readJson("state-payroll-2026.json"),
};

const stateOnlyLaunch = launchLocations.filter((page) => !page.localId);
const existingStateOnlySlugs = new Set(stateOnlyLaunch.map((page) => page.slug));
const coveredStateIds = stateOnlyLaunch.map((page) => page.state);
const generatedLocations = generateStateLocations({
  states: tables.states.states,
  payroll: tables.payroll,
  existingSlugs: [...existingStateOnlySlugs, ...launchLocations.map((page) => page.slug)],
  coveredStateIds,
});
const locations = [...launchLocations, ...generatedLocations];
const stateSlug = {};
for (const page of locations) {
  if (!page.localId && !stateSlug[page.state]) stateSlug[page.state] = page.slug;
}
const pagesByState = new Map();
for (const page of locations) {
  if (!pagesByState.has(page.state)) pagesByState.set(page.state, []);
  pagesByState.get(page.state).push(page);
}


function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function usd(n) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function words(page) {
  return page.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

function jsonld(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function crumbs(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: SITE + item.path,
    })),
  };
}

function faqLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

function appLd(name, path) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: SITE + path,
    description: "Educational 2026 U.S. take-home pay estimate. Not tax advice and not an employer payroll system.",
  };
}

const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LocalTakehome",
  url: SITE,
  description: "A private paycheck calculator for U.S. federal, FICA, state, and local taxes.",
};

function nav(active) {
  const item = (href, label, key) =>
    `<a href="${href}" ${active === key ? 'aria-current="page"' : ""}>${label}</a>`;
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="LocalTakehome home">
        <img class="brand-lockup" src="/assets/localtakehome-lockup.png" alt="LocalTakehome">
        <span class="tagline">True take-home pay for where you actually live.</span>
      </a>
      <button class="menu-btn" type="button" data-menu aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Primary">
        ${item("/paycheck-calculator", "Calculator", "calculator")}
        ${item("/compare", "Compare", "compare")}
        ${item("/bonus-calculator", "Bonus", "bonus")}
        ${item("/hourly-paycheck-calculator", "Hourly", "hourly")}
        ${item("/states", "States", "states")}
        ${item("/methodology", "How it works", "method")}
        <details class="tools">
          <summary>Tools</summary>
          <div class="tools-menu">
            <a href="/overtime-calculator">Overtime</a>
            <a href="/raise-calculator">Raise</a>
            <a href="/401k-calculator">401(k) impact</a>
            <a href="/employer-cost-calculator">Employer cost</a>
            <a href="/w4-calculator">W-4 helper</a>
            <a href="/contractor-vs-w2">Contractor vs W-2</a>
            <a href="/local-taxes">Local taxes</a>
            <a href="/map">Take-home map</a>
          </div>
        </details>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <a href="/methodology">Methodology</a>
        <a href="/methodology#sources">Sources</a>
        <a href="/local-taxes">Local taxes</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/about">About</a>
        <a href="/about#corrections">Corrections</a>
      </div>
      <p>Estimate for tax year 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules. Not tax, payroll, or financial advice.</p>
      <p>Rates last verified ${VERIFIED}. Calculations stay in your browser. Educational only — not a substitute for an employer payroll system, a CPA, or the IRS Tax Withholding Estimator.</p>
    </div>
  </footer>
  <dialog class="dialog" id="keys" aria-labelledby="keys-title">
    <h2 id="keys-title">Keyboard</h2>
    <p><span class="kbd">/</span> Focus the pay field</p>
    <p><span class="kbd">?</span> Open this list</p>
    <p><span class="kbd">Esc</span> Close</p>
    <button class="ghost" type="button" data-close-keys>Close</button>
  </dialog>
  <script type="module" src="/js/site.mjs?v=20261004a"></script>`;
}

function layout({ title, description, path, active, body, schemas = [], robots = "index,follow" }) {
  const canonical = SITE + (path === "/" ? "/" : path);
  const ogImage = `${SITE}/og.svg`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="${esc(robots)}">
  <meta name="theme-color" content="#F4EFE6">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="LocalTakehome">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="stylesheet" href="/css/site.css?v=20261004a">
  <script>
    try {
      localStorage.removeItem("lth-theme");
      localStorage.removeItem("tth-theme");
    } catch (e) {}
  </script>
  ${schemas.map(jsonld).join("\n  ")}
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4059575347806121"
     crossorigin="anonymous"></script>
</head>
<body data-page="${path.includes("calculator") || path === "/" ? "" : ""}">
  <a class="skip" href="#main">Skip to content</a>
  ${nav(active)}
  <main id="main">${body}</main>
  ${footer()}
</body>
</html>`;
}

function page({ title, description, path, active, main, schemas, pageKind = "static" }) {
  const html = layout({ title, description, path, active, body: main, schemas }).replace(
    'data-page=""',
    `data-page="${pageKind}"`,
  );
  const dir = path === "/" ? dist : join(dist, path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  const file = path === "/" ? join(dist, "index.html") : join(dir, "index.html");
  writeFileSync(file, html);
}

function faqHtml(faqs) {
  return `<section class="faq"><h2>Questions</h2>${faqs
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
    .join("")}</section>`;
}

function ads(context = "default") {
  return monetize(context);
}

function noscript() {
  return `<noscript><p class="noscript">LocalTakehome calculates in your browser. With JavaScript off, the form cannot update. The methodology page lists the rates, and the example tables on each state page are still readable.</p></noscript>`;
}

function calcMount(preset) {
  const attr = preset ? ` data-preset="${esc(JSON.stringify(preset))}"` : "";
  return `${noscript()}<div id="calculator"${attr}><p class="loading">Loading the 2026 calculator…</p></div>`;
}

function runSalary(state, gross, extra = {}) {
  return calculateTakeHome({
    payType: "salary",
    employment: "w2",
    frequency: "biweekly",
    filingStatus: "single",
    grossAnnual: gross,
    state,
    livesInPlace: true,
    ...extra,
  }, tables);
}


function fmtPct(rate) {
  if (!Number.isFinite(rate)) return "";
  const n = rate * 100;
  const text = n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function stateRecord(id) {
  return tables.states.states.find((row) => row.id === id);
}

function localRecord(id) {
  return tables.local.jurisdictions.find((row) => row.id === id);
}

function payrollPrograms(stateId) {
  return tables.payroll.programs.filter((row) => row.state === stateId);
}

function stateMechanism(state) {
  if (!state?.wageTax) return "no state wage income tax";
  if (state.type === "flat" || state.flat) {
    const rows = (state.brackets?.single || []).filter((row) => row.rate > 0);
    const rate = rows.length ? rows[rows.length - 1].rate : 0;
    return `flat state income tax${rate ? ` at ${fmtPct(rate)}` : ""}`;
  }
  const rows = state.brackets?.single || [];
  const top = rows.length ? Math.max(...rows.map((row) => row.rate)) : 0;
  return `graduated state income tax${top ? ` (top ${fmtPct(top)})` : ""}`;
}

function whatThisPageIncludes(loc) {
  const state = stateRecord(loc.state);
  const local = loc.localId ? localRecord(loc.localId) : null;
  const programs = payrollPrograms(loc.state);
  const items = [
    "Federal income tax using the 2026 standard deduction and Rev. Proc. 2025-32 brackets",
    "Social Security (6.2% up to $184,500) and Medicare (1.45%, plus Additional Medicare when wages clear the filing-status threshold)",
    `${state?.name || loc.state}: ${stateMechanism(state)}`,
  ];
  if (programs.length) {
    items.push(`State payroll: ${programs.map((p) => p.name).join(", ")}`);
  } else {
    items.push("No employee state disability / paid-leave premium modeled for this state yet");
  }
  if (local && local.method !== "reference") {
    items.push(`Local: ${local.name} (${local.sourceLabel || local.method})`);
  } else if (loc.localId) {
    items.push("Local jurisdiction selected on this page");
  } else {
    items.push("Local wage tax only if you select a city/county or enter a custom percent");
  }
  return `<section class="prose"><h2>What this page includes</h2><ul>${items
    .map((item) => `<li>${esc(item)}</li>`)
    .join("")}</ul></section>`;
}

function localTaxExplainer(loc) {
  const state = stateRecord(loc.state);
  const local = loc.localId ? localRecord(loc.localId) : null;
  let body = "";
  if (local && local.method !== "reference") {
    if (local.method === "flat") {
      const res = fmtPct(local.residentRate);
      const non = fmtPct(local.nonresidentRate ?? local.residentRate);
      body = `${local.name} is modeled as a flat local tax: ${res} for residents and ${non} for nonresidents (when the rates differ). Use the live-here switch for resident versus nonresident treatment. ${local.notes || ""}`;
    } else if (local.method === "brackets") {
      body = `${local.name} uses resident brackets rather than a single flat wage percent. Working in the city without living there does not apply the resident schedule. ${local.notes || ""}`;
    } else if (local.method === "surcharge") {
      body = `${local.name} is a surcharge on state tax for residents (not a flat wage percent), with a separate nonresident earnings tax when you uncheck live-here. ${local.notes || ""}`;
    } else if (local.method === "layered-threshold") {
      body = `${local.name} applies layered taxes above income thresholds for residents. Below those thresholds the local lines are zero in this estimate. ${local.notes || ""}`;
    } else {
      body = `${local.name}: ${local.notes || local.sourceLabel || "See the local tax index for the modeled method."}`;
    }
  } else if (!state?.localPossible) {
    body = `${state?.name || loc.state} does not have a local wage tax in this file. City costs show up in rent and sales tax, not as a second income-tax line on the stub.`;
  } else if (loc.state === "PA") {
    body = `Pennsylvania localities and school districts levy earned income taxes that vary by address. Philadelphia and Pittsburgh are named. Everywhere else, enter the percent from your Act 32 rate sheet rather than borrowing a neighbor’s rate.`;
  } else if (loc.state === "OH") {
    body = `Ohio cities tax qualifying wages where you work. Columbus and Cleveland are named at 2.5%. Hundreds of other municipalities need a custom percent. Credits between a home city and a work city are not computed.`;
  } else if (loc.state === "MD") {
    body = `Every Maryland county and Baltimore City adds a local rate on Maryland taxable income. Montgomery County and Baltimore City are named at 3.20%. Other counties belong in the custom percent field.`;
  } else if (loc.state === "IN") {
    body = `Indiana’s local income tax is levied by county. Marion County (Indianapolis) is named at 2.02%. Other counties need the certified percent from the Department of Revenue chart.`;
  } else if (loc.state === "NY") {
    body = `New York City and Yonkers are optional local layers. This page does not assume either one. City resident tax applies only when you select that place and live there.`;
  } else if (loc.state === "MI") {
    body = `Most Michigan cities do not levy an income tax. Detroit is named at 2.4% resident / 1.2% nonresident. Other city rates can be typed as a custom percent.`;
  } else if (loc.state === "OR") {
    body = `Portland / Multnomah threshold taxes are optional and resident-only above high income thresholds. The 0.1% statewide transit tax is separate and already in the payroll model for Oregon employees.`;
  } else {
    body = `${state?.name || loc.state} can have local wage taxes in some places. This page leaves local tax off until you select a named jurisdiction or enter a custom percent.`;
  }
  return `<section class="prose"><h2>Local tax</h2><p>${esc(body)}</p></section>`;
}

function whatIsNotIncluded(loc) {
  const state = stateRecord(loc.state);
  const place = loc.localId ? localRecord(loc.localId)?.name : state?.name || loc.state;
  const shared = `Credits, itemized deductions, multi-state credits, property tax, sales tax, and unsourced local rates are not included. Employer payroll tables can differ from this annualized estimate.`;
  let specific = `This ${place} page does not invent taxes that are missing from the 2026 data files.`;
  if (loc.state === "PA" && !loc.localId) {
    specific = `Pennsylvania township and school-district rates outside the named cities are not guessed.`;
  } else if (loc.state === "OH" && !loc.localId) {
    specific = `Ohio municipalities beyond Columbus and Cleveland are not auto-selected.`;
  } else if (loc.state === "MD" && !loc.localId) {
    specific = `Maryland counties other than the named ones must be entered as a custom percent.`;
  } else if (loc.localId === "portland-multnomah") {
    specific = `Paid Leave Oregon is not in the payroll file yet, and Oregon’s federal-tax deduction is not fully modeled.`;
  } else if (loc.state === "MA") {
    specific = `Massachusetts PFML withholding is not modeled yet, so the stub is light by that premium.`;
  } else if (!state?.wageTax) {
    specific = `Property tax and sales tax in ${state?.name || loc.state} are real costs of living and are intentionally off this paycheck.`;
  }
  return `<section class="prose"><h2>What is not included</h2><p>${esc(shared)} ${esc(specific)}</p></section>`;
}

function nearbyLinks(loc) {
  const siblings = (pagesByState.get(loc.state) || []).filter((page) => page.slug !== loc.slug);
  const statePage = stateSlug[loc.state] ? locations.find((page) => page.slug === stateSlug[loc.state]) : null;
  const links = [];
  const compareQ = new URLSearchParams({
    "a.state": loc.state,
    "b.state": loc.state === "TX" ? "CA" : "TX",
    salary: "85000",
  });
  if (loc.localId) compareQ.set("a.local", loc.localId);
  links.push(`<a href="/compare?${esc(compareQ.toString())}">Compare</a>`);
  links.push(`<a href="/bonus-calculator">Bonus</a>`);
  links.push(`<a href="/hourly-paycheck-calculator">Hourly</a>`);
  if (loc.localId && statePage && statePage.slug !== loc.slug) {
    links.push(`<a href="/${esc(statePage.slug)}">${esc(stateRecord(loc.state)?.name || loc.state)} (state)</a>`);
  }
  for (const sib of siblings.slice(0, 6)) {
    const label = sib.localId ? (localRecord(sib.localId)?.name || sib.h1) : `${stateRecord(sib.state)?.name || sib.state} (state)`;
    links.push(`<a href="/${esc(sib.slug)}">${esc(label)}</a>`);
  }
  links.push(`<a href="/states">All states</a>`);
  links.push(`<a href="/local-taxes">Local taxes</a>`);
  return `<section class="prose"><h2>Nearby</h2><p>${links.join(" · ")}</p></section>`;
}

function sourcesHtml(loc) {
  const items = [];
  for (const src of tables.federal.sources || []) items.push(src);
  for (const src of tables.fica.sources || []) items.push(src);
  for (const src of tables.states.sources || []) items.push(src);
  for (const program of payrollPrograms(loc.state)) {
    if (program.source?.url) items.push({ name: program.source.name || program.name, url: program.source.url });
  }
  const local = loc.localId ? localRecord(loc.localId) : null;
  if (local?.source?.url) items.push({ name: local.source.name || local.sourceLabel || local.name, url: local.source.url });
  const seen = new Set();
  const lis = [];
  for (const item of items) {
    if (!item?.url || seen.has(item.url)) continue;
    seen.add(item.url);
    lis.push(`<li><a href="${esc(item.url)}">${esc(item.name || item.url)}</a></li>`);
  }
  return `<section class="prose"><h2>Sources</h2><ul>${lis.join("")}</ul><p class="meta">Rates last verified ${VERIFIED}. Tax year 2026.</p></section>`;
}

function locationCrumbs(loc) {
  const items = [
    { name: "Home", path: "/" },
    { name: "States", path: "/states" },
  ];
  const state = stateRecord(loc.state);
  if (loc.localId && stateSlug[loc.state]) {
    items.push({ name: state?.name || loc.state, path: `/${stateSlug[loc.state]}` });
    items.push({ name: localRecord(loc.localId)?.name || loc.h1, path: `/${loc.slug}` });
  } else {
    items.push({ name: state?.name || loc.h1, path: `/${loc.slug}` });
  }
  return crumbs(items);
}


function exampleTable(loc) {
  const salaries = [40000, 60000, 80000, 100000, 150000];
  const rows = salaries.map((gross) => {
    const result = runSalary(loc.state, gross, { localId: loc.localId || "", livesInPlace: true });
    return `<tr>
      <th>${usd(gross)}</th>
      <td class="num">${usd(result.annual.federalIncome)}</td>
      <td class="num">${usd(result.annual.socialSecurity + result.annual.medicare + result.annual.additionalMedicare)}</td>
      <td class="num">${usd(result.annual.stateIncome)}</td>
      <td class="num">${usd(result.annual.statePayroll)}</td>
      <td class="num">${usd(result.annual.local)}</td>
      <td class="num">${usd(result.annual.net)}</td>
      <td class="num">${usd(result.periodNet)}</td>
    </tr>`;
  });
  return `<div class="table-wrap"><table>
    <caption class="meta" style="caption-side:bottom;padding:8px 12px">Single filer, biweekly, no deductions, tax year 2026. Educational estimate.</caption>
    <thead><tr><th>Salary</th><th class="num">Federal</th><th class="num">FICA</th><th class="num">State</th><th class="num">Payroll</th><th class="num">Local</th><th class="num">Net / year</th><th class="num">Net / check</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>`;
}

const homeFaqs = [
  ["Does this send my salary to a server?", "No. The rate tables download once. The math runs in your browser. A shared link stores the inputs in the address bar, which you control."],
  ["Why is local tax sometimes zero?", "It is added only when you pick a city or county, or type a custom percent. New York City is not applied to the rest of New York."],
  ["Does a 401(k) lower Social Security withholding?", "No. A traditional 401(k) reduces federal (and most state) income-tax wages. Social Security and Medicare wages stay the same. HSA contributions and Section 125 health premiums do reduce FICA wages."],
  ["Is this my exact paycheck?", "No. It is an annualized educational estimate for 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules."],
  ["Which tax year is this?", "2026. Federal income tax uses an annualized bracket withholding estimate from Rev. Proc. 2025-32 — not Publication 15-T wage-bracket tables. The Social Security wage base is $184,500."],
  ["Why do paycheck calculators disagree?", "Many tools use different methods: some approximate Pub 15-T tables, some annualize brackets, and some invent flat local rates. LocalTakehome annualizes federal brackets, applies named locals only when selected, and leaves unsourced locals blank rather than guessing."],
  ["Do I pay NYC tax if I work in NYC but live in New Jersey?", "Not the NYC resident tax in this model. Uncheck “I live in this city” (or leave NYC unselected). City resident brackets are off for nonresidents. You may still owe New York State tax on New York wages; this estimate does not prepare a New Jersey return or multi-state credits."],
  ["Why is my bonus withheld at a high rate?", "Many employers withhold federal tax on supplemental wages at a flat 22%. That is a withholding convention, not a special bonus bracket. The aggregate method here shows the annual tax difference when the bonus is added to salary. State and local still follow that difference."],
  ["Does Texas mean no tax at all?", "No. Texas has no state wage income tax, but federal income tax and FICA still apply. Social Security is 6.2% up to $184,500 and Medicare is 1.45% with no cap."],
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "src/css"), join(dist, "css"), { recursive: true });
cpSync(join(root, "src/js"), join(dist, "js"), { recursive: true });
cpSync(join(root, "src/fonts"), join(dist, "fonts"), { recursive: true });
cpSync(join(root, "data"), join(dist, "data"), { recursive: true });
cpSync(join(root, "src/favicon.png"), join(dist, "favicon.png"));
cpSync(join(root, "src/assets"), join(dist, "assets"), { recursive: true });
cpSync(join(root, "src/og.svg"), join(dist, "og.svg"));
const publicDir = join(root, "public");
cpSync(publicDir, dist, { recursive: true });
writeFileSync(join(dist, "_headers"), `/css/*
  Cache-Control: public, max-age=300, must-revalidate
/ads.txt
  Content-Type: text/plain; charset=utf-8
`);

page({
  path: "/",
  title: "Paycheck Calculator 2026 — Take-Home Pay by State and City | LocalTakehome",
  description: "True take-home pay for where you actually live. Estimate federal, FICA, state, and local taxes.",
  active: "calculator",
  pageKind: "calculator",
  schemas: [orgLd, appLd("LocalTakehome", "/"), faqLd(homeFaqs)],
  main: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Tax year 2026</p>
      <h1>What do you actually take home?</h1>
      <p class="lede">Federal, FICA, state, and local taxes — based on where you live.</p>
      <p class="meta mast-privacy">The estimate runs in this browser. Nothing you type is uploaded.</p>
    </header>
    ${calcMount()}
    <div class="below">
      <section class="prose">
        <h2>How to read the stub</h2>
        <p>Gross pay comes first. Pre-tax deductions come off next, and they do not all affect the same wage. A traditional 401(k) lowers income tax. It does not lower Social Security or Medicare. An HSA or a Section 125 health premium usually lowers both.</p>
        <p>Then the withholdings, each named: federal income tax, Social Security, Medicare, Additional Medicare if wages clear the filing-status threshold, state income tax, state payroll programs such as California SDI, and local tax only when you selected a place. Net is what remains. The year column is that paycheck times the number of checks, so the stub adds up.</p>
        <p>The sample stub is a real $85,000 single calculation, labeled as a sample until you enter your own pay. <a href="/methodology">How the rates were chosen</a>.</p>
      </section>
      ${ads()}
      ${faqHtml(homeFaqs)}
      <section class="prose">
        <h2>Browse by place</h2>
        <p>True take-home pay for where you actually live. Start with the <a href="/states">full state directory</a>, or open a major guide:</p>
        <p>
          <a href="/california-paycheck-calculator">California</a> ·
          <a href="/texas-paycheck-calculator">Texas</a> ·
          <a href="/florida-paycheck-calculator">Florida</a> ·
          <a href="/new-york-paycheck-calculator">New York</a> ·
          <a href="/new-york-city-paycheck-calculator">New York City</a> ·
          <a href="/pennsylvania-paycheck-calculator">Pennsylvania</a> ·
          <a href="/philadelphia-paycheck-calculator">Philadelphia</a> ·
          <a href="/illinois-paycheck-calculator">Illinois</a>
        </p>
      </section>
    </div>
  </div>`,
});

const paycheckFaqs = [
  ["Same engine as the homepage?", "Yes. This page mounts the same 2026 calculator without the homepage explainer. Federal tax is an annualized bracket withholding estimate (Rev. Proc. 2025-32), not Pub 15-T tables."],
  ["Will local tax appear automatically?", "Only when you select a city or county, or enter a custom percent. New York City is never applied to the rest of New York."],
  ["Does a traditional 401(k) cut FICA?", "No. It reduces income-tax wages. HSA and Section 125 premiums reduce both income tax and FICA in this model."],
  ...homeFaqs.filter(([q]) => q.includes("exact paycheck") || q.includes("tax year") || q.includes("server")),
];

page({
  path: "/paycheck-calculator",
  title: "U.S. Paycheck Calculator 2026 | LocalTakehome",
  description: "Estimate a 2026 paycheck with federal brackets, FICA, every state, and named city taxes when you select them. Runs in your browser.",
  active: "calculator",
  pageKind: "calculator",
  schemas: [appLd("LocalTakehome paycheck calculator", "/paycheck-calculator"), faqLd(paycheckFaqs), crumbs([{ name: "Home", path: "/" }, { name: "Paycheck calculator", path: "/paycheck-calculator" }])],
  main: `<div class="wrap page">
    <header class="mast">
      <p class="kicker">Calculator</p>
      <h1>Paycheck calculator</h1>
      <p class="lede">Salary or hourly, W-2 or contractor, with a city layer that stays off until you ask for it. Share the result with the address bar. Tax year 2026.</p>
    </header>
    ${calcMount()}
    <div class="below">
      <section class="prose"><p>Same engine as the <a href="/">homepage</a>. Read the <a href="/methodology">methodology</a> before you treat a number as a payroll instruction. More context is also in the <a href="/#main">homepage FAQ</a>.</p></section>
      ${faqHtml(paycheckFaqs)}
    </div>
  </div>`,
});

function toolPage({ path, title, description, active, kicker, h1, lede, tool, prose, faqs = [], monetizeContext = "default" }) {
  page({
    path,
    title,
    description,
    active,
    pageKind: "tool",
    schemas: [appLd(title, path), ...(faqs.length ? [faqLd(faqs)] : []), crumbs([{ name: "Home", path: "/" }, { name: h1, path }])],
    main: `<div class="wrap page">
      <header class="mast"><p class="kicker">${esc(kicker)}</p><h1>${esc(h1)}</h1><p class="lede">${lede}</p></header>
      ${noscript()}
      <div id="tool" data-tool="${esc(tool)}"><p class="loading">Loading the tool…</p></div>
      <div class="below">${prose}${ads(monetizeContext)}${faqs.length ? faqHtml(faqs) : ""}</div>
    </div>`,
  });
}

toolPage({
  path: "/compare",
  title: "Compare Paychecks by City or State (2026) | LocalTakehome",
  description: "Compare estimated 2026 take-home pay for two salaries, states, or cities, including local tax when you select it.",
  active: "compare",
  kicker: "Compare offers",
  h1: "Compare two paychecks",
  lede: "Same filing status, two locations or two salaries. Local tax is included only on the offer where you pick a city.",
  tool: "compare",
  monetizeContext: "compare",
  prose: `<section class="prose"><h2>What the difference means</h2><p>The table is an annualized estimate, then split into biweekly checks. A higher net is not a full cost-of-living comparison. Rent, commuting, and sales tax are outside the stub. Reciprocity between two states is not computed; each column taxes only the state you chose for it.</p></section>`,
});

toolPage({
  path: "/bonus-calculator",
  title: "Bonus Tax Calculator — Aggregate vs 22% | LocalTakehome",
  description: "See how a bonus changes a 2026 paycheck. Compare the aggregate tax difference with flat 22% federal supplemental withholding.",
  active: "bonus",
  kicker: "Bonus",
  h1: "Bonus calculator",
  lede: "Two different questions get mixed together. What tax does the bonus create, and what will the employer withhold on the check?",
  tool: "bonus",
  prose: `<section class="prose"><h2>Aggregate versus 22%</h2><p>The aggregate method adds the bonus to the year and subtracts the tax on salary alone. That is the difference in the annual bill under this estimate. Many employers instead withhold federal tax on supplemental wages at a flat 22%. That is a withholding convention, not a special tax bracket. If you are already in the 22% federal bracket, the two federal numbers often match. State and local tax still follow the aggregate difference here.</p></section>`,
  faqs: [
    ["Is a bonus taxed at 40%?", "Not as a special rate. Withholding can look heavy because it is a lump sum on top of wages that have already used the standard deduction. The return uses the same brackets as the rest of your income."],
    ["What is the aggregate method?", "Add the bonus to annual wages, compute tax, then subtract the tax on salary alone. That difference is the tax attributable to the bonus under this estimate."],
    ["What is the 22% supplemental rate?", "Many employers withhold federal tax on supplemental wages at a flat 22%. That is a withholding convention, not a different federal bracket. State and local here still follow the aggregate difference."],
  ],
});

page({
  path: "/hourly-paycheck-calculator",
  title: "Hourly Paycheck Calculator 2026 | LocalTakehome",
  description: "Turn an hourly rate, weekly hours, and overtime into an estimated 2026 paycheck with federal, FICA, state, and local tax.",
  active: "hourly",
  pageKind: "calculator",
  schemas: [appLd("Hourly paycheck calculator", "/hourly-paycheck-calculator")],
  main: `<div class="wrap page">
    <header class="mast"><p class="kicker">Hourly</p><h1>Hourly paycheck calculator</h1>
    <p class="lede">Rate, hours, paid weeks, and overtime. The year is annualized, then split into the paycheck frequency you choose. Default is 40 hours and 52 weeks.</p></header>
    ${calcMount({ payType: "hourly" })}
    <div class="below prose"><p>Overtime uses the multiplier on the rate, usually 1.5. Tips and a bonus can be added under Local details. For a focused look at the overtime dollars alone, use the <a href="/overtime-calculator">overtime calculator</a>.</p></div>
  </div>`,
});

toolPage({
  path: "/overtime-calculator",
  title: "Overtime Pay Calculator 2026 | LocalTakehome",
  description: "Estimate how overtime hours change a 2026 paycheck after federal, FICA, and state tax.",
  active: "tools",
  kicker: "Overtime",
  h1: "Overtime calculator",
  lede: "The premium is not all yours. This compares a week with overtime to the same job without it.",
  tool: "overtime",
  prose: `<section class="prose"><p>Hours are annualized across 52 weeks so the brackets see a full year, then the result is shown on a weekly check. A one-off overtime week is lumpier than that. The direction is still right: the extra gross is taxed at your marginal rates, not at a special overtime rate.</p></section>`,
});

toolPage({
  path: "/raise-calculator",
  title: "Raise Calculator — Net After Tax (2026) | LocalTakehome",
  description: "See how much of a 2026 raise survives federal, FICA, and state tax.",
  active: "tools",
  kicker: "Raise",
  h1: "Raise calculator",
  lede: "A 10% raise is not a 10% deposit. The kept share of each new dollar depends on the bracket you are already in.",
  tool: "raise",
  prose: `<section class="prose"><p>FICA takes 7.65% of the raise until you cross the Social Security wage base, then only Medicare. Federal and state tax take their marginal rates. Local tax is not on this tool; add it by comparing two cities if the raise also moves you.</p></section>`,
});

toolPage({
  path: "/401k-calculator",
  title: "401(k) Impact on Take-Home Pay (2026) | LocalTakehome",
  description: "See how a traditional 401(k) changes 2026 take-home pay. FICA wages do not fall.",
  active: "tools",
  kicker: "401(k)",
  h1: "401(k) impact",
  lede: "The contribution is still your money. The paycheck shrinks by less than the deferral because income tax falls. Payroll tax does not.",
  tool: "401k",
  prose: `<section class="prose"><p>The 2026 employee elective deferral limit is $24,500 before catch-up contributions. This tool does not add catch-up automatically. Roth contributions are post-tax and would not move the federal line; this page is the traditional deferral.</p></section>`,
});

toolPage({
  path: "/employer-cost-calculator",
  title: "Employer Payroll Cost Calculator (2026) | LocalTakehome",
  description: "Estimate the employer side of a 2026 W-2: matching FICA, FUTA, and benefits you enter.",
  active: "tools",
  kicker: "Employer cost",
  h1: "What an employee costs",
  lede: "Salary is the offer. Matching Social Security, Medicare, a small FUTA bill, and benefits you type are the rest of the cash.",
  tool: "employer",
  monetizeContext: "employer-cost",
  prose: `<section class="prose"><p>FUTA is modeled at the 0.6% net credit rate on the first $7,000, which is $42. State unemployment is blank until you enter your rate, because a guessed SUTA rate would be fiction. Additional Medicare has no employer match.</p></section>`,
});

page({
  path: "/w4-calculator",
  title: "W-4 Withholding Helper (2026) | LocalTakehome",
  description: "See how W-4 entries change an estimated 2026 paycheck. Educational only. Not an IRS form.",
  active: "tools",
  pageKind: "calculator",
  schemas: [appLd("W-4 helper", "/w4-calculator")],
  main: `<div class="wrap page">
    <header class="mast"><p class="kicker">W-4</p><h1>W-4 helper</h1>
    <p class="lede">The 2020 W-4 does not ask for allowances. It asks for a dollar credit, other income, other deductions, extra withholding, and a checkbox if you have more than one job. This page shows how those entries move an estimate. It does not fill a legal form.</p></header>
    <section class="prose">
      <p>Step 2, the multiple-jobs checkbox, is approximated here with half the standard deduction and narrower brackets. That increases withholding. It is not the IRS worksheet that uses the other job’s wages.</p>
      <p>Step 3 is a dollar credit for the year, not a count of people. Step 4(a) adds other income. Step 4(b) adds deductions beyond the standard deduction. Step 4(c) is extra withholding on every check, and it does not change the bracket math.</p>
    </section>
    ${calcMount({ open: ["w4"] })}
    <div class="below"></div>
  </div>`,
});

toolPage({
  path: "/contractor-vs-w2",
  title: "Contractor vs W-2 Take-Home (2026) | LocalTakehome",
  description: "Compare estimated W-2 net pay with self-employment tax on the same gross. Not a Schedule C.",
  active: "tools",
  kicker: "Contractor",
  h1: "Contractor vs W-2",
  lede: "The same gross is not the same tax. A contractor pays both halves of Social Security and Medicare, on 92.35% of profit, and can subtract expenses.",
  tool: "contractor",
  monetizeContext: "contractor",
  prose: `<section class="prose"><p>Half of the 12.4% and 2.9% self-employment tax is subtracted before income tax. The qualified business income deduction is not included, so a contractor’s income tax here can run high. Quarterly set-aside is the tax total divided by four. It is not a 1040-ES voucher. State disability premiums are omitted in contractor mode because coverage is often optional.</p></section>`,
});

const stateSections = [...tables.states.states]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((state) => {
    const top = state.wageTax ? Math.max(...(state.brackets?.single || []).map((row) => row.rate), 0) : 0;
    const kind = !state.wageTax ? "No wage tax" : state.flat || state.type === "flat" ? "Flat" : "Graduated";
    const rate = state.wageTax ? `${(top * 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}% top` : "—";
    const pages = pagesByState.get(state.id) || [];
    const statePage = pages.find((page) => !page.localId);
    const cityPages = pages.filter((page) => page.localId);
    const href = statePage ? `/${statePage.slug}` : stateSlug[state.id] ? `/${stateSlug[state.id]}` : `/paycheck-calculator?state=${state.id}`;
    const quality = statePage?.copyQuality || (pages[0]?.copyQuality ?? "generated");
    const cityLinks = cityPages.length
      ? `<ul class="meta" style="margin:6px 0 0 1rem">${cityPages
          .map((page) => `<li><a href="/${esc(page.slug)}">${esc(localRecord(page.localId)?.name || page.h1)}</a></li>`)
          .join("")}</ul>`
      : "";
    return `<article class="card">
      <h3><a href="${href}">${esc(state.name)}</a></h3>
      <p class="meta">${esc(kind)} · ${esc(rate)} · ${state.localPossible ? "Local possible" : "No local in file"} · ${esc(quality)}</p>
      <p><a href="${href}">Open ${statePage ? "guide" : "calculator"}</a>${cityPages.length ? ` · ${cityPages.length} city page${cityPages.length > 1 ? "s" : ""}` : ""}</p>
      ${cityLinks}
    </article>`;
  })
  .join("");

page({
  path: "/states",
  title: "State Paycheck Calculators — All 50 States and D.C. | LocalTakehome",
  description: "Every state plus the District of Columbia, with 2026 wage-tax structure, city pages when available, and a link into the calculator.",
  active: "states",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "States", path: "/states" }])],
  main: `<div class="wrap page">
    <header class="mast"><p class="kicker">States</p><h1>All 50 states and D.C.</h1>
    <p class="lede">Launch guides keep unique local storytelling. Generated guides cover the remaining states from the same 2026 rate tables. City pages nest under their parent state.</p></header>
    <div class="cards">${stateSections}</div>
    <p class="meta" style="margin-top:12px">Top rate is the highest published bracket, not an effective rate. “No wage tax” includes Washington, which taxes certain capital gains and not paychecks.</p>
  </div>`,
});

const mapRows = tables.states.states
  .map((state) => {
    const result = runSalary(state.id, 80000);
    return { name: state.name, id: state.id, net: result.annual.net, tax: result.annual.stateIncome + result.annual.statePayroll };
  })
  .sort((a, b) => b.net - a.net);
const maxNet = mapRows[0]?.net || 1;
page({
  path: "/map",
  title: "Take-Home Map by State ($80k, 2026) | LocalTakehome",
  description: "Rank states by estimated 2026 take-home pay on an $80,000 single salary. Local tax is not included.",
  active: "states",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "Take-home map", path: "/map" }])],
  main: `<div class="wrap page">
    <header class="mast"><p class="kicker">Map</p><h1>Where $80,000 goes furthest</h1>
    <p class="lede">Single filer, biweekly, no deductions, no city selected. Federal tax and FICA are almost the same everywhere. The spread is state income tax and the payroll premiums we model, such as California SDI or Washington’s paid leave.</p></header>
    <div class="map-list">${mapRows
      .map((row) => {
        const href = stateSlug[row.id] ? `/${stateSlug[row.id]}` : `/paycheck-calculator?state=${row.id}`;
        return `<div class="map-row"><a href="${href}">${esc(row.name)}</a><div class="map-track" aria-hidden="true"><span style="width:${((row.net / maxNet) * 100).toFixed(1)}%"></span></div><span>${usd(row.net)}</span></div>`;
      })
      .join("")}</div>
    <p class="meta" style="margin-top:14px">Net of tax only. A state with no wage tax still owes federal tax and FICA, so the bars do not start at zero. City taxes are excluded on purpose.</p>
  </div>`,
});

const localPageById = new Map(
  locations.filter((page) => page.localId).map((page) => [page.localId, page]),
);
const localCards = tables.local.jurisdictions
  .filter((row) => row.method !== "reference")
  .map((row) => {
    let rate = row.notes;
    if (row.method === "flat") rate = `Resident ${((row.residentRate || 0) * 100).toFixed(2)}% · nonresident ${(((row.nonresidentRate ?? row.residentRate) || 0) * 100).toFixed(2)}%. ${row.notes}`;
    const page = localPageById.get(row.id);
    const links = page
      ? `<a href="/${esc(page.slug)}">Open guide</a> · <a href="/paycheck-calculator?state=${esc(row.state)}&local=${esc(row.id)}">Calculator</a>`
      : `<a href="/paycheck-calculator?state=${esc(row.state)}&local=${esc(row.id)}">Open in the calculator</a>`;
    return `<article class="card"><h3>${esc(row.name)}</h3><p class="meta">${esc(row.confidence)} · ${esc(row.sourceLabel)}</p><p>${esc(rate)}</p><p>${links}</p></article>`;
  })
  .join("");

page({
  path: "/local-taxes",
  title: "Local Income Taxes on a Paycheck (2026) | LocalTakehome",
  description: "Which city and county wage taxes LocalTakehome models versus the custom percent escape hatch. Links to city guides when they exist.",
  active: "states",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "Local taxes", path: "/local-taxes" }])],
  main: `<div class="wrap page">
    <header class="mast"><p class="kicker">Local</p><h1>City and county taxes</h1>
    <p class="lede">True take-home pay for where you actually live means local tax only when it belongs on the stub. A local line is applied only when you select that place or type a custom percent. The named list is short on purpose.</p></header>
    <section class="prose">
      <h2>What is modeled</h2>
      <p>The cards below are the jurisdictions in <code>data/local-2026.json</code> with a real method (brackets, flat, surcharge, or layered thresholds). NYC resident brackets apply only when NYC is selected and you live there — working in NYC while living in New Jersey leaves city resident tax off. Yonkers has resident and nonresident treatments. Other named cities use published or estimated resident/nonresident rates as labeled. Read the <a href="/methodology">methodology</a> for exclusions and confidence notes.</p>
    </section>
    <div class="cards">${localCards}</div>
    <section class="prose" style="margin-top:28px">
      <h2>Use a custom percent</h2>
      <p>Pennsylvania has thousands of earned-income tax rates. Ohio has hundreds of cities. Indiana has a local rate in every county, and only Marion County is named. Maryland has a rate in every county; Montgomery County and Baltimore City are named. For the rest, enter the percent under Local details — it replaces a named city and applies to gross wages. The District of Columbia is the income tax itself, not an extra city layer on this list.</p>
      <p>Adding a city later is a record in <code>data/local-2026.json</code> plus, if you want a page, an object in <code>src/content/locations.mjs</code>. See also <a href="/methodology#corrections">See a wrong rate?</a></p>
    </section>
  </div>`,
});

for (const loc of locations) {
  const count = words(loc);
  if (loc.copyQuality === "launch" && count < 150) console.warn(`Short launch copy (${count} words): ${loc.slug}`);
  if (count < 90) console.warn(`Thin generated copy (${count} words): ${loc.slug}`);
  const preset = {
    state: loc.state,
    grossAnnual: 85000,
    ...(loc.localId ? { localId: loc.localId, livesInPlace: true } : {}),
  };
  const stateName = stateRecord(loc.state)?.name || loc.state;
  const kicker = loc.localId
    ? `${stateName} · True take-home pay for where you actually live`
    : stateName;
  page({
    path: `/${loc.slug}`,
    title: loc.title.includes("| LocalTakehome") ? loc.title : `${loc.title} | LocalTakehome`,
    description: loc.description,
    active: "states",
    pageKind: "calculator",
    schemas: [
      appLd(loc.h1, `/${loc.slug}`),
      faqLd(loc.faqs),
      locationCrumbs(loc),
    ],
    main: `<div class="wrap page">
      <header class="mast"><p class="kicker">${esc(kicker)}</p><h1>${esc(loc.h1)}</h1>
      ${loc.paragraphs.map((p) => `<p class="lede">${esc(p)}</p>`).join("")}</header>
      <h2>Example take-home</h2>
      ${exampleTable(loc)}
      <div style="margin-top:22px">${calcMount(preset)}</div>
      <div class="below">
        ${whatThisPageIncludes(loc)}
        ${localTaxExplainer(loc)}
        ${whatIsNotIncluded(loc)}
        ${faqHtml(loc.faqs)}
        ${nearbyLinks(loc)}
        ${sourcesHtml(loc)}
        <p class="prose"><a href="/methodology#corrections">See a rate that looks wrong?</a> The sources and the gaps are public.</p>
      </div>
    </div>`,
  });
}

const fixtures = [
  ["$60k single, Texas, biweekly", { grossAnnual: 60000, state: "TX" }],
  ["$85k single, California, biweekly", { grossAnnual: 85000, state: "CA" }],
  ["$85k single, NYC resident, biweekly", { grossAnnual: 85000, state: "NY", localId: "nyc" }],
  ["$75k single, Philadelphia resident", { grossAnnual: 75000, state: "PA", localId: "philadelphia" }],
  ["$20/hr, 40 hours, Florida", { payType: "hourly", hourlyRate: 20, hoursPerWeek: 40, weeksPerYear: 52, state: "FL" }],
  ["$120k single, Texas, 10% 401(k)", { grossAnnual: 120000, state: "TX", deductions: { traditional401k: { mode: "percent", value: 10 } } }],
  ["$200k single, California", { grossAnnual: 200000, state: "CA" }],
];
const fixtureRows = fixtures
  .map(([label, input]) => {
    const result = calculateTakeHome({ frequency: "biweekly", filingStatus: "single", employment: "w2", livesInPlace: true, ...input }, tables);
    return `<tr><th>${esc(label)}</th><td class="num">${usd(result.annual.gross)}</td><td class="num">${usd(result.annual.federalIncome)}</td><td class="num">${usd(result.annual.socialSecurity + result.annual.medicare + result.annual.additionalMedicare)}</td><td class="num">${usd(result.annual.stateIncome)}</td><td class="num">${usd(result.annual.local)}</td><td class="num">${usd(result.annual.net)}</td></tr>`;
  })
  .join("");
const bonus = compareBonus({ grossAnnual: 70000, bonusAnnual: 5000, state: "NY", filingStatus: "single", frequency: "biweekly" }, tables);

const estimated = tables.states.states.filter((s) => s.confidence === "estimated").map((s) => s.name).join(", ");
const publishedPayroll = tables.payroll.programs.map((p) => p.name).join(", ");

page({
  path: "/methodology",
  title: "Methodology — 2026 Tax Engine | LocalTakehome",
  description: "How LocalTakehome estimates a 2026 paycheck: federal method, FICA, state and local approach, exclusions, and sources.",
  active: "method",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "Methodology", path: "/methodology" }])],
  main: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">How it works</p><h1>Methodology</h1>
    <p class="lede">LocalTakehome is an annualized educational estimate for tax year 2026. Last verified ${VERIFIED}. It is not Pub 15-T payroll software, not a resident return, and not a promise about your next deposit.</p></header>
    <h2>Annualize, then split</h2>
    <p>The engine turns salary, or hourly pay times hours times weeks, into a year. It computes each tax on that year, rounds to the cent, and divides by 52, 26, 24, or 12. The stub’s year column is the paycheck times the number of checks, so the columns add. A few cents can separate that column from the unsplit annual total. Extra withholding is a per-check amount and is not run through the brackets.</p>
    <h2>Federal income tax</h2>
    <p><strong>Method:</strong> annualized bracket withholding estimate using Rev. Proc. 2025-32 schedules — <em>not</em> Publication 15-T wage-bracket or percentage-method payroll tables. Employers may still use Pub 15-T; this product does not.</p>
    <p>Wages after pre-tax deductions that reduce federal income tax, plus W-4 Step 4(a) other income, minus the 2026 standard deduction and Step 4(b) deductions. Tax comes from the Rev. Proc. 2025-32 schedules. Step 3 is a dollar credit. If the Step 2 checkbox is on, the estimate uses half the standard deduction and bracket thresholds at half width. That is an approximation of the checkbox schedule, not the IRS Tax Withholding Estimator’s two-earners worksheet.</p>
    <p>Standard deduction: single and married filing separately $16,100; married filing jointly $32,200; head of household $24,150. Single brackets: 10% to $12,400; 12% to $50,400; 22% to $105,700; 24% to $201,775; 32% to $256,225; 35% to $640,600; 37% above that.</p>
    <h2>FICA</h2>
    <p>Social Security is 6.2% of wages up to $184,500 ($11,439). Medicare is 1.45% with no cap. Additional Medicare is 0.9% on wages <em>in excess of</em> $200,000 single or head of household, $250,000 married filing jointly, and $125,000 married filing separately. At exactly the threshold, Additional Medicare is $0; it starts on the next dollar. Employers must start withholding Additional Medicare at $200,000 of wages regardless of filing status; this estimate uses the return thresholds and labels the line accordingly.</p>
    <h2>401(k) versus the FICA base</h2>
    <p>Traditional 401(k), 403(b), and TSP deferrals reduce federal (and most state) taxable wages. They do <strong>not</strong> reduce Social Security or Medicare wages. HSA contributions and Section 125 health, dental, vision, and commuter amounts reduce both income-tax and FICA wages in this model. The 2026 elective deferral warning level is $24,500. HSA warnings use $4,400 self-only and $8,750 family. Catch-up contributions are not added for you.</p>
    <h2>State income tax</h2>
    <p>All 50 states and the District of Columbia live in <code>data/states-2026.json</code>. The main compilation is the Tax Foundation table of rates and brackets as of January 1, 2026, plus state-specific notes in that file. Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, and Wyoming have no wage tax. Washington has no wage tax; its capital-gains excise tax is not applied to a paycheck. Head of household uses single brackets and the single deduction except where a page notes otherwise. Married filing separately uses the single schedule. When work state and resident state differ, the estimate taxes the primary resident state only and warns that the split is simplified — it does not invent reciprocity credits or a second return.</p>
    <p>States marked estimated, because a phaseout, a conformity question, or a federal-tax deduction is not fully computed: ${esc(estimated)}. Alabama and Missouri lines run high because a deduction for federal tax is omitted. Arizona, Maine, and South Carolina may use a smaller standard deduction than a state that has conformed to the higher federal amount.</p>
    <h2>State payroll</h2>
    <p>Included for employees: ${esc(publishedPayroll)}. Contractor mode skips these because coverage is often optional. Not yet modeled: New Jersey TDI and FLI, Rhode Island TDI, Hawaii TDI, Massachusetts PFML, Oregon PFMLI, and several newer paid-leave programs. If a program were listed without a sourced employee rate, the engine warns and does not invent a silent $0 line. The same rule applies to unsourced locals: they are omitted with an explicit warning, never shown as a quiet $0. Known gaps (NJ TDI/FLI, RI TDI, HI TDI, MA PFML, OR PFMLI, ME/MN/DE paid leave, DC employer-paid PFL) warn when that state is selected. Portland Metro SHS thresholds for 2026 are inflation-indexed to $128,000 single / $205,000 joint; Multnomah Preschool for All thresholds remain $125,000 / $200,000 and $250,000 / $400,000. The methodology would rather omit a rate than invent one. See TAX_DATA_SOURCES.md.</p>
    <h2>Local tax</h2>
    <p>Named places apply only when selected (or replaced by a custom percent on gross wages): New York City resident brackets (off when you only work there / live-here unchecked), Yonkers resident surcharge and nonresident earnings tax, Philadelphia resident 3.74% and nonresident 3.43%, Pittsburgh as a modeled 3% / 1% earned-income tax, Detroit 2.4% / 1.2%, Columbus and Cleveland at 2.5%, Montgomery County and Baltimore City at 3.20%, Marion County at 2.02% (confirm the current Indiana chart), and Portland / Multnomah threshold taxes (resident only). New York City is never applied to the rest of New York. Most U.S. cities and counties are not in the named list — use the custom percent.</p>
    <h2 id="exclusions">Exclusions</h2>
    <p>This estimate does not include: tax credits (beyond the W-4 Step 3 dollar credit you enter), itemized deductions, property tax, sales tax, unsupported local jurisdictions, garnishments unless you enter them as a deduction, QBI for contractors, full multi-state returns or credits, Ohio city-to-city credits, New York benefit recapture above the high brackets, and employer payroll tables that differ from this annualized method. It is not an employer stub, a filed return, or Schedule C / 1040-ES software.</p>
    <h2 id="tests">Fixture results</h2>
    <p>These are the engine’s own outputs for the published scenarios. Tests in <code>tests/engine.test.mjs</code> lock the same ranges.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Scenario</th><th class="num">Gross</th><th class="num">Federal</th><th class="num">FICA</th><th class="num">State</th><th class="num">Local</th><th class="num">Net</th></tr></thead>
      <tbody>${fixtureRows}</tbody>
    </table></div>
    <p>A $5,000 bonus on a $70,000 New York salary changes federal tax by about ${usd(bonus.aggregate.federal)} under the aggregate method. Flat 22% supplemental federal withholding is ${usd(bonus.supplementalFederal)}. New York City is not included unless selected. The $200,000 California case sits on the Additional Medicare threshold, so that 0.9% line is $0; it starts on the next dollar.</p>
    <h2>Contractor mode</h2>
    <p>Self-employment tax is 12.4% plus 2.9% on 92.35% of profit after expenses, with Social Security capped at the wage base, plus 0.9% Additional Medicare on that base above the filing-status threshold. Half of the 12.4% and 2.9% portions is an above-the-line deduction. The qualified business income deduction is not included.</p>
    <h2 id="sources">Sources</h2>
    <ul>
      <li><a href="https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill">IRS, tax year 2026 inflation adjustments (Rev. Proc. 2025-32)</a></li>
      <li><a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf">Rev. Proc. 2025-32 (PDF)</a></li>
      <li><a href="https://www.ssa.gov/oact/cola/cbb.html">SSA, contribution and benefit base, $184,500 for 2026</a></li>
      <li><a href="https://www.irs.gov/publications/p15">IRS Publication 15</a></li>
      <li><a href="https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/">Tax Foundation, state rates and brackets, 2026</a></li>
      <li><a href="https://edd.ca.gov/en/disability/Contribution_Rates_and_Benefit_Amounts/">California EDD, SDI rate</a></li>
      <li><a href="https://www.phila.gov/2025-06-18-philly-extends-deadline-for-relief-program-announces-tax-cuts/">Philadelphia wage tax, rates effective July 1, 2025</a></li>
      <li><a href="https://www.tax.ny.gov/pit/file/nyc_rates.htm">New York City resident tax rates</a></li>
      <li><a href="https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/facts/withholding-tax-facts-2026.pdf">Maryland Comptroller, withholding facts 2026</a></li>
    </ul>
    <p>Each JSON file under <code>/data</code> repeats its own source URLs and a last-verified date of ${VERIFIED}.</p>
    <h2 id="corrections">See a wrong rate?</h2>
    <p>If a rate on your stub disagrees with this estimate, the useful report is the jurisdiction, the tax year, the official URL, and the figure you expected. There is no support inbox. The data files are the correction path: rates live in JSON so a 2027 update does not require a new formula. Prefer fixing copy that overclaims the engine over inventing a rate the engine does not use.</p>
    <h2>Changelog</h2>
    <ul>
      <li>${VERIFIED} — First 2026 file. Federal method documented as annualized bracket withholding estimate (Rev. Proc. 2025-32), not Pub 15-T. Social Security wage base $184,500. Launch locals listed above. State payroll limited to programs with a published employee rate in hand. Trust pages and FAQ answers aligned to engine behavior.</li>
    </ul>
  </div>`,
});

page({
  path: "/privacy",
  title: "Privacy Policy | LocalTakehome",
  description: "LocalTakehome does not require an account. Paycheck inputs stay in your browser. localStorage keys listed honestly.",
  active: "",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }])],
  main: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">Privacy</p><h1>Your salary stays here</h1></header>
    <p>Paycheck inputs stay in your browser. The calculator does not send income, filing status, deductions, or location to a server to compute a result. Rate tables are static files. The arithmetic runs in the page.</p>
    <p>There is no account and no email gate. The calculator does not set a tracking cookie for ads or analytics on calculation inputs.</p>
    <h2>What this browser may store</h2>
    <ul>
      <li><code>lth-scenarios</code> — named scenarios you save from the calculator. Optional; nothing is saved until you click Save.</li>
    </ul>
    <p>If an older visit stored <code>tth-scenarios</code>, the page may migrate it once into the <code>lth-*</code> keys and then keep using the new name. Clearing site data for localtakehome.com removes it.</p>
    <p>A shared link puts the inputs in the URL. That URL is yours to copy or not.</p>
    <h2>Ads, analytics, and fonts</h2>
    <p>Partner cards and one advertisement slot sit below the estimate, clearly labeled. They never appear above net pay. They do not receive your salary, W-4 fields, or other calculation inputs from LocalTakehome — those stay in this browser. There is no analytics package wired to those inputs. Fonts are self-hosted.</p>
    <p>Honest status: Google AdSense may be connected for site verification and labeled advertisement slots below the estimate. The reserved Advertisement box stays below net pay. LocalTakehome does not enable Auto ads in the sticky netbar or above net.</p>
    <p>When a third-party ad network is enabled, that network may set cookies or use device identifiers on its own systems to serve or measure ads. LocalTakehome still does not send calculation inputs to those networks. Partner and affiliate links are labeled Partner; after you click, the destination site may track that visit under its own privacy policy.</p>
    <p>Industry opt-outs (plain language): you can review ad settings at <a href="https://adssettings.google.com/" rel="noopener noreferrer">Google Ad Settings</a> and the <a href="https://optout.networkadvertising.org/" rel="noopener noreferrer">Network Advertising Initiative opt-out</a>. Those tools are run by the industry, not by LocalTakehome.</p>
    <p>Authorized digital sellers for this site are listed at <a href="/ads.txt"><code>/ads.txt</code></a> (Google AdSense publisher <code>pub-4059575347806121</code>).</p>
    <p>If the site is hosted with ordinary server logs, those logs can include the address of a page, including a query string if you shared a link that contains pay. Don’t put a link with your salary into a channel you don’t trust.</p>
  </div>`,
});

page({
  path: "/terms",
  title: "Terms of Use | LocalTakehome",
  description: "LocalTakehome is an educational estimate. It is not tax, payroll, or financial advice.",
  active: "",
  schemas: [crumbs([{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }])],
  main: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">Terms</p><h1>Terms of use</h1></header>
    <p>LocalTakehome provides educational estimates of U.S. take-home pay for tax year 2026. Estimate for tax year 2026. Actual paychecks depend on your W-4, benefits, employer payroll system, and local rules. Not tax, payroll, or financial advice. It is not legal advice. It is not a substitute for your employer’s payroll system, a CPA, an enrolled agent, or the IRS Tax Withholding Estimator.</p>
    <p>Results can be wrong. Brackets change, localities reset rates, and this model skips credits, itemized deductions, multi-state credits, property tax, garnishments you did not enter, and many local jurisdictions. Federal income tax here is an annualized bracket withholding estimate (Rev. Proc. 2025-32), not a Pub 15-T table lookup. You are responsible for what you do with a number from this site, including an offer you accept or a form you file.</p>
    <p>The site is provided as-is, without a warranty of accuracy or fitness for a particular purpose. To the extent the law allows, liability for use of the estimates is disclaimed. There is no account to terminate. These terms apply when you use the pages.</p>
    <p>Do not present a LocalTakehome result as your exact paycheck, as IRS certified, or as 100% accurate. The site does not claim AI-powered accuracy.</p>
    <h2>Advertisements and partner links</h2>
    <p>Pages may show labeled advertisement slots and Partner cards below the estimate (never above net pay). Partner links may be affiliate links: LocalTakehome may earn a commission if you click through and buy or sign up. Estimates are not changed by partners or ads. Google AdSense may serve ads in the labeled Advertisement slot; connecting a network does not alter the calculator math.</p>
  </div>`,
});

page({
  path: "/about",
  title: "About | LocalTakehome",
  description: "Why LocalTakehome exists: true take-home pay for where you actually live, with local tax named and math on your device.",
  active: "",
  schemas: [orgLd, crumbs([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])],
  main: `<div class="wrap page prose">
    <header class="mast"><p class="kicker">About</p><h1>LocalTakehome</h1>
    <p class="lede">True take-home pay for where you actually live.</p></header>
    <p>LocalTakehome is a private 2026 U.S. paycheck calculator. It names federal income tax, FICA, state tax, and local tax when you select a place — then shows the deposit. The math stays on your device.</p>
    <p>Most paycheck tools bury the city or invent a flat local rate. The local-tax gap is the problem this product is built around: New York City is not “New York,” Philadelphia is not “Pennsylvania,” and most counties are not in any national calculator’s named list. LocalTakehome models a short list of published places and otherwise asks you for a custom percent rather than guessing.</p>
    <p>There is no fake team page, no CPA badge, no invented user count, and no chat window pretending to be an advisor. Hairline rules, a large net, and a source under the line. Educational estimate only.</p>
    <h2 id="corrections">Corrections</h2>
    <p>Rate corrections belong on the <a href="/methodology#corrections">methodology page</a>, next to the sources. If you are adding a city for yourself, the local JSON file is the template: an id, a state, a method, a rate, a source URL, and a last-verified date.</p>
    <h2 id="contact">Contact</h2>
    <p>Email <a href="mailto:support@localtakehome.com">support@localtakehome.com</a> for product, privacy, or rate/source corrections. Product and privacy notes live on <a href="/privacy">Privacy</a> and <a href="/terms">Terms</a>.</p>
    <h2 id="embed">Embed</h2>
    <p>A page can show the calculator without the site chrome by adding <code>?embed=1</code> to any calculator URL. The math is the same. The frame still runs in the visitor’s browser. Example:</p>
    <pre><code>&lt;iframe title="LocalTakehome calculator" src="https://localtakehome.com/paycheck-calculator?state=TX&amp;embed=1" width="100%" height="900" style="border:0"&gt;&lt;/iframe&gt;</code></pre>
    <p>Do not wrap the frame in an email gate. The estimate is the product.</p>
  </div>`,
});

const stateOptions = [...tables.states.states]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((state) => `<option value="${esc(state.id)}">${esc(state.name)}</option>`)
  .join("");

const notFound = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — LocalTakehome</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="stylesheet" href="/css/site.css?v=20261004a">
  <script>try{localStorage.removeItem("lth-theme");localStorage.removeItem("tth-theme");}catch(e){}</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4059575347806121"
     crossorigin="anonymous"></script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  ${nav("")}
  <main id="main"><div class="wrap page">
    <header class="mast"><p class="kicker">404</p><h1>That page is not on the stub.</h1>
    <p class="lede">The link may be old. The calculator is still here. This small form opens the full estimate with your state selected. With JavaScript off, it still sends you to the calculator.</p></header>
    <form class="card" action="/paycheck-calculator" method="get">
      <label class="field"><span>Annual salary</span><span class="control"><span class="prefix">$</span><input name="pay" inputmode="decimal" value="85000"></span></label>
      <label class="field"><span>State</span><select class="bare" name="state">${stateOptions}</select></label>
      <button class="solid" type="submit">Estimate on the calculator</button>
    </form>
    <p style="margin-top:16px"><a href="/">Home</a> · <a href="/states">States</a> · <a href="/methodology">How it works</a></p>
  </div></main>
  ${footer()}
</body>
</html>`;
writeFileSync(join(dist, "404.html"), notFound);

const paths = [
  "/",
  "/paycheck-calculator",
  "/compare",
  "/bonus-calculator",
  "/hourly-paycheck-calculator",
  "/overtime-calculator",
  "/raise-calculator",
  "/401k-calculator",
  "/employer-cost-calculator",
  "/w4-calculator",
  "/contractor-vs-w2",
  "/states",
  "/map",
  "/local-taxes",
  "/methodology",
  "/privacy",
  "/terms",
  "/about",
  ...locations.map((loc) => `/${loc.slug}`),
];
writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
  .map((path) => `  <url><loc>${SITE}${path === "/" ? "/" : path}</loc></url>`)
  .join("\n")}\n</urlset>\n`);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nAllow: /ads.txt\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${paths.length} routes to ${dist}`);
