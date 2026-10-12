# AGENTS.md: rules for working on LocalTakehome (localtakehome.com)

Read this before changing anything. README.md explains the layout and commands.

## Source of truth
- `src/` is the source. `scripts/build.mjs` generates the whole site from it into `build/out`. Never edit files in `build/`; they are overwritten on every build.
- Every figure on every page is computed at build time by `src/js/engine.mjs` from the rate files in `src/data/`. Do not type a dollar amount or a rate into page copy. Compute it in the page builder (`scripts/pages/*.mjs`) so it follows the data.
- The same engine and the same rendering code (`src/js/view.mjs`, `calc-form.mjs`, `tools.mjs`) run in the browser. The build pre-renders each calculator with them, so keep those files free of DOM access at import time.
- The old hand-edited `site/` folder, `patches/` and `legacy-generator/` were removed in the October 2026 rebuild. They are in git history only. Do not bring them back.

## Do not change
- **Google Analytics 4 `G-S9BK9NYDGC`.** The tag is in `scripts/lib/layout.mjs` (GA_TAG) and must be the first thing inside `<head>` on every page, exactly once. It is the privacy-safe version: `page_location: location.origin + location.pathname` and `page_referrer: document.referrer.split('?')[0]`. A link that carries calculator inputs in its query string must never reach Google. Do not swap in the default gtag snippet. Do not add events that send inputs. The build and `npm test` fail if the tag is missing, duplicated or altered.
- **GA Enhanced measurement.** "Page changes based on browser history events" and "Form interactions" must stay OFF in the GA admin. The calculator does not write inputs to the address bar while you type (only "Copy a link" builds such a link), but do not add code that depends on either setting.
- **AdSense publisher `ca-pub-4059575347806121`.** The script is in `<head>` on every page (ADSENSE_TAG in `scripts/lib/layout.mjs`) and the id is in `src/static/ads.txt`. There are no fixed ad units in the HTML; ads come from the head script (Auto ads, configured in the AdSense console). Never place ads above the take-home result, and never add sticky ads, interstitials, or email gates. The build fails if a fixed ad unit appears.
- **No partner cards or "Advertisement" placeholder boxes.** They were removed on purpose. Do not add them back unless the owner asks.
- **Privacy.** Calculations run in the browser. Nothing the user types is uploaded. The last inputs (`lth-last`) and saved estimates (`lth-scenarios`) stay in localStorage, and the privacy policy lists both keys. If you add a key, add it there.
- **Contact.** `support@localtakehome.com` is the ONLY public email. Use `EMAIL_LINK` from `scripts/lib/layout.mjs`, which wraps it in `<!--email_off-->...<!--/email_off-->` so Cloudflare does not obfuscate it. The build fails on any other address.
- **Wording.** The slogan stays "True take-home pay for where you actually live." (header tagline, with "live." styled as `.tagline-live`). The owner is "LocalTakehome" (an independent website). Results are educational estimates, not tax advice. Privacy policy and terms text live in `src/content/`; change them only when behaviour changes, and update the "Last updated" date.
- **Fonts.** The display serif is Source Serif 4. Fraunces must not appear in the stylesheet (the build fails if it does). The old `fraunces-*.woff2` files stay in `src/static/fonts/` so stale cached CSS cannot 404.
- **Addresses.** Every URL that has ever been published must keep working. `tests/fixtures/legacy-paths.txt` lists them and `npm test` fails if one disappears. When you add pages, add their paths to that file after they have gone live.
- **Cache-busting is automatic.** Scripts are written to `/js/<content hash>/` and the stylesheet to `/css/site.<content hash>.css`. Do not add version query strings by hand.
- **Hosting.** Cloudflare Pages project `localtakehome`. `functions/_middleware.ts` 301s www to the apex and 404s `/.publish/*`. totaltakehomepay.com 301s to localtakehome.com through a Cloudflare redirect rule, not this repo. Do not change Cloudflare settings, DNS, redirect rules, or secrets from here.

## Tax data
- `src/data/*.json` (federal, FICA, states, local, state payroll) are the 2026 tables. Never invent a rate. An unsourced jurisdiction must show a warning, not a quiet $0. Every state, local and payroll entry carries `lastVerified`, a source URL and a `confidence`.
- A state whose tax is more than "deduction, exemption, brackets" names a `rule`, and the rule's arithmetic is in `STATE_RULES` in `src/js/engine.mjs`. Put numbers in the JSON (`params`), not in the code.
- When a rate changes: update the JSON, its `lastVerified` date and its `changed` note (which is published on `/updates/`), add or adjust a hand-worked test in `tests/engine.test.mjs`, then run `npm test`. Page copy follows the data on the next build.
- Expected values in tests are worked out by hand from the official schedule, with the arithmetic in a comment. Never paste the engine's output in as the expected value.
- `docs/TAX_AUDIT_2026-10.md` records what was checked in October 2026, with sources, and what is still an estimate.

## Deploying
- Only deploy when the owner explicitly asks. Use `npm run deploy:preview` (branch `preview`) first. `npm run deploy` is PRODUCTION.
- `npm test` must pass before any deploy. It also builds the site and checks the result.
- After a production deploy, run `npm run compare-live`. It should report 0 differences.
- Never commit `node_modules/`, `build/`, `.env*`, `.dev.vars`, API tokens, or keys.
