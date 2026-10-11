# Ad-ready checklist — LocalTakehome

Status: Google AdSense publisher `ca-pub-4059575347806121` wired for site verification (head client script + `ads.txt`). Monetization lock unchanged: max **2** PartnerCards + **1** AdSlot, never above net, no email gate / interstitial / sticky ad. No Auto ads in the sticky netbar.

## Done in the product

- [x] Shared footer on every page: Methodology, Sources, Local taxes, **Privacy**, **Terms**, **About**, Corrections
- [x] `/privacy`, `/terms`, `/about` pages (trailing slash works via Pages 308; no-slash links in footer)
- [x] Privacy Ads section: third-party cookies/IDs when a network is connected; salary still not sent; partner click tracking; NAI / Google Ad Settings opt-outs; `/ads.txt` note; honest placeholder status
- [x] Terms: Advertisements and partner links (labeled Partner; may earn commission; estimates unchanged)
- [x] About: slogan unchanged (“True take-home pay for where you actually live.”); Contact subsection (no invented email)
- [x] `public/ads.txt` ships authorized sellers line: `google.com, pub-4059575347806121, DIRECT, f08c47fec0942fa0`
- [x] `_headers` sets `Content-Type: text/plain; charset=utf-8` for `/ads.txt`
- [x] `robots.txt` allows `/` and `/ads.txt`; sitemap includes privacy, terms, about
- [x] PartnerCard + AdSlot placeholders below net (see `REVENUE_SLOTS.md`)

## Done for AdSense verification

1. **Publisher ID** — `ca-pub-4059575347806121` / `pub-4059575347806121` in shared HTML `<head>` (every page via `layout()` + 404) and in `public/ads.txt`.
2. **ads.txt** — `google.com, pub-4059575347806121, DIRECT, f08c47fec0942fa0`
3. **Head script only** for this pass — no Auto ads above net / netbar; reserved `.ad-slot` kept below net.

## You still must supply / do

1. In AdSense, check **I’ve placed the code** and click **Verify** (only after deploy confirms live head + ads.txt).
2. **Public contact email** (optional but useful for trust) — add it under About → Contact when you have one; do not invent `support@…`.
3. **Display creatives** — when ready, place units inside the existing `.ad-slot` / `.ad-slot-box` below net; never above the net figure; keep the Advertisement label.
4. **Partner affiliate URLs** — replace `href="#partner"` placeholders in `src/js/partners.mjs` when deals are live; keep the Partner eyebrow.

## Deploy reminder

```bash
cd /workspace/localtakehome-src && npm test && npm run build
cp -a dist/. /workspace/localtakehome-deploy/
npx wrangler pages deploy /workspace/localtakehome-deploy --project-name=localtakehome
```

Live: https://localtakehome.com — confirm `/ads.txt`, `/privacy`, `/terms`, `/about` after deploy.
