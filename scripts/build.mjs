#!/usr/bin/env node
/**
 * Builds the whole site into build/out from src/.
 *
 *   node scripts/build.mjs
 *
 * Every figure on every page is computed here by the same engine the browser
 * runs (src/js/engine.mjs) from the rate files in src/data. Nothing is typed
 * in by hand, so a rate change in the data updates every page that shows it.
 * The output is deterministic: the same source always gives the same bytes.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertTaxDataIntegrity } from "../src/js/engine.mjs";
import { renderPage, SITE } from "./lib/layout.mjs";
import { makeContext } from "./lib/shared.mjs";
import { ROOT, loadTables } from "./lib/tables.mjs";
import { buildPages } from "./pages/index.mjs";

const OUT = join(ROOT, "build", "out");
const SRC = join(ROOT, "src");
const started = Date.now();

function hash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 10);
}

function write(path, content) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Drops fields the browser never reads, to keep the download small. */
function slim(value, drop) {
  if (Array.isArray(value)) return value.map((item) => slim(item, drop));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !drop.has(key)).map(([key, item]) => [key, slim(item, drop)]));
  return value;
}

/* 1. data */
const tables = loadTables();
const errors = assertTaxDataIntegrity(tables);
if (errors.length) {
  console.error(`build: the rate files failed their checks:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
const ctx = makeContext(tables);

/* 2. clean output, copy static files */
rmSync(join(ROOT, "build"), { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, "static"), OUT, { recursive: true });

/* 3. scripts: one folder named after the content, so browsers can cache it for good */
const browserTables = slim(tables, new Set(["notes", "changed", "localPossible", "sourcesOverview", "reciprocityNote", "jurisdictionId"]));
delete browserTables.states.method;
const scripts = { "tables.mjs": `export default ${JSON.stringify(browserTables)};\n` };
for (const name of readdirSync(join(SRC, "js")).sort()) scripts[name] = readFileSync(join(SRC, "js", name), "utf8");
const jsDir = `/js/${hash(Object.entries(scripts).map(([name, text]) => name + text).join("\n"))}`;
for (const [name, text] of Object.entries(scripts)) write(`${jsDir}/${name}`, text);

/* 4. styles */
const css = readFileSync(join(SRC, "css", "site.css"), "utf8");
if (/fraunces/i.test(css)) {
  console.error("build: Fraunces must not appear in the stylesheet (the display serif is Source Serif 4).");
  process.exit(1);
}
const cssPath = `/css/site.${hash(css)}.css`;
write(cssPath, css);

const common = ["site.mjs", "engine.mjs", "format.mjs", "view.mjs", "data.mjs", "tables.mjs"];
const preloadFor = {
  calculator: [...common, "calculator.mjs", "calc-form.mjs"],
  tool: [...common, "tools.mjs"],
  page: [],
};
const assetsFor = (kind) => ({ css: cssPath, js: `${jsDir}/site.mjs`, preload: (preloadFor[kind] || []).map((name) => `${jsDir}/${name}`), verifiedLong: ctx.verifiedLong });

/* 5. pages */
const pages = buildPages(ctx);
const seen = new Set();
for (const page of pages) {
  if (seen.has(page.path)) throw new Error(`build: two pages want ${page.path}`);
  seen.add(page.path);
  const html = renderPage(page, assetsFor(page.kind || "page"));
  write(page.path.endsWith("/") ? `${page.path}index.html` : page.path, html);
}

/* 6. sitemap */
const urls = pages
  .filter((page) => !page.noindex && page.path !== "/404.html")
  .map((page) => `  <url><loc>${SITE.origin}${page.path}</loc><lastmod>${ctx.verified}</lastmod></url>`)
  .join("\n");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

/* 7. checks on what was written */
const problems = [];
const GA_START = '<head>\n<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9BK9NYDGC"></script>';
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".html")) htmlFiles.push(full);
  }
})(OUT);
const exists = (href) => {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return true;
  const target = join(OUT, clean);
  return existsSync(clean.endsWith("/") ? join(target, "index.html") : target);
};
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.slice(OUT.length);
  if (!html.includes(GA_START)) problems.push(`${rel}: the Google Analytics tag is not the first thing in <head>`);
  if (html.split("googletagmanager.com/gtag/js").length !== 2) problems.push(`${rel}: the Google Analytics tag must appear exactly once`);
  if (!html.includes("page_location: location.origin + location.pathname, page_referrer: document.referrer.split('?')[0]")) problems.push(`${rel}: the Google Analytics tag is not the privacy-safe version`);
  if (html.split("adsbygoogle.js?client=ca-pub-4059575347806121").length !== 2) problems.push(`${rel}: the AdSense script must appear exactly once`);
  if (/<ins class="adsbygoogle"/.test(html)) problems.push(`${rel}: fixed ad units are not allowed`);
  if (/\b(NaN|undefined|Infinity)\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) problems.push(`${rel}: a figure did not compute (NaN or undefined in the page)`);
  for (const mail of html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) || []) if (mail !== SITE.email) problems.push(`${rel}: unexpected email address ${mail}`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!exists(match[1])) problems.push(`${rel}: broken link ${match[1]}`);
}
if (problems.length) {
  const unique = [...new Set(problems)];
  console.error(`build: ${unique.length} problem(s):\n  ${unique.slice(0, 60).join("\n  ")}`);
  // LTH_DRAFT=1 lets a half-finished site build while pages are being written. Never deploy a draft build.
  if (!process.env.LTH_DRAFT) process.exit(1);
}

/* 8. stage the Pages Function next to the output, as wrangler expects */
cpSync(join(ROOT, "functions"), join(ROOT, "build", "functions"), { recursive: true });
writeFileSync(join(ROOT, "build", "package.json"), '{"name":"lt-stage","private":true}\n');

console.log(`build ok: ${htmlFiles.length} pages, ${jsDir}, ${cssPath}, ${((Date.now() - started) / 1000).toFixed(1)}s`);
