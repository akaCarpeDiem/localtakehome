#!/usr/bin/env node
/**
 * Checks a deployed copy of the site (a preview or production).
 *
 *   node scripts/check-live.mjs https://preview.localtakehome.pages.dev
 *
 * Read-only: it only fetches pages. Prints one line per check and exits 1 if
 * any check fails.
 */
const base = (process.argv[2] || "https://localtakehome.com").replace(/\/$/, "");
let failed = 0;

function report(ok, label, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

async function get(path, options = {}) {
  const response = await fetch(base + path, { redirect: "manual", ...options });
  const text = options.head ? "" : await response.text();
  return { status: response.status, text, headers: response.headers };
}

const pages = [
  "/",
  "/paycheck-calculator/",
  "/hourly-paycheck-calculator/",
  "/compare/",
  "/map/",
  "/states/",
  "/cities/",
  "/local-taxes/",
  "/california-paycheck-calculator/",
  "/new-york-city-paycheck-calculator/",
  "/salary/60000/",
  "/salary/60000/texas/",
  "/hourly/25/",
  "/guides/",
  "/guides/no-tax-on-overtime/",
  "/methodology/",
  "/updates/",
  "/embed/",
  "/about/",
  "/privacy/",
];

console.log(`Checking ${base}`);
let home = "";
for (const path of pages) {
  const { status, text } = await get(path);
  const tagFirst = text.includes('<head>\n<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9BK9NYDGC"></script>');
  const safeTag = text.includes("page_location: location.origin + location.pathname");
  const adsense = text.split("adsbygoogle.js?client=ca-pub-4059575347806121").length === 2;
  const figures = !/\b(NaN|undefined)\b/.test(text.replace(/<script[\s\S]*?<\/script>/g, ""));
  report(status === 200 && tagFirst && safeTag && adsense && figures, path, `HTTP ${status}${tagFirst && safeTag ? "" : ", analytics tag missing or altered"}${adsense ? "" : ", AdSense script missing or duplicated"}${figures ? "" : ", a figure did not compute"}`);
  if (path === "/") home = text;
}

const css = home.match(/href="(\/css\/site\.[a-z0-9]+\.css)"/)?.[1];
const js = home.match(/src="(\/js\/[a-z0-9]+\/site\.mjs)"/)?.[1];
report(Boolean(css && js), "home page links the stylesheet and script", `${css || "no css"} ${js || "no js"}`);
if (css) report((await get(css)).status === 200, "stylesheet loads");
if (js) {
  const folder = js.replace(/site\.mjs$/, "");
  for (const name of ["site.mjs", "engine.mjs", "calculator.mjs", "calc-form.mjs", "tools.mjs", "view.mjs", "data.mjs", "tables.mjs", "format.mjs"]) {
    const { status, headers } = await get(folder + name);
    report(status === 200 && /javascript/.test(headers.get("content-type") || ""), `script ${name}`, `HTTP ${status}, ${headers.get("content-type")}`);
  }
}

const ads = await get("/ads.txt");
report(ads.status === 200 && ads.text.includes("google.com, pub-4059575347806121, DIRECT, f08c47fec0942fa0"), "ads.txt");
const sitemap = await get("/sitemap.xml");
const count = (sitemap.text.match(/<loc>/g) || []).length;
report(sitemap.status === 200 && count > 800, "sitemap.xml", `${count} addresses`);
report((await get("/robots.txt")).status === 200, "robots.txt");
report((await get("/og.png")).status === 200, "sharing image");
report((await get("/fonts/source-serif-4-600.woff2")).status === 200, "font file");
const missing = await get("/this-page-does-not-exist/");
report(missing.status === 404 && missing.text.includes("That page is not here"), "missing page returns the 404 page", `HTTP ${missing.status}`);
const hidden = await get("/.publish/anything");
report(hidden.status === 404, "/.publish/ is blocked by the middleware", `HTTP ${hidden.status}`);
const shared = await get("/?pay=75000&state=PA&local=philadelphia");
report(shared.status === 200, "a shared link opens", `HTTP ${shared.status}`);

console.log(failed ? `${failed} check(s) FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
