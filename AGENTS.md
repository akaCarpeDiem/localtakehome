# AGENTS.md: rules for working on LocalTakehome (localtakehome.com)

Read this before changing anything. README.md explains the layout and commands.

## Source of truth
- `site/` is the live site, byte for byte. Edit files in `site/` directly.
- `legacy-generator/` is an OLD generator (Oct 4, 2026 state). It is out of date compared with the live site. Never build from it and copy its `dist/` over `site/`. That happened once (deploy 9698ae13) and silently reverted the glass header, rate blocks, the AdSense content pass, About/Privacy/Terms/Contact wording, and the font change. Use it only as a reference for how pages were first generated.
- The build is `scripts/build.sh`. It copies `site/` to `build/out`, then runs `patches/header.py` and THEN `patches/hero.py`. Keep that order. Both are idempotent and end with verify guards. On an unchanged `site/` they change nothing. If they ever do change files, copy the result back into `site/` and commit it.
- `patches/history/` (apply.py, content.py, pages.py) holds the Oct 7 AdSense content pass. It is already applied. Do not re-run it: `pages.py` ABOUT/PRIVACY/TERMS text is stale and would overwrite later wording. If it is ever re-run, re-run header.py and hero.py afterwards.

## Do not change
- **Google Analytics 4 `G-S9BK9NYDGC`.** The tag is inserted by `patches/header.py` (GA_TAG), exactly once, as the first thing inside `<head>` on every HTML page. It is the privacy-safe version: `page_location: location.origin + location.pathname` and `page_referrer: document.referrer.split('?')[0]`. The query string, which holds the calculator inputs and salary, must never reach Google. Do not swap in the default gtag snippet. Do not add events that send inputs.
- **GA Enhanced measurement.** "Page changes based on browser history events" and "Form interactions" must stay OFF in the GA admin. This is not set in code, but do not add code that depends on them.
- **AdSense publisher `ca-pub-4059575347806121`.** It appears in the head script on every page and in `site/ads.txt`. There are no fixed ad units in the HTML; ads come from the head script (Auto ads, configured in the AdSense console). Never place ads above the net-pay result, and never add sticky ads, interstitials, or email gates.
- **Partner placeholders.** Partner cards and "Advertisement" placeholder boxes were removed on purpose. `site/js/partners.mjs` is a no-op stub; keep it that way unless the owner asks.
- **Privacy.** Calculations run in the browser. Nothing the user types is uploaded. Saved scenarios stay in localStorage.
- **Contact.** `support@localtakehome.com` is the ONLY public email. Keep it wrapped in `<!--email_off-->...<!--/email_off-->` so Cloudflare does not obfuscate it. Do not add any other address.
- **Wording.** The slogan stays "True take-home pay for where you actually live." (header tagline, with "live." styled as `.tagline-live`). The owner is "LocalTakehome" (an independent website). Results are educational estimates, not tax advice.
- **Fonts.** The display serif is Source Serif 4. Fraunces must not appear in the served CSS; header.py asserts this. The old fraunces-*.woff2 files stay in `site/fonts/` so stale cached CSS cannot 404.
- **CSS cache-busting.** Bump `CSS_VER` in `patches/header.py` on every CSS or site.mjs change (it rewrites `site.css?v=` / `site.mjs?v=` in all HTML). Never reuse an old value.
- **Hosting.** Cloudflare Pages project `localtakehome`. `functions/_middleware.ts` 301s www to the apex and 404s `/.publish/*`. totaltakehomepay.com 301s to localtakehome.com through a Cloudflare redirect rule, not this repo. Do not change Cloudflare settings, DNS, redirect rules, or secrets from here.

## Tax data
- `site/data/*.json` (federal, FICA, states, local, state payroll) are the 2026 tables used by `site/js/engine.mjs`. Never invent a rate. An unsourced jurisdiction must show a warning, not a quiet $0. Every state and local entry carries `lastVerified` and a source URL.
- When a rate changes, update the JSON, the "last verified" date, and the affected page copy. Then run `npm test`.

## Deploying
- Only deploy when the owner explicitly asks. Use `npm run deploy:preview` (branch `preview`) first. `npm run deploy` is PRODUCTION.
- After a production deploy, run `npm run compare-live`. It should report 0 differences.
- Never commit `.env*`, `.dev.vars`, API tokens, or keys.
