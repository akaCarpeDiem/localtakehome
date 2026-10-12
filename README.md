# LocalTakehome

Source for https://localtakehome.com, a free 2026 U.S. take-home pay calculator: federal income tax, Social Security and Medicare, state income tax, state payroll programs, and city and county income taxes. It is a generated static site hosted on Cloudflare Pages, plus one Pages Functions middleware. All calculations run in the browser.

Read AGENTS.md first. It has the rules for what must not change.

## Layout

| Path | What it is |
| --- | --- |
| `src/data/` | The 2026 rate tables: `federal-2026.json`, `fica-2026.json`, `states-2026.json`, `local-2026.json`, `state-payroll-2026.json`. Every entry has a source and a date. |
| `src/js/engine.mjs` | The tax engine. Pure functions, no DOM. `calculateTakeHome(input, tables)` returns every line, the working behind it, notes and sources. |
| `src/js/` (the rest) | `calc-form.mjs` (the calculator's form, link format and conversion to engine input), `view.mjs` (results as HTML), `tools.mjs` (the smaller calculators), `calculator.mjs` and `site.mjs` (browser wiring), `format.mjs`, `data.mjs`. |
| `src/css/site.css` | The stylesheet. |
| `src/content/` | Text of the About, Contact, Privacy and Terms pages. |
| `src/static/` | Files copied as they are: fonts, images, `ads.txt`, `robots.txt`, `_headers`, the web manifest. |
| `scripts/build.mjs` | The generator. Writes `build/out` (the deploy folder) and stages `functions/` beside it. |
| `scripts/lib/` | The page frame (`layout.mjs`: head, header, footer, GA and AdSense tags) and shared helpers. |
| `scripts/pages/` | One builder per kind of page: home, tools, states, cities, salaries and hourly wages, guides, info pages. |
| `scripts/content/cities.mjs` | The list of city and county pages. |
| `scripts/deploy.sh`, `scripts/compare-live.sh` | Deploy with wrangler; compare `build/out` with the live site byte for byte. |
| `functions/_middleware.ts` | A Pages Function that 301s www to the apex and returns 404 for `/.publish/*`. |
| `tests/engine.test.mjs` | Engine and data tests with hand-worked expected values. |
| `tests/build.test.mjs` | Builds the site and checks it: old URLs still exist, required tags on every page, figures match the engine, repeatable output. |
| `docs/` | The October 2026 tax audit notes, older deploy logs and the original brief. |

## Commands

```bash
npm ci                    # installs wrangler only (the site has no runtime dependencies)
npm test                  # engine tests, then a full build and checks on the output
npm run build             # -> build/out (deploy folder) + build/functions
npm run compare-live      # build/out vs https://localtakehome.com
npm run deploy:preview    # preview deploy (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
npm run deploy            # PRODUCTION; only with the owner's go-ahead
```

Requirements: Node 20 or newer. Nothing else: the build uses no packages. Local preview: any static server pointed at `build/out`, for example `python3 -m http.server 5180 --directory build/out`.

The build stops with a list of problems if a rate file fails its checks, a link is broken, a figure failed to compute, or a page is missing the analytics or AdSense tag. `LTH_DRAFT=1 npm run build` lets a half-finished site build while you are writing pages; never deploy a draft build.

## What gets generated

About 820 pages from one command:

- the home page and the other full-calculator pages (paycheck, hourly, W-4)
- 11 smaller calculators (compare, bonus, raise, overtime, tips, 401(k), salary needed, salary to hourly, contractor or employee, employer cost, take-home pay by state)
- a page for each state and D.C., and for about 65 cities and counties
- "$X a year after taxes" pages nationally and for each state, and "$X an hour" pages
- guides, the method page, the update log, the embed page, and the legal pages
- `sitemap.xml`

To add a city, add a line to `scripts/content/cities.mjs`. To add a salary or hourly page, add the amount to the lists at the top of `scripts/lib/shared.mjs`. To add a guide, add it in `scripts/pages/guides.mjs`.

## Hosting

- Cloudflare Pages project `localtakehome` (https://localtakehome.pages.dev). Custom domains: localtakehome.com and www.localtakehome.com. Production branch `main`. Deploys are direct uploads (no Git integration).
- Compatibility date 2026-09-27. There are no KV, D1, or R2 bindings, and no environment variables or secrets.
- totaltakehomepay.com 301s to localtakehome.com through a Cloudflare redirect rule (outside this repo).

## Tax data

Federal figures come from IRS Rev. Proc. 2025-32 and the IRS pages on the 2025 budget law; the Social Security wage base from the SSA; state rates and rules from each state's tax agency, cross-checked against the Tax Foundation's 2026 table; local rates from each city's or county's tax agency. `assertTaxDataIntegrity()` in the engine checks the tables, and the build refuses to run if it reports a problem. `docs/TAX_AUDIT_2026-10.md` lists what was verified and what is still an estimate.
