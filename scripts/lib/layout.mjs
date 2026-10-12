/**
 * The page frame every page shares: <head>, header, footer.
 *
 * Rules that must hold on every page (see AGENTS.md):
 *  - the Google Analytics tag is the first thing in <head>, exactly once, in
 *    its privacy-safe form (no query string is ever sent);
 *  - the AdSense script is in <head>; there are no fixed ad units;
 *  - support@localtakehome.com is the only email, wrapped in email_off markers.
 */
import { esc } from "../../src/js/format.mjs";

export const SITE = {
  name: "LocalTakehome",
  origin: "https://localtakehome.com",
  slogan: "True take-home pay for where you actually live.",
  email: "support@localtakehome.com",
  year: 2026,
};

export const EMAIL_LINK = `<!--email_off--><a href="mailto:${SITE.email}">${SITE.email}</a><!--/email_off-->`;

const GA_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9BK9NYDGC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-S9BK9NYDGC', { page_location: location.origin + location.pathname, page_referrer: document.referrer.split('?')[0] });
</script>`;

const ADSENSE_TAG = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4059575347806121"
     crossorigin="anonymous"></script>`;

export const NAV = [
  { href: "/", label: "Calculator", match: ["/", "/paycheck-calculator/"] },
  { href: "/compare/", label: "Compare" },
  { href: "/states/", label: "States" },
  { href: "/guides/", label: "Guides" },
  { href: "/methodology/", label: "How it works" },
];

export const TOOL_LINKS = [
  { href: "/hourly-paycheck-calculator/", label: "Hourly pay", blurb: "Hours, overtime and shift rates" },
  { href: "/salary-to-hourly/", label: "Salary to hourly", blurb: "Convert pay between hour, month and year" },
  { href: "/take-home-to-salary/", label: "Salary needed", blurb: "Start from the take-home pay you want" },
  { href: "/compare/", label: "Compare two offers", blurb: "Two salaries, two places, side by side" },
  { href: "/raise-calculator/", label: "Raise", blurb: "How much of a raise you keep" },
  { href: "/bonus-calculator/", label: "Bonus", blurb: "What is left after tax" },
  { href: "/overtime-calculator/", label: "Overtime", blurb: "With the new overtime deduction" },
  { href: "/no-tax-on-tips-calculator/", label: "Tips", blurb: "With the new tips deduction" },
  { href: "/401k-calculator/", label: "401(k)", blurb: "What saving costs your paycheck" },
  { href: "/w4-calculator/", label: "W-4", blurb: "How each W-4 step moves your pay" },
  { href: "/contractor-vs-w2/", label: "Contractor or employee", blurb: "1099 against W-2" },
  { href: "/employer-cost-calculator/", label: "Employer cost", blurb: "What a salary costs to pay" },
  { href: "/map/", label: "Take-home pay by state", blurb: "All states ranked for your salary" },
  { href: "/local-taxes/", label: "City and county taxes", blurb: "Every local income tax we cover" },
];

function jsonLd(objects) {
  return objects
    .filter(Boolean)
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`)
    .join("\n  ");
}

export function breadcrumbs(trail) {
  if (!trail?.length) return "";
  const items = [{ label: "Home", href: "/" }, ...trail];
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map((item, index) => (index === items.length - 1 || !item.href ? `<li aria-current="page">${esc(item.label)}</li>` : `<li><a href="${item.href}">${esc(item.label)}</a></li>`))
    .join("")}</ol></nav>`;
}

function breadcrumbLd(trail) {
  if (!trail?.length) return null;
  const items = [{ label: "Home", href: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.label, ...(item.href ? { item: `${SITE.origin}${item.href}` } : {}) })),
  };
}

export function faqLd(faqs) {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })),
  };
}

export function faqHTML(faqs, title = "Questions") {
  if (!faqs?.length) return "";
  return `<section class="faq"><h2>${esc(title)}</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("")}</section>`;
}

/**
 * @param {object} page
 * @param {string} page.path        "/texas-paycheck-calculator/"
 * @param {string} page.title       full <title>
 * @param {string} page.description meta description
 * @param {string} page.body        HTML inside <main>
 * @param {string} [page.kind]      body data-page: calculator | tool | page
 * @param {Array}  [page.trail]     breadcrumb items after Home
 * @param {Array}  [page.ld]        extra JSON-LD objects
 * @param {boolean}[page.noindex]
 * @param {object} assets           { css, js, preload[] } hashed paths
 */
export function renderPage(page, assets) {
  const url = `${SITE.origin}${page.path === "/404.html" ? "/" : page.path}`;
  const current = (item) => (item.match || [item.href]).includes(page.path) || (item.href !== "/" && page.section === item.href);
  const nav = NAV.map((item) => `<a href="${item.href}"${current(item) ? ' aria-current="page"' : ""}>${item.label}</a>`).join("");
  const tools = TOOL_LINKS.map((item) => `<a href="${item.href}"${item.href === page.path ? ' aria-current="page"' : ""}><strong>${item.label}</strong><span>${item.blurb}</span></a>`).join("");
  const ld = jsonLd([
    page.path === "/" ? { "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.origin, logo: `${SITE.origin}/assets/icon-512.png`, description: "A free, private take-home pay calculator for U.S. federal, state and local taxes." } : null,
    page.path === "/" ? { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: `${SITE.origin}/` } : null,
    page.kind === "calculator" || page.kind === "tool"
      ? { "@context": "https://schema.org", "@type": "WebApplication", name: page.appName || page.h1 || SITE.name, applicationCategory: "FinanceApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, url, description: page.description }
      : null,
    breadcrumbLd(page.trail),
    ...(page.ld || []),
  ]);
  const preload = (assets.preload || []).map((href) => `<link rel="modulepreload" href="${href}">`).join("\n  ");

  return `<!doctype html>
<html lang="en">
<head>
${GA_TAG}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="${page.noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}">
  <meta name="theme-color" content="#F4EFE6">
  <meta property="og:title" content="${esc(page.ogTitle || page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:image" content="${SITE.origin}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/fonts/source-serif-4-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/plex-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${assets.css}">
  ${preload}
  ${ADSENSE_TAG}
  ${ld}
</head>
<body data-page="${page.kind || "page"}">
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="LocalTakehome home">
        <img class="brand-lockup" src="/assets/localtakehome-lockup-360.png" width="360" height="236" alt="LocalTakehome">
        <span class="tagline">True take-home pay for where you actually <span class="tagline-live">live.</span></span>
      </a>
      <button class="menu-btn" type="button" data-menu aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Primary">
        ${nav}
        <details class="tools-menu">
          <summary>All tools</summary>
          <div class="tools-panel">${tools}</div>
        </details>
      </nav>
    </div>
  </header>
  <main id="main">
${page.trail?.length ? `<div class="wrap">${breadcrumbs(page.trail)}</div>` : ""}
${page.body}
  <p class="embed-credit"><a href="${SITE.origin}${page.path === "/404.html" ? "/" : page.path}" target="_blank" rel="noopener">Calculator by LocalTakehome</a></p>
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-cols">
        <div><h2>Calculators</h2><a href="/">Paycheck calculator</a><a href="/hourly-paycheck-calculator/">Hourly pay</a><a href="/salary-to-hourly/">Salary to hourly</a><a href="/take-home-to-salary/">Salary needed</a><a href="/compare/">Compare two offers</a><a href="/raise-calculator/">Raise</a><a href="/bonus-calculator/">Bonus</a></div>
        <div><h2>More tools</h2><a href="/overtime-calculator/">Overtime</a><a href="/no-tax-on-tips-calculator/">Tips</a><a href="/401k-calculator/">401(k)</a><a href="/w4-calculator/">W-4</a><a href="/contractor-vs-w2/">Contractor or employee</a><a href="/employer-cost-calculator/">Employer cost</a><a href="/embed/">Add it to your site</a></div>
        <div><h2>By place</h2><a href="/states/">All 50 states and D.C.</a><a href="/cities/">Cities</a><a href="/local-taxes/">City and county taxes</a><a href="/map/">Take-home pay by state</a><a href="/salary/">Salaries after tax</a><a href="/hourly/">Hourly wages after tax</a></div>
        <div><h2>About</h2><a href="/guides/">Guides</a><a href="/methodology/">How it works</a><a href="/methodology/#sources">Sources</a><a href="/updates/">Updates and corrections</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div>
      </div>
      <p class="footer-note">Estimates for tax year 2026, last checked against official sources on ${assets.verifiedLong}. Your real paycheck depends on your W-4, your benefits and your employer's payroll system. LocalTakehome is an independent website. It is not tax, payroll or financial advice, and it is not connected to the IRS or any state.</p>
      <p class="footer-note">Calculations run in your browser. Nothing you type is uploaded.</p>
    </div>
  </footer>
  <script type="module" src="${assets.js}"></script>
</body>
</html>
`;
}
