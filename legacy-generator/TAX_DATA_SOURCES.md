# LocalTakehome tax data sources (tax year 2026)

Last verified: September 28, 2026 (PT). Brand: LocalTakehome / localtakehome.com.
Slogan unchanged: True take-home pay for where you actually live.

This file is the rate inventory for the integrity pass. **Do not invent rates.** Unsourced jurisdictions must not calculate as a quiet $0.

## Summary table

| Jurisdiction | Was | Now | Source or “not modeled” |
| --- | --- | --- | --- |
| Federal income tax brackets + std. deduction | sourced Rev. Proc. 2025-32 | **verified** single/MFS $16,100; MFJ $32,200; HoH $24,150; SS base companion in FICA | IRS Rev. Proc. 2025-32 / IRS newsroom |
| FICA SS wage base | $184,500 @ 6.2% | **verified** $184,500 / max $11,439 | SSA contribution and benefit base |
| Medicare / Additional Medicare | 1.45% / 0.9% | **unchanged, verified** | IRS Pub 15 / IRC §3101(b)(2) |
| Alaska state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Alaska — no wage income tax (Tax Foundation 2026) |
| Florida state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Florida — no wage income tax (Tax Foundation 2026) |
| Nevada state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Nevada — no wage income tax (Tax Foundation 2026) |
| New Hampshire state income tax | $0 (no wage tax) | **$0 sourced as no tax** | New Hampshire — no wage income tax (Tax Foundation 2026) |
| South Dakota state income tax | $0 (no wage tax) | **$0 sourced as no tax** | South Dakota — no wage income tax (Tax Foundation 2026) |
| Tennessee state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Tennessee — no wage income tax (Tax Foundation 2026) |
| Texas state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Texas — no wage income tax (Tax Foundation 2026) |
| Washington state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Washington — no wage income tax (Tax Foundation 2026) |
| Wyoming state income tax | $0 (no wage tax) | **$0 sourced as no tax** | Wyoming — no wage income tax (Tax Foundation 2026) |
| Alabama state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Arizona state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Arkansas state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Connecticut state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Idaho state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Maine state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Minnesota state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Mississippi state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Missouri state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| South Carolina state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Utah state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| Wisconsin state income tax | estimated brackets | **still estimated** (engine warns) | Tax Foundation 2026 table; phaseouts/conformity incomplete |
| New York City (`nyc`) | modeled brackets | **modeled** | New York State, New York City tax rates |
| Yonkers (`yonkers`) | modeled surcharge | **modeled** | New York State, Yonkers tax |
| Philadelphia (`philadelphia`) | published | **published** | City of Philadelphia Department of Revenue, wage tax cut effective July 1, 2025 |
| Pittsburgh (`pittsburgh`) | estimated 3%/1% | **published** | City of Pittsburgh, Earned Income Tax |
| Detroit (`detroit`) | published | **published** | City of Detroit income tax |
| Columbus, Ohio (`columbus-oh`) | published | **published** | City of Columbus income tax division |
| Cleveland (`cleveland-oh`) | published | **published** | Central Collection Agency, Cleveland municipal tax |
| Montgomery County, Maryland (`montgomery-md`) | published | **published** | Comptroller of Maryland, Withholding Tax Facts 2026 |
| Baltimore City (`baltimore-md`) | published | **published** | Comptroller of Maryland, Withholding Tax Facts 2026 |
| Marion County, Indiana (`marion-in`) | estimated 2.02% | **published** | Indiana Department of Revenue, Departmental Notice #1 (county tax rates) |
| Portland / Multnomah County (`portland-multnomah`) | estimated thresholds $125k/$200k Metro | **published; Metro SHS thresholds → $128k / $205k for 2026** | City of Portland Revenue Division, Personal Income Tax (Metro SHS + Multnomah PFA) |
| District of Columbia (`dc-note`) | reference | **published** | DC income tax is the state file (no second city layer) |
| California SDI (`ca-sdi`) | published 0.013 | **published 0.013** | California EDD, SDI contribution rates |
| New York disability (DBL) (`ny-dbl`) | published 0.005 | **published 0.005** | New York State, disability benefits contribution cap |
| New York Paid Family Leave (`ny-pfl`) | published 0.00432 | **published 0.00432** | New York Paid Family Leave, 2026 rates |
| Washington Paid Family & Medical Leave (`wa-pfml`) | published 0.00808 | **published 0.00808** | Washington Employment Security Department, PFML premium rates |
| WA Cares (`wa-cares`) | published 0.0058 | **published 0.0058** | WA Cares Fund |
| Oregon statewide transit tax (`or-transit`) | published 0.001 | **published 0.001** | Oregon Department of Revenue, Statewide Transit Tax |
| Colorado FAMLI (`co-famli`) | published 0.0044 | **published 0.0044** | Colorado FAMLI Division |
| Connecticut Paid Leave (`ct-pfml`) | published 0.005 | **published 0.005** | Connecticut Paid Leave Authority |
| New Jersey TDI and FLI (NJ) | not modeled | **not modeled** (explicit warning when NJ selected) | Employee TDI/FLI rates are not sourced in this product for 2026, so no withholding line is shown. |
| Rhode Island TDI (RI) | not modeled | **not modeled** (explicit warning when RI selected) | Rhode Island TDI is not sourced here, so no withholding line is shown. |
| Hawaii TDI (HI) | not modeled | **not modeled** (explicit warning when HI selected) | Hawaii TDI is not sourced here, so no withholding line is shown. |
| Massachusetts PFML (MA) | not modeled | **not modeled** (explicit warning when MA selected) | Massachusetts PFML employee premium is not sourced here, so no withholding line is shown. |
| Oregon PFMLI (Paid Leave Oregon) (OR) | not modeled | **not modeled** (explicit warning when OR selected) | Paid Leave Oregon employee premium is not sourced here (statewide transit tax is modeled separately). |
| Maine PFML (ME) | not modeled | **not modeled** (explicit warning when ME selected) | Maine paid family and medical leave is not sourced here, so no withholding line is shown. |
| Minnesota paid leave (MN) | not modeled | **not modeled** (explicit warning when MN selected) | Minnesota paid leave employee premium is not sourced here, so no withholding line is shown. |
| Delaware PFML (DE) | not modeled | **not modeled** (explicit warning when DE selected) | Delaware paid leave is not sourced here, so no withholding line is shown. |
| District of Columbia paid family leave (DC) | not modeled | **not modeled** (explicit warning when DC selected) | DC paid family leave is employer-paid in the standard plan and is not shown as an employee line. |

## Quiet-$0 paths closed

1. **Unsourced / placeholder local** (`placeholder`, `todo`, `confidence` missing/todo/unsourced, or no source): engine adds **no** local line and pushes a warning containing “not modeled” / “not a silent $0”. `dataGaps.localNotModeled` is true.
2. **Payroll program without `employeeRate`**: already skipped with warning; schema now forbids shipping such rows in `programs[]`.
3. **Known gaps** (NJ TDI/FLI, RI TDI, HI TDI, MA PFML, OR PFMLI, ME/MN/DE PFML, DC employer PFL): structured `notModeledPrograms[]` → warning when that state is selected; no fake $0 employee line.
4. **`localPossible` state with no city selected**: existing warning “Local wage tax not applied…” retained.
5. **Schema gate**: `assertTaxDataIntegrity(tables)` fails `npm test` if placeholder rows, missing sources, or flat local `residentRate` of 0 slip in.

## Deliberate estimates (visible disclaimer)

No named **local** jurisdictions remain `confidence: estimated` after this pass.

**State** income tax still marked `estimated` (engine warning when selected): AL, AZ, AR, CT, ID, ME, MN, MS, MO, SC, UT, WI — brackets come from the Tax Foundation 2026 compilation, but phaseouts, federal-tax deductions, or conformity footnotes are incomplete. Stub notes on those records remain.

NYC and Yonkers remain `confidence: modeled` (sourced rates; base/surcharge approximations documented in JSON notes).

Custom local percent is user-entered and labeled as such.

## Federal / FICA verification notes

- Standard deduction 2026: {'single': 16100, 'mfs': 16100, 'mfj': 32200, 'hoh': 24150}
- Single 10%→37% over thresholds: [0, 12400, 50400, 105700, 201775, 256225, 640600]
- SS wage base: 184500 @ 0.062 (max 11439)
- Primary cites: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf ; https://www.ssa.gov/oact/cola/cbb.html

## Local cite upgrades this pass

- **Pittsburgh**: City of Pittsburgh Finance page — resident 3% (1% city + 2% school), nonresident 1%. LST $52 still omitted.
- **Marion County, IN**: Indiana DOR Departmental Notice #1 — 2.02% for 2026 (unchanged on Oct 1, 2026 revision).
- **Portland / Multnomah**: Portland.gov personal-tax page + Metro SHS forecast — Metro SHS 2026 indexed thresholds $128,000 single / $205,000 joint; PFA thresholds unchanged at $125k/$200k and $250k/$400k.

## Tier A local expansion (September 28, 2026)

Added named jurisdictions with published 2025/2026 rates (see `data/local-2026.json` for per-row `source` + `lastVerified`):

| State | Added (summary) |
| --- | --- |
| MD | Remaining flat-rate counties + Anne Arundel progressive tiers (Frederick cliff schedule skipped → custom) |
| MI | Grand Rapids 1.5/0.75; Lansing, Flint, Pontiac, Battle Creek, Jackson, Muskegon 1/0.5; Saginaw 1.5/0.75; Highland Park 2/1 (Warren: no city income tax) |
| MO | Kansas City 1%; St. Louis 1% earnings taxes |
| DE | Wilmington wage tax 1.25% |
| KY | Louisville/Jefferson 2.2%/1.45%; Lexington/Fayette 2.25% |
| OH | Cincinnati 1.8%; Toledo, Akron, Dayton 2.5% |
| IN | Lake, Allen, Hamilton, St. Joseph, Elkhart, Tippecanoe, Vanderburgh, Monroe, Hendricks, Madison (DN#1 Oct 1, 2026 chart) |
| PA | No new cities (PSD/school-district EIT complexity) |
| AL / CO | Skipped — no clear stable city wage-income taxes sourced for this pass |

Disclaimer (calculator `data-local-edu` / `#local-hint`): local rates change; if yours differs from the rate we last verified for a named place, use the custom local rate field.

## Files

- `data/federal-2026.json`, `data/fica-2026.json`, `data/states-2026.json`, `data/local-2026.json`, `data/state-payroll-2026.json`
- `src/js/engine.mjs` (`localIsSourced`, `assertTaxDataIntegrity`, `dataGaps`, not-modeled warnings)
- `tests/engine.test.mjs` (schema + quiet-$0 regressions)
- `ENGINE_AUDIT.md`

