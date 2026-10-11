# Location copy (content-only pass)

Updated September 27, 2026 (PT). Product: LocalTakehome · localtakehome.com. Slogan kept exact: “True take-home pay for where you actually live.”

## Scope

- Lead paragraphs + FAQs on location pages only (no restyle, no tax-math / UI chrome / Partner·Ad / token changes).
- Brand sweep for TrueTakehome / truetakehome / old domains.
- Intentional `tth-*` → `lth-*` localStorage migration left intact.

## Approach — uniqueness

**Launch pages (28)** in `src/content/locations.mjs` already had hand-authored leads and FAQs. One Yonkers FAQ question was rephrased so it no longer shared a skeleton with Columbus.

**Generated pages (34)** previously used shape templates in `src/content/generate-locations.mjs` (e.g. “${state} does not tax wages. There is no state income-tax line…”) — the classic name-swap clone.

**Fix:** replaced that template with a required `UNIQUE` map keyed by state id. Every generated state now has its own 2–3 lead paragraphs and 3 FAQs written from that state’s engine facts (brackets vs flat vs none, SDI/paid-leave when modeled, 401(k) base rules, conformity/estimated caveats, reciprocity only when already supported). Missing an id throws at build time so a new state cannot silently fall back to a clone.

## Uniqueness verification

After rebuild, all **62** location pages were checked by normalizing lead paragraph 1 and FAQ questions (stripping place names). Result: **0 duplicate leads**, **0 duplicate FAQ question skeletons**.

Spot-checked: TX, CA, NY, FL, NJ, PA, OH, WA, plus NYC and Philadelphia city pages — each has distinct lead openings and distinct Q sets (NJ calls out non-deductible 401(k) + TDI/FLI not modeled; WA calls out Paid Leave + WA Cares; Philly focuses on wage-tax rates vs PA state page).

## Example — before / after duplicated pattern

**Before (generated no-tax template):**

> Alaska does not tax wages. There is no state income-tax line on wages. Federal income tax after the 2026 standard deduction, plus Social Security and Medicare, still come out of the deposit. …

Nevada / South Dakota / Tennessee / Wyoming used the same paragraph with the state name swapped.

**After (Alaska):**

> Alaska does not tax wages. There is no state income-tax withholding to model, and this file does not invent one. A $75,000 salary still loses federal income tax… The Permanent Fund Dividend is a separate annual payment…

**After (Nevada):**

> Nevada does not tax wages. The Commerce Tax and other business levies are not employee withholding… Tips you enter are part of gross pay…

## Brand leftovers

| Pattern | Public src / build output | Action |
| --- | --- | --- |
| TrueTakehome / truetakehome product strings | None in `src/`, `scripts/` HTML, `data/` | None needed |
| Slogan “True take-home…” | Header, meta, about | **Kept exactly** |
| `tth-theme` / `tth-scenarios` migration | `site.mjs`, `calculator.mjs`, privacy copy | **Kept** |
| Docs mentioning TrueTakehome as forbidden copy | `REVENUE_SLOTS.md`, `SEO_TRUST_AUDIT.md`, `BUG_LOG.md` | Left (internal) |

No “AI-powered” in titles/headers.

## Build / test / deploy

- `npm test` — 36 pass / 0 fail
- `npm run build` — 80 routes → `dist/`
- Synced `cp -a dist/. /workspace/localtakehome-deploy/`
- Cloudflare Pages project: `localtakehome` (wrangler deploy from deploy folder)

## Files changed

- `src/content/generate-locations.mjs` — per-state `UNIQUE` copy map; template leads/FAQs removed
- `src/content/locations.mjs` — Yonkers FAQ wording only
- `LOCATION_COPY.md` — this note
