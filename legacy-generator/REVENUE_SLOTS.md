# Revenue slots — LocalTakehome

Tasteful, labeled placements only. Never above the net-pay figure. Never disguised as tax results. Max **two** PartnerCards and **one** AdSlot per page. No email gate, interstitial, or sticky footer ad.

Brand palette unchanged (warm paper / ink / green / copper). Calculator math (`engine.mjs`, rate tables) untouched.

## Units

### PartnerCard
- Eyebrow: **Partner**
- Title, one-sentence benefit, CTA (`Learn more` / `See partner`)
- `href="#partner"` placeholder
- Classes: `.partner-row`, `.partner-card`, `.partner-eyebrow`, `.partner-benefit`, `.partner-cta`
- Surface/card look; clearly sponsored

### AdSlot
- Label: **Advertisement**
- Empty reserved box (`.ad-slot` → `.ad-slot-box`)
- Aspect ratio ~16/5, min-height ~96px — reserved so layout does not jump (CLS)
- Placeholder only; no creative loaded yet

## Placement by page type

### Homepage (`/`)
First screen is clean (calculator only). Monetization lives in `.below` **after** “How to read the stub”:

1. Mast + calculator (inputs → stub → charts → what-ifs → tools → notes)
2. How to read the stub (explanation)
3. **Partner row** (tax software + savings) + **AdSlot**
4. FAQ
5. Browse by place
6. Footer

Calculator-internal partner/ad mounts are hidden on `data-page="static"` so they do not appear above the explainer.

### Paycheck / hourly / W-4 / location pages (live calculator)
Inside the product stub pane, after notes:

1. Inputs
2. Stub (net pay)
3. Charts + notes/disclaimer
4. What-ifs
5. Related-tools row
6. **Partner row** (context-filled after a real result; empty on sample stub)
7. **AdSlot** (always reserved)
8. `.below` FAQ / location prose
9. Footer

No duplicate static partner block in `.below` on these pages (avoids exceeding the two+one cap).

### Tool pages (`#tool`)
Static `monetize(context)` in `.below` after the tool prose, before FAQ:

| Page | Partner cards |
|------|----------------|
| Compare | Moving banking + everyday banking (no COL claims) |
| Employer cost | Payroll software + savings fallback |
| Contractor vs W-2 | Quarterly tax & books + tax software |
| Bonus / OT / raise / 401(k) | Default: tax software + savings |

Then one AdSlot, then FAQ (when present), then footer.

## Live context rules (`calculator.mjs` → `[data-partners]`)

After paint, only when the stub is **not** the sample:

1. **Contractor** employment → quarterly tax / bookkeeping card (preferred)
2. **Traditional or Roth 401(k) > 0** → IRA / retirement card
3. Fill remaining slots with **tax software**, then **savings** (max two total)

Partners never sit above the net number. Copy never says “AI-powered” or “TrueTakehome.”

## Sticky mobile bar

`.netbar` is unchanged: **net this paycheck**, frequency label, and **View stub** only. No ad, partner, or affiliate in the sticky bar. Print and embed modes hide `.partner-row`, `.ad-slot`, and `.ads` with other chrome.

## Files

- `src/js/partners.mjs` — shared catalog, `partnerCard` / `partnerRow` / `adSlot` / `monetize` / `pickPartnerKeys` / `renderPartners`
- `src/js/calculator.mjs` — shell mounts + live fill
- `scripts/build.mjs` — static `ads(context)` → `monetize`, page order
- `src/css/site.css` — minimal partner / ad-slot styles
