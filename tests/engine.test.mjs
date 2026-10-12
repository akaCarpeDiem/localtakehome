/**
 * Engine tests. Every expected figure here was worked out by hand from the
 * published 2026 schedules (the arithmetic is in the comments), not copied
 * from the engine's output.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  PERIODS,
  assertTaxDataIntegrity,
  bracketTax,
  calculateEmployerCost,
  calculateTakeHome,
  compareBonus,
  grossForNet,
  keepOfNext,
  localIsSourced,
  marginalRate,
  money,
  normalizeInput,
  stateIncomeTax,
} from "../src/js/engine.mjs";
import { loadTables } from "../scripts/lib/tables.mjs";

const tables = loadTables();

function calc(overrides) {
  return calculateTakeHome({ payType: "salary", frequency: "biweekly", filingStatus: "single", ...overrides }, tables);
}

function near(actual, expected, tolerance = 0.011) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected} ± ${tolerance}, got ${actual}`);
}

function stateTax(state, gross, extra = {}) {
  return calc({ grossAnnual: gross, state, ...extra }).annual.stateIncome;
}

function localTotal(result) {
  return result.annual.local;
}

/* ───────────── data files ───────────── */

test("tax tables pass the integrity check", () => {
  assert.deepEqual(assertTaxDataIntegrity(tables), []);
});

test("integrity check catches a placeholder local, a bad bracket order and an unknown rule", () => {
  const broken = structuredClone(tables);
  broken.local.jurisdictions.push({ id: "x", name: "X", state: "TX", method: "flat", residentRate: 0, placeholder: true, confidence: "published" });
  broken.states.states.find((s) => s.id === "CA").brackets.single[2].over = 1;
  broken.states.states.find((s) => s.id === "NY").rule = "NOPE";
  const errors = assertTaxDataIntegrity(broken).join("\n");
  assert.match(errors, /local: x marked placeholder/);
  assert.match(errors, /states: CA brackets for single are not ascending/);
  assert.match(errors, /states: NY names rule NOPE/);
});

test("all 51 jurisdictions are present, dated and sourced; nine have no wage tax", () => {
  const states = tables.states.states;
  assert.equal(states.length, 51);
  const none = states.filter((s) => !s.wageTax).map((s) => s.id).sort();
  assert.deepEqual(none, ["AK", "FL", "NH", "NV", "SD", "TN", "TX", "WA", "WY"]);
  for (const id of none) assert.equal(stateTax(id, 250000), 0);
  for (const s of states) {
    assert.match(s.lastVerified, /^2026-/);
    assert.ok(s.sources.length >= 1, `${s.id} has a source`);
  }
});

/* ───────────── federal ───────────── */

test("federal: $60,000 single", () => {
  // 60,000 - 16,100 = 43,900 taxable. 10% x 12,400 = 1,240; 12% x 31,500 = 3,780. Total 5,020.
  near(bracketTax(43900, tables.federal.brackets.single), 5020);
  const r = calc({ grossAnnual: 60000, state: "TX" });
  near(r.annual.federalIncome, 5020);
  near(r.annual.socialSecurity, 3720); // 6.2%
  near(r.annual.medicare, 870); // 1.45%
  near(r.annual.net, 50390);
  near(r.periodNet, 1938.07, 0.02);
  assert.equal(r.federalMarginalRate, 0.12);
});

test("federal: $85,000 single reaches the 22% bracket", () => {
  // 68,900 taxable: 1,240 + 12% x 38,000 (4,560) + 22% x 18,500 (4,070) = 9,870
  near(calc({ grossAnnual: 85000, state: "TX" }).annual.federalIncome, 9870);
});

test("federal: filing status changes the standard deduction and brackets", () => {
  // MFJ 100,000: 67,800 taxable: 10% x 24,800 = 2,480; 12% x 43,000 = 5,160. Total 7,640.
  near(calc({ grossAnnual: 100000, state: "TX", filingStatus: "mfj" }).annual.federalIncome, 7640);
  // HoH 85,000: 60,850 taxable: 10% x 17,700 = 1,770; 12% x 43,150 = 5,178. Total 6,948.
  near(calc({ grossAnnual: 85000, state: "TX", filingStatus: "hoh" }).annual.federalIncome, 6948);
});

test("federal: Social Security stops at the $184,500 wage base; Additional Medicare starts at $200,000 single", () => {
  const r = calc({ grossAnnual: 250000, state: "TX" });
  near(r.annual.socialSecurity, 11439); // 184,500 x 6.2%
  near(r.annual.medicare, 3625);
  near(r.annual.additionalMedicare, 450); // 50,000 x 0.9%
  assert.ok(r.lines.some((line) => line.id === "addl"));
  const under = calc({ grossAnnual: 200000, state: "TX" });
  assert.equal(under.annual.additionalMedicare, 0);
  assert.ok(!under.lines.some((line) => line.id === "addl"));
  // Joint filers: threshold is $250,000.
  assert.equal(calc({ grossAnnual: 250000, state: "TX", filingStatus: "mfj" }).annual.additionalMedicare, 0);
});

test("federal: traditional 401(k) cuts income tax but not Social Security or Medicare; health premiums cut both", () => {
  const r = calc({ grossAnnual: 120000, state: "TX", deductions: { traditional401k: { mode: "percent", value: 10 } } });
  // Federal wages 108,000; taxable 91,900: 1,240 + 4,560 + 22% x 41,500 (9,130) = 14,930
  near(r.annual.federalIncome, 14930);
  near(r.annual.socialSecurity, 7440);
  near(r.annual.net, 120000 - 12000 - 14930 - 7440 - 1740);
  const h = calc({ grossAnnual: 60000, state: "TX", deductions: { health: 3000 } });
  near(h.annual.ficaWages, 57000);
  near(h.annual.federalIncome, 5020 - 360); // 3,000 x 12%
});

test("federal: child tax credit of $2,200 per child and $500 per other dependent", () => {
  // MFJ 100,000: 7,640 before credits; two children = 4,400 -> 3,240.
  const r = calc({ grossAnnual: 100000, state: "TX", filingStatus: "mfj", childrenUnder17: 2 });
  near(r.annual.federalIncome, 3240);
  near(r.annual.childCredit, 4400);
  // The credit cannot take the tax below zero in this estimate (the refundable part is not paid through paychecks).
  const low = calc({ grossAnnual: 40000, state: "TX", filingStatus: "mfj", childrenUnder17: 3 });
  assert.equal(low.annual.federalIncome, 0);
  // Phase-out: $50 per $1,000 over $200,000 single. At 220,000: 2,200 - 20 x 50 = 1,200.
  const high = calc({ grossAnnual: 220000, state: "TX", childrenUnder17: 1 });
  const none = calc({ grossAnnual: 220000, state: "TX" });
  near(none.annual.federalIncome - high.annual.federalIncome, 1200);
  // Other dependent: $500.
  const other = calc({ grossAnnual: 100000, state: "TX", filingStatus: "mfj", otherDependents: 1 });
  near(other.annual.federalIncome, 7140);
});

test("federal: overtime premium deduction for an hourly worker", () => {
  // $30 x 40 x 52 = 62,400 regular; overtime 5 h x $45 x 52 = 11,700. Gross 74,100.
  // Premium (the half in time-and-a-half): $15 x 5 x 52 = 3,900.
  // Taxable 74,100 - 16,100 - 3,900 = 54,100: 1,240 + 4,560 + 22% x 3,700 (814) = 6,614
  const r = calc({ payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5, state: "TX" });
  near(r.annual.gross, 74100);
  near(r.annual.overtimePremium, 3900);
  near(r.annual.overtimeDeduction, 3900);
  near(r.annual.federalIncome, 6614);
  // Social Security and Medicare still apply to all of it.
  near(r.annual.socialSecurity, 74100 * 0.062);
  // Switched off: 54,100 + 3,900 = 58,000 taxable -> 6,614 + 858
  const off = calc({ payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5, state: "TX", workerDeductions: false });
  near(off.annual.federalIncome, 7472);
});

test("federal: tips deduction is capped at $25,000 and unavailable when married filing separately", () => {
  // 30,000 wages + 30,000 tips; taxable = 60,000 - 16,100 - 25,000 = 18,900: 1,240 + 12% x 6,500 = 2,020
  const r = calc({ grossAnnual: 30000, tipsAnnual: 30000, state: "TX" });
  near(r.annual.tipsDeduction, 25000);
  near(r.annual.federalIncome, 2020);
  const mfs = calc({ grossAnnual: 30000, tipsAnnual: 30000, state: "TX", filingStatus: "mfs" });
  assert.equal(mfs.annual.tipsDeduction, 0);
  near(mfs.annual.federalIncome, 5020);
  assert.ok(mfs.notes.some((note) => /married people filing separately/.test(note)));
});

test("federal: overtime deduction phases out above $150,000 single", () => {
  // Salary 160,000 with 12,500 of premium entered. Reduction: 10 x $100 = 1,000 -> 11,500 allowed.
  const r = calc({ grossAnnual: 160000, overtimePremiumAnnual: 12500, state: "TX" });
  near(r.annual.overtimeDeduction, 11500);
});

test("federal: the multiple-jobs box halves the standard deduction and brackets", () => {
  // 60,000 - 8,050 = 51,950. Half brackets: 10% x 6,200 = 620; 12% x 19,000 = 2,280; 22% x 26,750 = 5,885. Total 8,785.
  const r = calc({ grossAnnual: 60000, state: "TX", w4: { multipleJobs: true } });
  near(r.annual.federalIncome, 8785);
});

test("federal: extra withholding is added to every paycheck", () => {
  const base = calc({ grossAnnual: 60000, state: "TX" });
  const extra = calc({ grossAnnual: 60000, state: "TX", w4: { extraWithholdingPerPeriod: 50 } });
  near(base.annual.net - extra.annual.net, 1300);
  near(base.periodNet - extra.periodNet, 50, 0.02);
});

test("contractor: self-employment tax on 92.35% of profit and half of it deducted", () => {
  // 85,000 x 0.9235 = 78,497.50. SS 12.4% = 9,733.69; Medicare 2.9% = 2,276.43. Half = 6,005.06.
  // Income-tax wages 78,994.94; taxable 62,894.94: 1,240 + 4,560 + 22% x 12,494.94 = 8,548.89
  const r = calc({ grossAnnual: 85000, state: "TX", employment: "contractor" });
  near(r.annual.socialSecurity, 9733.69);
  near(r.annual.medicare, 2276.43);
  near(r.annual.federalIncome, 8548.89, 0.02);
  assert.ok(r.quarterlySetAside > 0);
  assert.ok(r.warnings.some((w) => /Schedule C/.test(w)));
  assert.equal(r.statePayrollTaxes.length, 0);
});

/* ───────────── states: flat and simple ───────────── */

test("flat-rate states", () => {
  near(stateTax("PA", 60000), 1842); // 3.07%, no deductions
  near(stateTax("IL", 60000), (60000 - 2925) * 0.0495);
  near(stateTax("IN", 60000), (60000 - 1000) * 0.0295);
  near(stateTax("GA", 60000), 2245.5); // (60,000 - 15,000) x 4.99%
  near(stateTax("CO", 60000), (60000 - 16100) * 0.044);
  near(stateTax("MA", 60000), (60000 - 4400) * 0.05);
  near(stateTax("AZ", 60000), (60000 - 15750) * 0.025);
  near(stateTax("LA", 60000), (60000 - 12875) * 0.03);
});

test("Georgia: joint deduction and $5,000 per dependent", () => {
  near(stateTax("GA", 100000, { filingStatus: "mfj", dependentsCount: 2 }), 2994); // (100,000 - 30,000 - 10,000) x 4.99%
});

test("Illinois: the exemption disappears above $250,000", () => {
  near(stateTax("IL", 260000, { dependentsCount: 1 }), 12870);
});

test("Pennsylvania and New Jersey treat 401(k) differently", () => {
  const pa = calc({ grossAnnual: 60000, state: "PA", deductions: { traditional401k: 5000 } });
  near(pa.annual.stateWages, 60000);
  near(pa.annual.stateIncome, 1842);
  // New Jersey excludes 401(k) deferrals but not HSA contributions.
  // 85,000 - 5,000 = 80,000; less the $1,000 exemption = 79,000.
  // 1.4% x 20,000 = 280; 1.75% x 15,000 = 262.50; 3.5% x 5,000 = 175; 5.525% x 35,000 = 1,933.75; 6.37% x 4,000 = 254.80
  const nj = calc({ grossAnnual: 85000, state: "NJ", deductions: { traditional401k: 5000, hsa: 2000 } });
  near(nj.annual.stateWages, 80000);
  near(nj.annual.stateIncome, 2906.05);
});

/* ───────────── states: graduated ───────────── */

test("California: 2026 schedule, exemption credits and the 1% surtax over $1,000,000", () => {
  // 85,000 - 5,900 = 79,100.
  // 114.56 + 314.02 + 628.16 + 998.22 + 1,255.92 + 9.3% x 3,903 (362.98) = 3,673.86; less $158 credit.
  near(stateTax("CA", 85000), 3515.86);
  // Joint, two dependents: 188,200 taxable -> 10,137.72 less 316 and 2 x 491.
  near(stateTax("CA", 200000, { filingStatus: "mfj", dependentsCount: 2 }), 8839.72);
  const big = calc({ grossAnnual: 1500000, state: "CA" });
  const withoutSurtax = bracketTax(1494100, tables.states.states.find((s) => s.id === "CA").brackets.single) - 158;
  near(big.annual.stateIncome, withoutSurtax + 4941, 0.02); // 1% x 494,100
});

test("California: head of household uses its own schedule and HSA contributions stay in state wages", () => {
  const hoh = stateTax("CA", 85000, { filingStatus: "hoh" });
  // 85,000 - 11,800 = 73,200: 1% x 22,927 = 229.27; 2% x 31,389 = 627.78; 4% x 15,702 = 628.08; 6% x 3,182 = 190.92 = 1,676.05 - 158
  near(hoh, 1518.05);
  const hsa = calc({ grossAnnual: 85000, state: "CA", deductions: { hsa: 3000 } });
  near(hsa.annual.stateWages, 85000);
  near(hsa.annual.federalWages, 82000);
});

test("New York: 2026 rates, and the recapture above $107,650", () => {
  // 85,000 - 8,000 = 77,000: 331.50 + 140.80 + 113.30 + 5.4% x 63,100 (3,407.40) = 3,993.00
  near(stateTax("NY", 85000), 3993);
  // 150,000: taxable 142,000 -> 7,809.75 from the schedule.
  // Recapture: (5.9% x 142,000 - 7,809.75) x (150,000 - 107,650) / 50,000 = 568.25 x 0.847 = 481.31
  near(stateTax("NY", 150000), 8291.06);
  // 250,000: schedule 13,962.45; recapture 568.25 + 2,046.30 x (250,000 - 215,400) / 50,000 = 1,984.29
  near(stateTax("NY", 250000), 15946.74);
  // Joint 300,000: taxable 283,950 -> 15,612.80; recapture 332.50 + 807.75 = 1,140.25
  near(stateTax("NY", 300000, { filingStatus: "mfj" }), 16753.05);
});

test("Connecticut: exemption, add-back, recapture and the personal credit", () => {
  // 50,000: exemption fully phased out. 2% x 10,000 + 4.5% x 40,000 = 2,000; 10% credit -> 1,800.
  near(stateTax("CT", 50000), 1800);
  // 120,000: 200 + 1,800 + 2,750 + 1,200 = 5,950; add-back 250; recapture 3 x 25 = 75.
  near(stateTax("CT", 120000), 6275);
  // Joint 250,000: 400 + 3,600 + 5,500 + 3,000 = 12,500; add-back 500; recapture 4 x 50 = 200.
  near(stateTax("CT", 250000, { filingStatus: "mfj" }), 13200);
  // 30,000 single: exemption 15,000 -> 15,000 taxable: 200 + 225 = 425; credit 15% (AGI 26,500-31,300) -> 361.25
  near(stateTax("CT", 30000), 361.25);
});

test("Ohio: nothing under $26,050, then $332 plus 2.75%", () => {
  assert.equal(stateTax("OH", 25000), 0);
  // 60,000 - 2,150 exemption = 57,850: 332 + 2.75% x 31,800 = 1,206.50
  near(stateTax("OH", 60000), 1206.5);
});

test("Oregon: federal tax subtraction and the exemption credit", () => {
  // Federal tax 5,020 is subtracted: 60,000 - 2,910 - 5,020 = 52,070.
  // 4.75% x 4,550 = 216.13; 6.75% x 6,850 = 462.38; 8.75% x 40,670 = 3,558.63; less $263.
  near(stateTax("OR", 60000), 3974.13, 0.02);
  // 132,000: subtraction limited to 5,250 and no credit above $100,000. Taxable 123,840 -> 10,517.
  near(stateTax("OR", 132000), 10517, 0.02);
});

test("Wisconsin: sliding standard deduction", () => {
  // SD = 13,960 - 12% x (60,000 - 20,120) = 9,174.40; exemption 700; taxable 50,125.60
  // 3.5% x 15,110 = 528.85; 4.4% x 35,015.60 = 1,540.69
  near(stateTax("WI", 60000), 2069.54);
  // Joint, two dependents: SD 13,783.33; exemptions 2,800; taxable 73,416.67 -> 705.25 + 2,160.84 + 220.30
  near(stateTax("WI", 90000, { filingStatus: "mfj", dependentsCount: 2 }), 3086.39, 0.02);
});

test("South Carolina: income adjusted deduction and two rates", () => {
  // Deduction 15,000 less 5,450 (20,000 / 55,000 of it, rounded down to $10) = 9,550. Taxable 50,450.
  // 1.99% x 30,000 = 597; 5.21% x 20,450 = 1,065.45
  near(stateTax("SC", 60000), 1662.45);
  near(stateTax("SC", 35000), 398); // 20,000 x 1.99%
});

test("Arkansas: tax table with the bracket adjustment", () => {
  near(stateTax("AR", 60000), 57530 * 0.037 - 367.16 - 29);
  // 98,500 - 2,470 = 96,030: 3.7% less (369.90 - 13 x 10 = 239.90), less $29 credit
  near(stateTax("AR", 98500), 3284.21);
});

test("Utah: 4.45% less the taxpayer credit", () => {
  // 2,670 - (6% x 16,100 - 1.3% x 41,304) = 2,670 - 429.05
  near(stateTax("UT", 60000), 2240.95);
  near(stateTax("UT", 90000, { filingStatus: "mfj", dependentsCount: 2 }), 2503.58);
});

test("Alabama: sliding standard deduction and the federal tax deduction", () => {
  // SD 2,500; exemption 1,500; federal tax 5,020 -> taxable 50,980: 10 + 100 + 5% x 47,980
  near(stateTax("AL", 60000), 2509);
});

test("Missouri: partial federal tax deduction", () => {
  // 60,000 - 16,100 - 15% x 5,020 (753) = 43,147 -> 262.86 + 4.7% x 33,711
  near(stateTax("MO", 60000), 1847.28);
});

test("Maryland: 2026 deduction and the stepped exemption", () => {
  near(stateTax("MD", 60000), 2484); // 53,400: 90 + 4.75% x 50,400
  near(stateTax("MD", 130000), 5989.5); // exemption 800; 125,800: 90 + 4,607.50 + 1,250 + 42
});

test("Maine: deduction phase-out", () => {
  near(stateTax("ME", 60000), 2372.2); // 39,000: 1,589.20 + 783
  near(stateTax("ME", 140000), 8553.82, 0.02);
});

test("Rhode Island: deduction and exemption phase out in 20% steps", () => {
  near(stateTax("RI", 270000), 12449.31, 0.02);
});

test("New Mexico: dependent deduction skips the first dependent", () => {
  const r = calc({ grossAnnual: 80000, state: "NM", filingStatus: "mfj", dependentsCount: 3 });
  near(r.annual.stateTaxable, 39800);
});

test("Arizona follows the federal overtime deduction", () => {
  const r = calc({ payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5, state: "AZ" });
  near(r.annual.stateTaxable, 74100 - 15750 - 3900);
  near(r.annual.stateIncome, 1361.25);
});

test("states that follow the federal tips and overtime deductions", () => {
  // $30 x 40 x 52 = 62,400 plus 5 h x $45 x 52 = 11,700 of overtime: 74,100, of which 3,900 is premium.
  const hourly = { payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5 };
  // Oregon: 74,100 - 2,910 - 6,614 federal tax - 3,900 = 60,676.
  // 216.13 + 462.38 + 8.75% x 49,276 (4,311.65) = 4,990.15, less the $263 credit.
  near(calc({ ...hourly, state: "OR" }).annual.stateIncome, 4727.15, 0.02);
  // Indiana (2026 only), and its counties: (74,100 - 1,000 - 3,900) = 69,200 at 2.95% and Marion County's 2.02%.
  const indiana = calc({ ...hourly, state: "IN", localId: "marion-in" });
  near(indiana.annual.stateIncome, 2041.4);
  near(indiana.annual.local, 1397.84);
  // Switching the federal deductions off removes the state deduction too.
  near(calc({ ...hourly, state: "IN", workerDeductions: false }).annual.stateIncome, 73100 * 0.0295);
  for (const id of ["AZ", "ID", "IA", "MI", "MT", "ND", "OR", "IN"]) {
    const withIt = calc({ ...hourly, state: id }).annual.stateIncome;
    const without = calc({ ...hourly, state: id, workerDeductions: false }).annual.stateIncome;
    assert.ok(withIt < without, `${id} should tax less when the overtime premium is deducted`);
  }
  // A state that does not follow: the same tax either way.
  assert.equal(calc({ ...hourly, state: "IL" }).annual.stateIncome, calc({ ...hourly, state: "IL", workerDeductions: false }).annual.stateIncome);
});

test("Colorado follows the tips deduction but not the overtime one", () => {
  // 74,100 of wages (3,900 overtime premium) plus 5,000 of tips = 79,100.
  // Colorado taxable income: 79,100 - 16,100 - 5,000 tips = 58,000 at 4.4%.
  const r = calc({ payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5, tipsAnnual: 5000, state: "CO" });
  near(r.annual.stateTaxable, 58000);
  near(r.annual.stateIncome, 2552);
});

test("Georgia excludes up to $1,750 of tips and $1,750 of overtime premium", () => {
  // 30,000 wages + 10,000 tips: 40,000 - 15,000 - 1,750 = 23,250 at 4.99%.
  near(calc({ grossAnnual: 30000, tipsAnnual: 10000, state: "GA" }).annual.stateIncome, 23250 * 0.0499);
  // Overtime premium of 3,900: only 1,750 comes off.
  const r = calc({ payType: "hourly", hourlyRate: 30, hoursPerWeek: 40, overtimeHoursPerWeek: 5, state: "GA" });
  near(r.annual.stateTaxable, 74100 - 15000 - 1750);
});

test("Colorado caps the deduction above $300,000", () => {
  near(stateTax("CO", 400000), 17072); // (400,000 - 12,000) x 4.4%
});

test("head of household never falls back to the single schedule where the state has its own", () => {
  for (const id of ["CA", "NY", "CT", "ME", "NJ", "MD", "OR", "MN", "VT"]) {
    const single = stateTax(id, 120000);
    const hoh = stateTax(id, 120000, { filingStatus: "hoh" });
    assert.ok(hoh < single, `${id}: head of household (${hoh}) should owe less than single (${single})`);
  }
});

test("stateIncomeTax returns the steps used to show the math", () => {
  const state = tables.states.states.find((s) => s.id === "OR");
  const out = stateIncomeTax(state, { wages: 60000, status: "single", dependents: 0, federalTax: 5020, federal: tables.federal });
  const labels = out.steps.map((step) => step.label);
  assert.ok(labels.includes("Wages taxed by the state"));
  assert.ok(labels.some((label) => /Federal income tax/.test(label)));
  assert.equal(out.steps.at(-1).label, "Oregon income tax");
  near(out.steps.at(-1).amount, 3974.13, 0.02);
});

/* ───────────── state payroll programs ───────────── */

test("state payroll lines", () => {
  near(calc({ grossAnnual: 85000, state: "CA" }).annual.statePayroll, 1105); // SDI 1.3%, no cap
  // New Jersey at 85,000: UI/WF 190.40 (capped at 44,800) + TDI 0.19% + FLI 0.23%
  near(calc({ grossAnnual: 85000, state: "NJ" }).annual.statePayroll, 190.4 + 161.5 + 195.5);
  // New York: disability 31.20 + paid family leave capped at 411.91
  near(calc({ grossAnnual: 150000, state: "NY" }).annual.statePayroll, 443.11);
  near(calc({ grossAnnual: 60000, state: "PA" }).annual.statePayroll, 42); // 0.07%
  near(calc({ grossAnnual: 60000, state: "OR" }).annual.statePayroll, 420); // 0.6% + 0.1%
  // Washington: paid leave 0.80716% + WA Cares 0.58%
  near(calc({ grossAnnual: 60000, state: "WA" }).annual.statePayroll, 484.3 + 348, 0.02);
  // Colorado FAMLI stops at the Social Security wage base
  near(calc({ grossAnnual: 400000, state: "CO" }).annual.statePayroll, 811.8);
  assert.equal(calc({ grossAnnual: 60000, state: "TX" }).annual.statePayroll, 0);
});

test("payroll lines an employer may cover say so", () => {
  const r = calc({ grossAnnual: 60000, state: "MA" });
  const pfml = r.statePayrollTaxes.find((line) => line.id === "ma-pfml");
  assert.ok(pfml.upTo);
  near(pfml.annual, 276); // 0.46%
});

/* ───────────── local ───────────── */

test("New York City: resident tax on New York taxable income, never applied outside the city", () => {
  // 77,000 taxable: 369.36 + 489.06 + 954.75 + 3.876% x 27,000 (1,046.52) = 2,859.69
  const nyc = calc({ grossAnnual: 85000, state: "NY", localId: "nyc" });
  near(localTotal(nyc), 2859.69);
  assert.equal(localTotal(calc({ grossAnnual: 85000, state: "NY" })), 0);
  // Working in the city without living there adds nothing.
  const commuter = calc({ grossAnnual: 85000, state: "NY", localId: "nyc", livesInPlace: false });
  assert.equal(localTotal(commuter), 0);
  // A New York City selection with another state is ignored.
  assert.equal(localTotal(calc({ grossAnnual: 85000, state: "TX", localId: "nyc" })), 0);
});

test("Yonkers: surcharge on state tax for residents, 0.5% of wages for nonresidents", () => {
  const res = calc({ grossAnnual: 85000, state: "NY", localId: "yonkers" });
  near(localTotal(res), 3993 * 0.1675, 0.02);
  const non = calc({ grossAnnual: 85000, state: "NY", localId: "yonkers", livesInPlace: false });
  near(localTotal(non), 425);
});

test("Philadelphia: July 2026 rates on gross wages", () => {
  near(localTotal(calc({ grossAnnual: 75000, state: "PA", localId: "philadelphia" })), 2801.25);
  near(localTotal(calc({ grossAnnual: 75000, state: "PA", localId: "philadelphia", livesInPlace: false })), 2568.75);
  // Neither 401(k) nor pre-tax health premiums reduce it.
  const withBenefits = calc({ grossAnnual: 75000, state: "PA", localId: "philadelphia", deductions: { traditional401k: 5000, health: 3000 } });
  near(localTotal(withBenefits), 2801.25);
});

test("Pittsburgh: 3% on Pennsylvania wages plus the $52 Local Services Tax", () => {
  const r = calc({ grossAnnual: 60000, state: "PA", localId: "pittsburgh", deductions: { traditional401k: { mode: "percent", value: 5 }, health: 3000 } });
  // 401(k) stays in, the health premium comes out: 57,000 x 3% = 1,710
  near(localTotal(r), 1762);
  assert.ok(r.localTaxes.some((line) => line.id === "pittsburgh-lst" && line.annual === 52));
  // Under $12,000 there is no Local Services Tax.
  const small = calc({ grossAnnual: 10000, state: "PA", localId: "pittsburgh" });
  near(localTotal(small), 300);
});

test("Detroit: federal wages less $600 a person, half rate for nonresidents", () => {
  const input = { grossAnnual: 60000, state: "MI", localId: "detroit", deductions: { traditional401k: 3000 } };
  near(localTotal(calc(input)), (57000 - 600) * 0.024);
  near(localTotal(calc({ ...input, livesInPlace: false })), (57000 - 600) * 0.012);
  near(localTotal(calc({ ...input, filingStatus: "mfj", dependentsCount: 2 })), (57000 - 2400) * 0.024);
});

test("Ohio cities: Medicare wages, so 401(k) stays in and health premiums come out", () => {
  const r = calc({ grossAnnual: 60000, state: "OH", localId: "columbus-oh", deductions: { traditional401k: 6000, health: 2000 } });
  near(localTotal(r), 1450);
  const non = calc({ grossAnnual: 60000, state: "OH", localId: "columbus-oh", livesInPlace: false });
  near(localTotal(non), 1500);
});

test("Maryland counties: flat, bracketed and tiered, and they follow where you live", () => {
  near(localTotal(calc({ grossAnnual: 60000, state: "MD", localId: "montgomery-md" })), 53400 * 0.032);
  // Anne Arundel: 2.7% x 50,000 + 2.94% x 3,400
  near(localTotal(calc({ grossAnnual: 60000, state: "MD", localId: "anne-arundel-md" })), 1449.96);
  // Frederick: taxable 53,400 falls in the 2.96% tier, charged on all of it
  near(localTotal(calc({ grossAnnual: 60000, state: "MD", localId: "frederick-md" })), 1580.64);
  // Just under the tier: taxable 49,900 -> 2.75%
  near(localTotal(calc({ grossAnnual: 56500, state: "MD", localId: "frederick-md" })), 49900 * 0.0275);
  const worksOnly = calc({ grossAnnual: 60000, state: "MD", localId: "montgomery-md", livesInPlace: false });
  assert.equal(localTotal(worksOnly), 0);
  assert.ok(worksOnly.notes.some((note) => /county where you live/.test(note)));
});

test("Indiana counties: all 92, charged on Indiana taxable income", () => {
  const counties = tables.local.jurisdictions.filter((row) => row.state === "IN");
  assert.equal(counties.length, 92);
  near(localTotal(calc({ grossAnnual: 60000, state: "IN", localId: "marion-in" })), 59000 * 0.0202);
});

test("Portland: nothing under the thresholds, both taxes above them", () => {
  const low = calc({ grossAnnual: 90000, state: "OR", localId: "portland-multnomah" });
  assert.equal(localTotal(low), 0);
  assert.equal(low.localTaxes.length, 2);
  const high = calc({ grossAnnual: 200000, state: "OR", localId: "portland-multnomah" });
  const taxable = high.annual.stateTaxable;
  near(taxable, 200000 - 2910); // no federal tax subtraction at this income
  near(localTotal(high), (taxable - 128000) * 0.01 + (taxable - 125000) * 0.015);
});

test("Denver: a flat $5.75 a month", () => {
  near(localTotal(calc({ grossAnnual: 60000, state: "CO", localId: "denver-co" })), 69);
  assert.equal(localTotal(calc({ grossAnnual: 5000, state: "CO", localId: "denver-co" })), 0);
});

test("Missouri and Kentucky cities", () => {
  // Kansas City: box 1 wages, so the 401(k) comes out
  near(localTotal(calc({ grossAnnual: 60000, state: "MO", localId: "kansas-city-mo", deductions: { traditional401k: 3000 } })), 570);
  near(localTotal(calc({ grossAnnual: 60000, state: "KY", localId: "louisville-ky", deductions: { traditional401k: 3000 } })), 1320);
  near(localTotal(calc({ grossAnnual: 60000, state: "KY", localId: "louisville-ky", livesInPlace: false })), 870);
});

test("a custom local percent replaces the named place", () => {
  const r = calc({ grossAnnual: 60000, state: "PA", localId: "philadelphia", customLocalPercent: 1.5 });
  near(localTotal(r), 900);
  assert.equal(r.localTaxes[0].id, "custom-local");
  near(localTotal(calc({ grossAnnual: 60000, state: "TX", customLocalPercent: 1 })), 600);
});

test("an unknown or unsourced place warns instead of showing a quiet $0", () => {
  const unknown = calc({ grossAnnual: 60000, state: "PA", localId: "nowhere" });
  assert.equal(localTotal(unknown), 0);
  assert.ok(unknown.warnings.length > 0);
  assert.ok(unknown.dataGaps.localNotModeled);
  const patched = structuredClone(tables);
  patched.local.jurisdictions.push({ id: "todo-town", name: "Todo Town", state: "PA", method: "flat", base: "gross", residentRate: 0.01, confidence: "unknown" });
  assert.equal(localIsSourced(patched.local.jurisdictions.at(-1)), false);
  const r = calculateTakeHome({ grossAnnual: 60000, state: "PA", localId: "todo-town" }, patched);
  assert.equal(r.annual.local, 0);
  assert.ok(r.warnings.some((w) => /no sourced 2026 rate/.test(w)));
});

test("the District of Columbia has no second city tax", () => {
  const r = calc({ grossAnnual: 85000, state: "DC", localId: "dc-note" });
  assert.equal(localTotal(r), 0);
  assert.ok(r.annual.stateIncome > 0);
});

/* ───────────── result shape and bookkeeping ───────────── */

test("every line adds up: gross less each line equals take-home, for the year and per paycheck", () => {
  const inputs = [
    { grossAnnual: 85000, state: "CA" },
    { grossAnnual: 123456.78, state: "NY", localId: "nyc", deductions: { traditional401k: { mode: "percent", value: 6 }, health: 2400, hsa: 1500, roth401k: 2000 } },
    { payType: "hourly", hourlyRate: 23.5, hoursPerWeek: 37.5, overtimeHoursPerWeek: 3, state: "OH", localId: "columbus-oh", frequency: "weekly" },
    { grossAnnual: 60000, state: "PA", localId: "pittsburgh", frequency: "semimonthly", w4: { extraWithholdingPerPeriod: 25 } },
    { grossAnnual: 95000, state: "TX", employment: "contractor", contractorExpensesAnnual: 8000, frequency: "monthly" },
  ];
  for (const input of inputs) {
    const r = calc(input);
    const taken = r.lines.filter((line) => !["gross", "net"].includes(line.section));
    const sumAnnual = money(taken.reduce((sum, line) => sum + line.annual, 0));
    near(r.annual.gross - sumAnnual, r.annual.net, 0.02);
    const sumPeriod = money(taken.reduce((sum, line) => sum + line.period, 0));
    near(r.grossPeriod - sumPeriod, r.periodNet, 0.011);
    const chart = r.chart;
    near(chart.keep + chart.federal + chart.fica + chart.state + chart.local + chart.benefits + chart.expenses, chart.gross, 0.03);
  }
});

test("all four pay frequencies split the same year", () => {
  for (const [frequency, periods] of Object.entries(PERIODS)) {
    const r = calc({ grossAnnual: 52000, state: "TX", frequency });
    assert.equal(r.periods, periods);
    near(r.grossPeriod, 52000 / periods, 0.01);
    near(r.periodNet * periods, r.annual.net, periods * 0.06);
  }
});

test("hourly pay: rate x hours x weeks", () => {
  const r = calc({ payType: "hourly", hourlyRate: 20, hoursPerWeek: 40, state: "FL" });
  near(r.annual.gross, 41600);
  // 25,500 taxable: 1,240 + 12% x 13,100 = 2,812
  near(r.annual.federalIncome, 2812);
});

test("rate blocks: each line is hours x its own rate, and overtime lines feed the overtime deduction", () => {
  const r = calc({
    payType: "hourly",
    state: "TX",
    rateBlocks: [
      { label: "Base", hours: 36, rate: 40 },
      { label: "Night OT", hours: 4, rate: 66, overtime: true, differential: true },
    ],
  });
  near(r.annual.gross, (36 * 40 + 4 * 66) * 52);
  near(r.annual.overtimePremium, (4 * 66 * 52) / 3);
  assert.equal(r.lines.filter((line) => line.section === "gross").length, 2);
});

test("the result carries the math, sources and plain flags", () => {
  const r = calc({ grossAnnual: 85000, state: "CA" });
  assert.equal(r.math.federal.at(-1).amount, r.annual.federalIncome);
  assert.equal(r.math.state.at(-1).amount, r.annual.stateIncome);
  assert.ok(r.sources.length >= 3);
  assert.ok(r.sources.every((src) => src.name));
  near(r.keepPer100, (r.annual.net / 85000) * 100);
  assert.equal(r.dataGaps.stateEstimated, false);
  const est = calc({ grossAnnual: 85000, state: "VT" });
  assert.equal(est.dataGaps.stateEstimated, true);
  assert.ok(est.warnings.some((w) => /estimated/.test(w)));
});

test("working in another state: reciprocity is recognised, anything else is flagged", () => {
  const recip = calc({ grossAnnual: 85000, state: "PA", workState: "NJ" });
  assert.ok(recip.warnings.some((w) => /reciprocity agreement/.test(w)));
  const none = calc({ grossAnnual: 85000, state: "CT", workState: "NY" });
  assert.ok(none.warnings.some((w) => /does not work out a New York nonresident return/.test(w)));
});

test("contribution limits produce a warning, not a silent change", () => {
  const r = calc({ grossAnnual: 200000, state: "TX", deductions: { traditional401k: 30000 } });
  assert.ok(r.warnings.some((w) => /employee limit of \$24,500/.test(w)));
  near(r.annual.pretax, 30000);
});

test("zero, blank and absurd inputs never produce NaN", () => {
  for (const input of [{}, { grossAnnual: 0, state: "CA" }, { grossAnnual: "abc", state: "ZZ" }, { payType: "hourly", hourlyRate: 0, hoursPerWeek: 0, state: "NY", localId: "nyc" }, { grossAnnual: 5e9, state: "CA" }, { grossAnnual: -500, state: "OR" }, { grossAnnual: 50000, state: "CT", deductions: { traditional401k: { mode: "percent", value: 400 } } }]) {
    const r = calc(input);
    for (const [key, value] of Object.entries(r.annual)) assert.ok(Number.isFinite(value), `${key} is finite for ${JSON.stringify(input)}`);
    for (const line of r.lines) assert.ok(Number.isFinite(line.period) && Number.isFinite(line.annual));
    assert.ok(Number.isFinite(r.periodNet));
  }
});

test("take-home never falls when pay rises by $5,000, in every state and filing status", () => {
  for (const state of tables.states.states) {
    for (const filingStatus of ["single", "mfj", "hoh", "mfs"]) {
      let last = -1;
      for (let gross = 0; gross <= 600000; gross += 5000) {
        const r = calc({ grossAnnual: gross, state: state.id, filingStatus, dependentsCount: 1 });
        assert.ok(r.annual.stateIncome >= 0);
        assert.ok(r.annual.stateIncome <= gross * 0.14 + 1, `${state.id} ${filingStatus} ${gross}: state tax ${r.annual.stateIncome} is out of range`);
        assert.ok(r.annual.net >= last, `${state.id} ${filingStatus}: net fell between ${gross - 5000} and ${gross}`);
        last = r.annual.net;
      }
    }
  }
});

test("every local place produces a sane figure for residents", () => {
  for (const local of tables.local.jurisdictions) {
    if (local.method === "reference") continue;
    const r = calc({ grossAnnual: 200000, state: local.state, localId: local.id });
    assert.ok(r.annual.local > 0, `${local.id} should produce a local tax at $200,000`);
    assert.ok(r.annual.local < 200000 * 0.05, `${local.id} local tax ${r.annual.local} is too high`);
    assert.ok(r.localTaxes.every((line) => line.source), `${local.id} lines carry a source label`);
  }
});

/* ───────────── helpers ───────────── */

test("normalizeInput accepts the older field names", () => {
  const input = normalizeInput({
    residentState: "ca",
    localId: "nyc",
    contractor: true,
    pretax: { traditional: 1000, healthPremium: 500, other: 50, reducesFica: true },
    posttax: { roth: 200, unionDues: 30 },
    w4: { dependentsAmount: 2000, extraWithholding: 10.004 },
    customLocalRatePct: 250,
  });
  assert.equal(input.state, "CA");
  assert.equal(input.employment, "contractor");
  assert.equal(input.deductions.traditional401k.value, 1000);
  assert.equal(input.deductions.health, 500);
  assert.equal(input.deductions.customPretaxReducesFica, true);
  assert.equal(input.deductions.roth401k.value, 200);
  assert.equal(input.deductions.union, 30);
  assert.equal(input.w4.dependentsCredit, 2000);
  assert.equal(input.w4.extraWithholdingPerPeriod, 10);
  assert.equal(input.customLocalPercent, 100);
  assert.equal(input.workerDeductions, true);
  assert.equal(normalizeInput({ childrenUnder17: 2, otherDependents: 1 }).dependentsCount, 3);
  assert.equal(normalizeInput({ childrenUnder17: 2, dependentsCount: 0 }).dependentsCount, 0);
});

test("marginalRate reads the bracket the last dollar falls in", () => {
  const b = tables.federal.brackets.single;
  assert.equal(marginalRate(12400, b), 0.1);
  assert.equal(marginalRate(12401, b), 0.12);
  assert.equal(marginalRate(0, b), 0);
});

test("compareBonus: the tax the bonus adds for the year against the flat 22% withholding", () => {
  const out = compareBonus({ grossAnnual: 70000, state: "TX", bonusAnnual: 5000, filingStatus: "single" }, tables);
  // 70,000 -> 75,000 stays in the 22% bracket (taxable 53,900 -> 58,900).
  near(out.aggregate.federal, 1100);
  near(out.supplementalFederal, 1100);
  near(out.aggregate.socialSecurity, 310);
  near(out.aggregate.net, 5000 - 1100 - 310 - 72.5);
  assert.doesNotThrow(() => compareBonus({ grossAnnual: 0, bonusAnnual: 1000, state: "CA" }, tables));
});

test("employer cost adds matching Social Security and Medicare and capped federal unemployment", () => {
  const out = calculateEmployerCost({ grossAnnual: 60000, state: "TX", employerBenefitsAnnual: 6000, employerRetirementAnnual: 1800, sutaRate: 2.7 }, tables);
  near(out.employer.socialSecurity, 3720);
  near(out.employer.medicare, 870);
  near(out.employer.futa, 42);
  near(out.employer.suta, 1620);
  near(out.employer.total, 60000 + 3720 + 870 + 42 + 1620 + 6000 + 1800);
});

test("keepOfNext: what is left of the next $1,000", () => {
  // Texas, $60,000 single: 12% federal + 7.65% = 19.65% goes, 80.35% stays.
  near(keepOfNext({ grossAnnual: 60000, state: "TX", filingStatus: "single" }, tables), 0.8035, 0.0001);
});

test("grossForNet finds the salary for a wanted take-home", () => {
  const target = 50390; // the Texas $60,000 case above
  const out = grossForNet(target, { state: "TX", filingStatus: "single" }, tables);
  near(out.gross, 60000, 0.05);
  const ca = grossForNet(80000, { state: "CA", filingStatus: "single" }, tables);
  near(ca.result.annual.net, 80000, 0.05);
});
