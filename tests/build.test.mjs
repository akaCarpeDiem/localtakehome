/**
 * Builds the site and checks the result: nothing that was ever published may
 * disappear, the required tags are on every page, and the figures on the pages
 * are the engine's.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { calculateTakeHome } from "../src/js/engine.mjs";
import { loadTables } from "../scripts/lib/tables.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "build", "out");
const build = () => execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { cwd: root, encoding: "utf8" });

function digest(dir) {
  const hash = createHash("sha256");
  (function walk(folder) {
    for (const name of readdirSync(folder).sort()) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else hash.update(full.slice(dir.length)).update(readFileSync(full));
    }
  })(dir);
  return hash.digest("hex");
}

const usd0 = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const log = build();
const page = (path) => readFileSync(join(out, path, "index.html"), "utf8");

test("the build succeeds and is repeatable byte for byte", () => {
  assert.match(log, /build ok: \d+ pages/);
  const first = digest(out);
  build();
  assert.equal(digest(out), first);
});

test("every address the site has ever published still exists", () => {
  const paths = readFileSync(join(root, "tests", "fixtures", "legacy-paths.txt"), "utf8").trim().split("\n");
  assert.ok(paths.length >= 82);
  for (const path of paths) {
    const file = path.endsWith(".html") ? join(out, path) : join(out, path, "index.html");
    assert.ok(existsSync(file), `${path} is missing from the build`);
  }
});

test("required files are present", () => {
  for (const file of ["ads.txt", "robots.txt", "sitemap.xml", "_headers", "404.html", "favicon.png", "og.png", "site.webmanifest", "fonts/source-serif-4-600.woff2", "fonts/fraunces-600.woff2"]) {
    assert.ok(existsSync(join(out, file)), `${file} is missing`);
  }
  assert.match(readFileSync(join(out, "ads.txt"), "utf8"), /google\.com, pub-4059575347806121, DIRECT, f08c47fec0942fa0/);
  assert.ok(existsSync(join(root, "build", "functions", "_middleware.ts")));
});

test("every page starts <head> with the privacy-safe Google Analytics tag and carries the AdSense script once", () => {
  const files = [];
  (function walk(folder) {
    for (const name of readdirSync(folder)) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html")) files.push(full);
    }
  })(out);
  assert.ok(files.length > 800);
  for (const file of files) {
    const html = readFileSync(file, "utf8");
    assert.ok(html.includes('<head>\n<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9BK9NYDGC"></script>'), `${file}: analytics tag is not first in head`);
    assert.ok(html.includes("gtag('config', 'G-S9BK9NYDGC', { page_location: location.origin + location.pathname, page_referrer: document.referrer.split('?')[0] });"), `${file}: analytics tag is not the privacy-safe one`);
    assert.equal(html.split("adsbygoogle.js?client=ca-pub-4059575347806121").length, 2, `${file}: AdSense script count`);
    assert.ok(!html.includes('class="adsbygoogle"'), `${file}: fixed ad unit found`);
    assert.ok(html.includes('True take-home pay for where you actually <span class="tagline-live">live.</span>'), `${file}: slogan`);
  }
});

test("the stylesheet uses Source Serif 4 and never Fraunces", () => {
  const css = readdirSync(join(out, "css")).filter((name) => name.endsWith(".css"));
  assert.equal(css.length, 1);
  const text = readFileSync(join(out, "css", css[0]), "utf8");
  assert.match(text, /Source Serif 4/);
  assert.doesNotMatch(text, /fraunces/i);
});

test("support@localtakehome.com is the only email, wrapped so Cloudflare leaves it alone", () => {
  const html = page("contact");
  assert.ok(html.includes('<!--email_off--><a href="mailto:support@localtakehome.com">support@localtakehome.com</a><!--/email_off-->'));
});

test("figures printed on the pages are the engine's", () => {
  const tables = loadTables();
  const run = (input) => calculateTakeHome({ payType: "salary", frequency: "biweekly", filingStatus: "single", ...input }, tables);
  const ca = run({ grossAnnual: 85000, state: "CA" });
  assert.ok(page("california-paycheck-calculator").includes(usd0(ca.annual.net)), "California page shows the $85,000 take-home");
  const nyc = run({ grossAnnual: 60000, state: "NY", localId: "nyc" });
  assert.ok(page("new-york-city-paycheck-calculator").includes(usd0(nyc.annual.net)), "New York City page shows the $60,000 take-home");
  const oh = run({ grossAnnual: 60000, state: "OH" });
  assert.ok(page("salary/60000/ohio").includes(usd0(oh.annual.net)), "Ohio $60,000 page shows the take-home");
  const tx = run({ grossAnnual: 25 * 2080, state: "TX" });
  assert.ok(page("hourly/25").includes(usd0(tx.annual.net)), "$25 an hour page shows the Texas take-home");
});

test("the sitemap lists every indexable page once", () => {
  const xml = readFileSync(join(out, "sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length);
  assert.ok(locs.includes("https://localtakehome.com/"));
  assert.ok(locs.includes("https://localtakehome.com/texas-paycheck-calculator/"));
  assert.ok(!locs.some((loc) => loc.includes("404")));
  assert.ok(locs.every((loc) => loc.startsWith("https://localtakehome.com/")));
});
