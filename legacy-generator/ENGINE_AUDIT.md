# LocalTakehome engine audit (tax year 2026)

Last reviewed: September 27, 2026 (PT). Product: LocalTakehome / localtakehome.com. Slogan: True take-home pay for where you actually live.

## Federal method

**Annualized bracket withholding estimate — not Publication 15-T wage-bracket or percentage-method payroll tables.**

`result.method` is taken from `data/federal-2026.json` (`federal.method`): taxable wages after pre-tax reductions that cut federal income tax, plus W-4 Step 4(a) other income, minus the 2026 standard deduction and W-4 Step 4(b) deductions; tax from Rev. Proc. 2025-32 schedules, then minus the W-4 Step 3 credit. Step 2 (multiple jobs) uses half the standard deduction and half-width brackets — an approximation, not the IRS Tax Withholding Estimator.

Annual liability is computed first, rounded to cents, then divided by pay periods (52 / 26 / 24 / 12). Extra W-4 withholding is per paycheck and is not run through the brackets.

Verified 2026 figures in use: standard deduction Single/MFS $16,100, MFJ $32,200, HoH $24,150; Social Security wage base $184,500 @ 6.2%; Medicare 1.45%; Additional Medicare 0.9% on wages **in excess of** the filing-status threshold ($200k single/HoH, $250k MFJ, $125k MFS). At exactly the threshold the Additional Medicare line is $0.

Traditional 401(k) reduces federal (and most state) taxable wages and does **not** reduce FICA wages. HSA / Section 125-style premiums reduce both income-tax and FICA wages in this model.

## Live local jurisdictions

Applied only when selected (or via custom percent). NYC is never applied to the rest of New York.

| id | Place | Treatment | Confidence |
| --- | --- | --- | --- |
| `nyc` | New York City | Resident brackets on approximated NY taxable income; off if only working there | modeled |
| `yonkers` | Yonkers | Resident surcharge 16.75% of NY State tax; nonresident 0.5% of wages | modeled |
| `philadelphia` | Philadelphia | Resident 3.74% / nonresident 3.43% of gross (FY2026) | published |
| `pittsburgh` | Pittsburgh | Resident 3% / nonresident 1% (city + school); local services tax omitted | published |
| `detroit` | Detroit | Resident 2.4% / nonresident 1.2% of gross | published |
| `columbus-oh` | Columbus, OH | 2.5% on qualifying wages (pretax reduces base) | published |
| `cleveland-oh` | Cleveland, OH | 2.5% on qualifying wages (pretax reduces base) | published |
| `montgomery-md` | Montgomery County, MD | Resident 3.20% of MD taxable; nonresident switch uses 2.25% simplification | published (resident) |
| `baltimore-md` | Baltimore City | Same pattern as Montgomery | published (resident) |
| `marion-in` | Marion County, IN | 2.02% of IN taxable (both switches); Indiana DOR DN#1 2026 | published |
| `portland-multnomah` | Portland / Multnomah | Metro SHS (2026 indexed $128k/$205k) + Multnomah PFA; resident only | published |
| `dc-note` | District of Columbia | Reference only — DC income tax is the state file | published |
| custom | Any other place | User `customLocalPercent` / `customLocalRatePct` on gross wages | user-entered |

Structured `localTaxes[]` includes `residency: "resident" | "nonresident"`, period amounts, `rateOrNote`, and source labels. Stub why-text also names resident vs nonresident.

## State payroll programs that are live (employee, W-2)

California SDI; New York DBL + PFL; Washington PFML + WA Cares; Oregon statewide transit; Colorado FAMLI; Connecticut Paid Leave. Rates are sourced in `data/state-payroll-2026.json`. If a program were present without a sourced `employeeRate`, the engine warns and does **not** invent a silent $0 line.

## Known limitations

- Not an employer payroll system, Pub 15-T table lookup, resident return, or Schedule C / 1040-ES.
- Multi-state / remote splits: tax primary resident state only; warning `"Work-state/resident-state split is simplified."` — no invented multi-state liability or credits.
- Work ≠ resident state: reciprocity or simplified single-state warning; no second return or credit math.
- States marked estimated in the state file (phaseouts, federal-tax deductions omitted, etc.): AL, AZ, AR, CT, ID, ME, MN, MS, MO, SC, UT, WI among others — see README.
- New York tax-benefit recapture above the high brackets is not fully modeled.
- QBI deduction omitted in contractor mode.
- Ohio city credit when living in one city and working in another is not modeled (only the selected city applies).
- Most U.S. cities/counties are not in the named list — use custom percent.

## Figures / programs still needing verification (rates not invented)

These are documented as **not modeled** on purpose; the engine does not invent employee rates for them:

- New Jersey TDI and FLI
- Rhode Island TDI
- Hawaii TDI
- Massachusetts PFML
- Oregon PFMLI (Paid Leave Oregon)
- Maine PFML
- Minnesota paid leave
- Delaware PFML
- District of Columbia paid family leave (employer-paid)
- Employer SUTA (optional rate on employer-cost tool only)
- Pittsburgh local services tax ($52)
- Indiana counties other than Marion — confirm current LIT chart before hard-coding
- Maryland counties other than Montgomery / Baltimore City
- Remaining estimated *state* files (phaseouts / conformity): AL, AZ, AR, CT, ID, ME, MN, MS, MO, SC, UT, WI — engine warns when selected

Custom local percent is the supported escape hatch for unsourced locals; payroll programs without a sourced rate warn instead of fabricating a withholding amount.


## Quiet-$0 policy (integrity)

- A local with `placeholder: true`, `todo`, or missing/invalid `confidence` / `source` is **not modeled**: the engine emits a warning and adds no local tax line (never a silent $0 that looks calculated).
- Known employee payroll programs without sourced rates live in `notModeledPrograms` and produce an explicit warning when that state is selected.
- States with no wage income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY) stay at $0 state income tax with a sourced “No wage income tax” label.
- Schema check: `assertTaxDataIntegrity(tables)` (covered by `npm test`).
- Rate inventory and citations: see `TAX_DATA_SOURCES.md`.
