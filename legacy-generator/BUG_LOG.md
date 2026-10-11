# LocalTakehome hostile QA bug log

Date: September 27, 2026 (PT)  
Scope: break-it-and-fix-it only — no redesign, no new features, slogan unchanged.

## Summary

| Severity | Count |
| --- | --- |
| High | 1 |
| Medium | 4 |
| Low | 3 |
| Info / verified OK | several |

`npm test`: **36/36 pass** (was 24). `npm run build` required after this pass.

---

## Bugs fixed

### H1 — 401(k) / Roth percent over 100% produced nonsense nets
- **Severity:** High
- **Broken:** Entering traditional or Roth deferral as e.g. 150% of pay deferred more than gross, drove federal wages negative in effect, and could show large negative net (`-$34k` on a `$60k` salary) while FICA still ran on full wages.
- **Changed:** `normalizeRetirement` clamps percent mode to **100**. `retirementAmount` also caps percent at 100 and dollar deferrals at gross. Calculator `read()` mirrors the percent cap; soft copy in `#gross-error` when the field still shows >100. Custom local % also capped at 100.
- **Known limitations:** A true 100% traditional deferral still leaves FICA due, so net can remain slightly negative; that matches the model (deferral does not cut FICA). Chart shares rescale if benefits + tax exceed gross.

### M1 — Mobile sticky `.netbar` could cover last stub / actions
- **Severity:** Medium
- **Broken:** On viewports ≤900px, `body.has-netbar` showed a fixed bottom bar (~76px + safe area) while `.page` only had `72px` bottom padding — last partners/ads/actions could sit under the bar.
- **Changed:** In `site.css`, when `has-netbar` on mobile: increase `.page` `padding-bottom` using `var(--netbar-h)` + safe-area; nudge `.stub-pane` padding; set `.actions { scroll-margin-bottom: … }`.
- **Known limitations:** Desktop (≥901px) still hides the netbar; embed mode still hides it.

### M2 — `applyValues` could throw on bad saved / example values
- **Severity:** Medium
- **Broken:** `form.querySelector(\`[name=payType][value=${…}]\`).checked = true` (and employment/frequency) threw if the value did not match a radio, breaking scenario load / what-if reset.
- **Changed:** Safe `checkRadio` helper with `CSS.escape` and null checks.
- **Known limitations:** Invalid values are ignored rather than surfaced as a toast.

### M3 — Donut chart could exceed 100% when deferrals ≈ gross
- **Severity:** Medium
- **Broken:** Chart parts use `amount / gross`. With ~100% 401(k) plus FICA, shares summed past 1.0 and the conic gradient overflowed.
- **Changed:** `chartParts` rescales shares when the sum is > 1.
- **Known limitations:** Rescaling is display-only; stub dollar lines are unchanged.

### M4 — Compare winner copy did not spell out same-salary / tax-only wins
- **Severity:** Medium (copy / clarity)
- **Broken:** Same-salary TX vs CA correctly made TX “keep more,” but the lede did not say the win was tax-driven.
- **Changed:** When gross matches, lede becomes “Offer A/B keeps more — same salary, lower estimated tax.”
- **Known limitations:** Still not a cost-of-living comparison (already disclosed on the page).

### L1 — Huge salary strings could overflow the net figure
- **Severity:** Low
- **Broken:** Pathological inputs (far above real wages) still computed, but long currency strings could blow the net figure layout. Scientific notation was already avoided via `toLocaleString`.
- **Changed:** Engine caps `grossAnnual` at `$1e12` and `hourlyRate` at `$1e6`. CSS `overflow-wrap` / `word-break` on `.net-figure` (and shared display selectors).
- **Known limitations:** Cap is a guardrail, not a payroll max; above the cap the estimate uses the capped gross without a dedicated warning line.

### L2 — Soft field notice when percent fields are capped
- **Severity:** Low
- **Broken:** Clamping was silent in the form.
- **Changed:** Soft message in `#gross-error` (does not block recalculation) when 401(k)/Roth % or custom local % typed above 100.
- **Known limitations:** Field value is not rewritten until the user edits it; engine already uses the capped value.

### L3 — Brand / a11y / print spot-checks (hardening only)
- **Severity:** Low / verify
- **Broken / checked:** No public `TrueTakehome` / `truetakehome` product strings left (docs mention them as “do not say”). Slogan kept exact. `:focus-visible` already present; inputs wrapped in `<label>` or have `aria-label`. Print already hides header/nav/ads/partners/netbar/what-if. Debounced recalcs (100ms) already present.
- **Changed:** None beyond CSS netbar/overflow above.
- **Known limitations:** No custom combobox exists in this codebase (native `<select>` for state/local); nothing to fix for “empty query.” Theme/scenarios `tth-*` → `lth-*` migrations intentionally retained.

---

## Verified already correct (no code change)

| Check | Result |
| --- | --- |
| Salary + hourly | OK (fixtures + tests) |
| Weekly / biweekly / semimonthly / monthly | OK (new test) |
| Filing statuses change federal | OK (`mfj`/`hoh` vs `single`) |
| Texas $0 state income tax | OK |
| California state + SDI | OK |
| NY without NYC → no NYC line + local warning | OK |
| NYC resident shows NYC tax | OK |
| Philadelphia resident vs nonresident | OK |
| Custom local % named line | OK |
| Traditional 401(k) does not cut FICA | OK |
| Health / HSA reduce FICA | OK |
| Extra withholding changes net | OK |
| Bonus @ $0 salary | OK (no crash) |
| Contractor: no employee FICA; SE tax + Schedule C warning | OK |
| Share URL roundtrip | OK (new test) |
| Local-possible state with no city selected warns, does not invent tax | OK |
| NYC not applied to all NY | OK |
| Example tables / methodology fixtures | Built from live engine at `npm run build` |
| “Exact take-home” marketing claim | Softened already (“exact paycheck?” FAQ → estimate); slogan “True take-home…” kept on purpose |
| Theme `lth-theme` + scenarios `lth-scenarios` | Present with legacy `tth-*` migration |

---

## Known limitations remaining (engine / product, not fixed here)

1. Annualized Rev. Proc. brackets ≠ Pub 15-T employer withholding — disclosed on methodology.
2. Multi-state reciprocity / credits not modeled; remote split warns only.
3. Many U.S. locals omitted; custom % is gross-based, not jurisdiction-true.
4. Contractor mode omits QBI; SE tax is simplified Schedule SE.
5. 100% traditional deferral can still yield slightly negative net because FICA remains.
6. State “estimated” confidence rows (federal-tax deduction / conformity) can run high/low — listed on methodology.
7. Theme / scenario persistence is browser `localStorage` only.
8. No automated UI/a11y browser suite; keyboard/focus/contrast checked by code review + CSS tokens.

---

## Brand sweep findings

| Pattern | Public product code | Action |
| --- | --- | --- |
| `TrueTakehome` / `truetakehome` / `True Takehome` | **None** in `src/`, `scripts/` HTML output, `data/` | None |
| Docs mentioning TrueTakehome as forbidden copy | `REVENUE_SLOTS.md`, `SEO_TRUST_AUDIT.md` | Left (internal) |
| `tth-theme` / `tth-scenarios` | Intentional migration keys in `site.mjs`, `calculator.mjs`, `build.mjs` boot script | Kept |
| “AI-powered” | Only denial copy on terms (“does not claim AI-powered accuracy”) | Kept |
| Slogan “True take-home pay for where you actually live.” | Header, meta, about, locals | **Kept exactly** |

---

## Deploy

See parent report for live URL / wrangler result after `npm run build` and `cp -a dist/. /workspace/localtakehome-deploy/`.
