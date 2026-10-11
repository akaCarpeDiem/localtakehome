# LocalTakehome

Source for https://localtakehome.com, a free 2026 U.S. take-home pay calculator: federal, FICA, state, state payroll programs, and city/county wage taxes. It is a static site hosted on Cloudflare Pages, plus one Pages Functions middleware. All calculations run in the browser.

Read AGENTS.md first. It has the rules for what must not change.

## Layout

| Path | What it is |
| --- | --- |
| `site/` | **The live site (source of truth).** HTML for 82 pages (home, 51 state pages, city/county pages, tools, legal), plus `js/`, `css/`, `data/`, `fonts/`, `assets/`, `_headers`, `ads.txt`, `robots.txt`, `sitemap.xml`, and `404.html`. Edit here. |
| `site/js/engine.mjs` | The tax engine (pure functions). `data.mjs` loads `site/data/*.json`, `calculator.mjs` and `view.mjs` render the UI, `tools.mjs` holds the extra calculators, and `site.mjs` holds the shell and header. |
| `site/data/` | The 2026 tax tables: `federal-2026.json`, `fica-2026.json`, `states-2026.json`, `local-2026.json`, `state-payroll-2026.json`. |
| `functions/_middleware.ts` | A Pages Function that 301s www to the apex and returns 404 for `/.publish/*`. |
| `patches/header.py`, `patches/hero.py` | Idempotent patch-and-verify scripts that run at build time, in this order. They hold the glass header, the Source Serif 4 font, the privacy-safe GA4 tag, CSS cache-busting, the homepage hero blurb, and the partner stub. `patches/assets/` holds their inputs. |
| `patches/history/` | The Oct 7 AdSense content-pass scripts. They are already applied; do not re-run them. |
| `scripts/build.sh` | Copies `site/` to `build/out`, runs the patches, and stages `functions/`. |
| `scripts/deploy.sh` | Builds, then runs `wrangler pages deploy`. |
| `scripts/compare-live.sh` | Compares `build/out` byte-for-byte with the live site. |
| `scripts/original/deploy_lt.sh` | The original box deploy script, kept for reference. It uses absolute /workspace paths. |
| `tests/engine.test.mjs` | Engine and data tests (node:test) against `site/js` and `site/data`. |
| `legacy-generator/` | The old Node generator and its docs: TAX_DATA_SOURCES.md, ENGINE_AUDIT.md, and others. It is **out of date**; see AGENTS.md. |
| `docs/publish-status/` | Change logs for each deploy (Oct 2–7, 2026). |
| `docs/archive/PROJECT_BRIEF.md` | The original product brief, written under the working name TrueTakehome. |

## Commands

```bash
npm ci                    # installs wrangler only (the site has no runtime deps)
npm test                  # engine/data tests
npm run build             # -> build/out (deploy folder) + build/functions
npm run compare-live      # build/out vs https://localtakehome.com
npm run deploy:preview    # preview deploy (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
npm run deploy            # PRODUCTION; only with the owner's go-ahead
```

Requirements: Node 20+ and Python 3. Local preview: `npx serve build/out`, or any static server pointed at `build/out`.

## Hosting

- Cloudflare Pages project `localtakehome` (https://localtakehome.pages.dev). Custom domains: localtakehome.com and www.localtakehome.com. Production branch `main`. Deploys are direct uploads (no Git integration).
- Compatibility date 2026-09-27. There are no KV, D1, or R2 bindings, and no environment variables or secrets.
- totaltakehomepay.com 301s to localtakehome.com through a Cloudflare redirect rule (outside this repo).

## Tax data

The 2026 figures come from IRS Rev. Proc. 2025-32 and Publication 15-T (federal), the SSA (Social Security wage base $184,500), the Tax Foundation's 2026 state income tax table (state brackets), and each city's or county's tax agency (local rates). Each JSON entry carries its source URL and a `lastVerified` date. The full inventory is in `legacy-generator/TAX_DATA_SOURCES.md`. `assertTaxDataIntegrity()` in the engine and `npm test` check the tables.
