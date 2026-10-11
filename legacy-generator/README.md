# LocalTakehome

A private U.S. take-home pay calculator for tax year 2026. Federal income tax, Social Security, Medicare, state income tax, a short list of local taxes, and a few state payroll premiums. The estimate runs in the browser. Nothing you type is uploaded.

This is an educational estimate. It is not an employer payroll system, not a resident return, and not IRS certified. It does not promise an exact paycheck.

## Run it

```bash
npm test          # engine fixtures
npm run build     # writes dist/
npm start         # serves dist/ at http://127.0.0.1:43123
```

`npm run dev` builds, then serves. Publish the `dist/` directory on Cloudflare Pages or any static host. There is no required backend and no npm dependency at runtime. Node is only used to compile state data, build HTML, and run tests.

`npm run data` regenerates `data/states-2026.json` from `scripts/compile-states.mjs`. Edit the script, not the generated JSON.

## What the engine does

`calculateTakeHome(input, tables)` in `src/js/engine.mjs` is a pure function. It annualizes pay, computes each tax on the year, rounds to the cent, and divides by 52, 26, 24, or 12. The stub’s year column is that paycheck times the number of checks, so the columns add. Extra W-4 withholding is per paycheck and is not run through the brackets.

Traditional 401(k), 403(b), and TSP deferrals reduce federal income tax and most state income taxes. They do not reduce Social Security or Medicare wages. HSA contributions and Section 125 health, dental, vision, and commuter premiums reduce income-tax wages and FICA wages. Pennsylvania and New Jersey do not deduct retirement deferrals from state wages. Philadelphia and Detroit local taxes are computed on gross wages, not after a 401(k).

## Modeled vs estimated

**Federal and FICA are modeled from published 2026 figures.**

- Standard deduction: single and married filing separately $16,100; married filing jointly $32,200; head of household $24,150. Source: IRS Rev. Proc. 2025-32.
- Single brackets: 10% to $12,400; 12% to $50,400; 22% to $105,700; 24% to $201,775; 32% to $256,225; 35% to $640,600; 37% above that. Joint, separate, and head-of-household schedules are in `data/federal-2026.json`.
- Social Security 6.2% up to a $184,500 wage base (employee maximum $11,439). Medicare 1.45% with no cap. Additional Medicare 0.9% on wages above $200,000 single or head of household, $250,000 married filing jointly, and $125,000 married filing separately. At exactly $200,000 of single wages, Additional Medicare is $0.
- The federal method is an annualized bracket estimate, not a full Publication 15-T wage-bracket lookup. The W-4 Step 2 checkbox uses half the standard deduction and half-width brackets. That is an approximation.

**State wage tax is in the file for all 50 states and D.C.** The main source is the Tax Foundation table of rates and brackets as of January 1, 2026. Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, and Wyoming have no wage tax. Washington’s capital-gains tax is not applied to a paycheck.

States marked `estimated` because a phaseout, a conformity question, or a federal-tax deduction is incomplete: Alabama, Arizona, Arkansas, Connecticut, Idaho, Maine, Minnesota, Mississippi, Missouri, South Carolina, Utah, and Wisconsin. Alabama and Missouri run high because a deduction for federal income tax is omitted. Special cases that are coded, and still simplified, include Utah’s credit, Ohio’s exemption tiers, Connecticut’s exemption phaseout, and the Illinois and Maryland exemption phaseouts. New York’s benefit recapture is not fully modeled above the 6.85% threshold.

**State payroll that is modeled** (employee, W-2 only, on FICA wages): California SDI 1.3% with no cap; New York disability 0.5% capped at $31.20 a year; New York Paid Family Leave 0.432% up to a $95,348.76 wage base; Washington PFML and WA Cares; Oregon statewide transit 0.1%; Colorado FAMLI; Connecticut PFML. Not modeled, on purpose: New Jersey TDI and FLI, Rhode Island TDI, Hawaii TDI, Massachusetts PFML, Oregon PFMLI, and several newer paid-leave programs. FUTA on the employer tool is 0.6% of the first $7,000 ($42). State unemployment is included only if you type a rate.

**Contractor mode** drops employee FICA and those state payroll lines, charges self-employment tax on 92.35% of profit after expenses, and deducts half of the 12.4% and 2.9% portions before income tax. The qualified business income deduction is not included. It is not a Schedule C.

## Local taxes that are live

A local tax is added only when that place is selected, or when you type a custom percent. New York City is never applied to the rest of New York.

| Place | Treatment | Confidence |
| --- | --- | --- |
| New York City | Resident brackets 3.078% to 3.876% of an approximated New York taxable income. Off if you only work there. | Modeled |
| Yonkers | Resident surcharge 16.75% of New York State tax. Nonresident 0.5% of wages. | Modeled |
| Philadelphia | Resident earned income tax 3.74%. Nonresident 3.43%. Pre-tax retirement does not reduce the base. | Published (city announcement, rates effective July 1, 2025) |
| Pittsburgh | Resident 3%, nonresident 1%. Local services tax is not included. | Estimated |
| Detroit | Resident 2.4%, nonresident 1.2%, on gross wages. | Published |
| Columbus and Cleveland | 2.5% for residents and nonresidents. Pre-tax retirement does reduce the Ohio municipal base in this model. | Published |
| Montgomery County and Baltimore City | 3.20% of Maryland taxable income for residents. The nonresident switch uses 2.25%. | Published (resident rate) |
| Marion County, Indiana | 2.02%, carried from the 2025 certified chart. | Estimated — confirm the current Department of Revenue chart |
| Portland / Multnomah County | Metro supportive housing 1% and Preschool for All 1.5% above $125,000 single or $200,000 joint, plus another 1.5% above $250,000 / $400,000. Resident only. | Estimated |
| District of Columbia | The income tax is the state file. There is no second city layer. | Published |
| Anywhere else | Custom local percent, applied to gross wages, replaces a named city. | Whatever you type |

## Fixture results

Single filer, biweekly, no extra deductions unless noted. Annual net is the engine total. Tests in `tests/engine.test.mjs` lock these.

| Scenario | Federal | FICA | State | Local | Annual net | Biweekly net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| $60,000 Texas | $5,020 | $4,590 | $0 | $0 | $50,390 | $1,938.07 |
| $85,000 California, with SDI | $9,870 | $6,502.50 | $3,675.42 + $1,105 SDI | $0 | $63,847.08 | $2,455.66 |
| $85,000 NYC resident | $9,870 | $6,502.50 | $3,993 + $398.40 NY payroll | $2,859.69 | $61,376.41 | $2,360.63 |
| $75,000 Philadelphia resident | $7,670 | $5,737.50 | $2,302.50 | $2,805 | $56,485 | $2,172.50 |
| $20/hr, 40 hours, Florida ($41,600) | $2,812 | $3,182.40 | $0 | $0 | $35,605.60 | $1,369.45 |
| $120,000 Texas, 10% traditional 401(k) | $14,930 | $9,180 | $0 | $0 | $83,890 | $3,226.54 |
| $200,000 California | $36,734 | $14,339 | $14,370.42 + $2,600 SDI | $0 | $131,956.58 | $5,075.25 |

The 401(k) case keeps FICA wages at $120,000. Federal wages fall to $108,000. Additional Medicare on the $200,000 California case is $0. A $5,000 bonus on a $70,000 New York salary (city not selected) increases federal tax by $1,100 under both the aggregate method and a flat 22% supplemental withholding in this bracket, plus New York State tax and FICA on the bonus.

## Add a city

1. Add a jurisdiction object to `data/local-2026.json` with an id, state, method, rates, source URL, `lastVerified`, and `confidence`.
2. Optional page: copy an object in `src/content/locations.mjs`. The intro should be unique, about 150–250 words, with its own FAQ.
3. `npm test && npm run build`.

The calculator picks up a new JSON record without a new page. The city appears in the dropdown for that state only.

## Sources

Cited again inside each JSON file, with `lastVerified` of September 27, 2026.

- IRS, tax year 2026 inflation adjustments, Rev. Proc. 2025-32: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
- SSA contribution and benefit base: https://www.ssa.gov/oact/cola/cbb.html
- Tax Foundation, state individual income tax rates and brackets, 2026: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
- California EDD, SDI contribution rates
- City of Philadelphia wage tax announcement, rates effective July 1, 2025
- New York State, NYC and Yonkers tax pages
- Maryland Comptroller, Withholding Tax Facts 2026

The longer explanation, the fixture table, and the correction note are on `/methodology`.
