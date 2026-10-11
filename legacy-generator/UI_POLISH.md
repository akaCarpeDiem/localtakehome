# LocalTakehome UI polish

UI-only pass. Tax engine math (`engine.mjs`, data JSON rates) was not changed. No new marketing pages. Palette unchanged: warm paper / ink / mineral green / copper.

## Homepage

**Before**
- Mast H1: “See what you actually take home.”
- Lede mixed Social Security/Medicare wording and privacy into one paragraph.
- Header was wordmark-only; no slogan under the brand.
- Theme boot read `tth-theme`.

**After**
- H1: **What do you actually take home?**
- Primary lede: **Federal, FICA, state, and local taxes — based on where you live.**
- Short privacy line under the lede (browser-only; nothing uploaded).
- Header brand block: wordmark + `.tagline` (“True take-home pay for where you actually live.”), muted ~12.5px; ellipsis on tight widths, hidden under 380px.
- Theme keys: `lth-theme` with one-time fallback from `tth-theme`.
- Product card still inputs left / stub right on desktop; stacks inputs → stub on mobile. Ads stay below the calculator.

## Stub

**Before**
- Flat line list; source buried as gray `.line-src` text.
- Notes mixed with warnings; no dedicated Assumptions box.
- No section grouping.

**After**
- Lines grouped with section headers: **Gross · Pre-tax · Taxes · Post-tax · Net** (`line.section`), hairline rules between groups.
- `line.source` renders as `.chip-src`; unique sources collected in a chip row under the stub.
- **Assumptions** box under stub/notes (`result.assumptions`, else first notes); warnings stay amber and separate.
- Stub head unchanged: Estimated stub · Tax year 2026 · frequency · filing · location.
- Medal “kept of each $100” kept with tabular nums.
- Stub pane `min-height` so typing does not jump layout.
- Chart expense tone uses `--expense` instead of hardcoded `#8d8478`.

## Mobile sticky bar

**Before**
- Ink bar with label + net amount only; easy to read as a promo strip.

**After**
- Shows only with non-sample results (`has-netbar`).
- Content: label + **net** + frequency (e.g. biweekly) + **View stub** control that scrolls to `[data-stub]` / `.stub`.
- Compact utility chrome (not ad-like); print/embed still hide it.

## Dark mode only

**Before / After (palette preserved)**
- Same warm paper surfaces inverted to charcoal / cream ink; mineral green accent and copper local unchanged.
- Body radial gradients quieter (lower opacity) in both themes.
- Theme toggle still writes `lth-theme` (migrates legacy `tth-theme` on first read).
- Print uses `var(--bg)` / paper tokens instead of raw white; still hides nav, theme, ads, chips, what-if, netbar.

## Other interaction polish

- Scenarios: `lth-scenarios` with one-time read fallback from `tth-scenarios`; **Clear all** near saved scenarios clears both keys.
- Money fields still strip `$`, commas, spaces via `num()`.
- Count-up: first seen ~240ms; subsequent ~150ms; `prefers-reduced-motion` → instant.

## Verification

- `npm test` → 24/24
- `npm run build` → 80 routes
- Dist synced to `/workspace/localtakehome-deploy`
- No edits to `src/js/engine.mjs` or `data/*.json`
