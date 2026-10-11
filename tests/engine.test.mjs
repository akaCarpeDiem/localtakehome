import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertTaxDataIntegrity, bracketTax, calculateEmployerCost, calculateTakeHome, compareBonus, localIsSourced, money, normalizeInput } from "../site/js/engine.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "site", "data");
const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));
const tables = {
  federal: read("federal-2026.json"),
  fica: read("fica-2026.json"),
  states: read("states-2026.json"),
  local: read("local-2026.json"),
  payroll: read("state-payroll-2026.json"),
};

function calc(overrides) {
  return calculateTakeHome(
    {
      payType: "salary",
      employment: "w2",
      frequency: "biweekly",
      filingStatus: "single",
      livesInPlace: true,
      ...overrides,
    },
    tables,
  );
}

function near(actual, expected, tolerance = 0.05) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}

test("bracket tax matches the 2026 single schedule on $43,900", () => {
  const tax = bracketTax(43900, tables.federal.brackets.single);
  near(tax, 5020, 0.001);
});

test("fixture 1: $60k single Texas biweekly", () => {
  const result = calc({ grossAnnual: 60000, state: "TX" });
  near(result.annual.federalIncome, 5020);
  near(result.annual.socialSecurity, 3720);
  near(result.annual.medicare, 870);
  near(result.annual.additionalMedicare, 0);
  near(result.annual.stateIncome, 0);
  near(result.annual.local, 0);
  near(result.annual.net, 50390);
  near(result.periodNet, 1938.07, 0.02);
  const sum = money(result.lines.filter((line) => line.id !== "net" && line.id !== "gross").reduce((s, line) => s + line.period, 0));
  near(money(result.grossPeriod - sum), result.periodNet, 0.001);
  assert.equal(result.lines.some((line) => line.tone === "local" && line.annual > 0), false);
});

test("fixture 2: $85k single California biweekly includes SDI", () => {
  const result = calc({ grossAnnual: 85000, state: "CA" });
  near(result.annual.federalIncome, 9870);
  near(result.annual.socialSecurity, 5270);
  near(result.annual.medicare, 1232.5);
  near(result.annual.stateIncome, 3675.42, 1);
  const sdi = result.lines.find((line) => line.id === "ca-sdi");
  assert.ok(sdi);
  near(sdi.annual, 1105, 0.02);
  near(result.annual.net, 63847.08, 1);
  assert.ok(result.annual.net > 62000 && result.annual.net < 66000);
});

test("fixture 3: $85k single NYC resident, and NYC is not applied to the rest of NY", () => {
  const nyc = calc({ grossAnnual: 85000, state: "NY", localId: "nyc", livesInPlace: true });
  near(nyc.annual.federalIncome, 9870);
  near(nyc.annual.socialSecurity, 5270);
  near(nyc.annual.medicare, 1232.5);
  near(nyc.annual.stateIncome, 3993, 1);
  const city = nyc.lines.find((line) => line.id === "nyc");
  assert.ok(city);
  near(city.annual, 2859.69, 2);
  const pfl = nyc.lines.find((line) => line.id === "ny-pfl");
  const dbl = nyc.lines.find((line) => line.id === "ny-dbl");
  assert.ok(pfl && dbl);
  near(pfl.annual, 367.2, 0.05);
  near(dbl.annual, 31.2, 0.05);
  near(nyc.annual.net, 61376.41, 5);

  const stateOnly = calc({ grossAnnual: 85000, state: "NY" });
  near(stateOnly.annual.local, 0);
  assert.equal(stateOnly.lines.some((line) => line.id === "nyc"), false);

  const commuter = calc({ grossAnnual: 85000, state: "NY", localId: "nyc", livesInPlace: false });
  near(commuter.annual.local, 0);
  assert.match(commuter.notes.join(" "), /residents/i);
});

test("fixture 4: $75k single Philadelphia resident vs nonresident", () => {
  const resident = calc({ grossAnnual: 75000, state: "PA", localId: "philadelphia", livesInPlace: true });
  near(resident.annual.federalIncome, 7670);
  near(resident.annual.socialSecurity, 4650);
  near(resident.annual.medicare, 1087.5);
  near(resident.annual.stateIncome, 2302.5, 0.02);
  const city = resident.lines.find((line) => line.id === "philadelphia");
  near(city.annual, 2805, 0.02);
  near(resident.annual.net, 56485, 1);

  const nonresident = calc({ grossAnnual: 75000, state: "PA", localId: "philadelphia", livesInPlace: false });
  const nr = nonresident.lines.find((line) => line.id === "philadelphia");
  near(nr.annual, 2572.5, 0.02);
  assert.ok(resident.annual.local > nonresident.annual.local);
});

test("fixture 5: $20/hr, 40 hours, Florida", () => {
  const result = calc({
    payType: "hourly",
    hourlyRate: 20,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    state: "FL",
  });
  near(result.annual.gross, 41600);
  near(result.annual.federalIncome, 2812);
  near(result.annual.socialSecurity, 2579.2);
  near(result.annual.medicare, 603.2);
  near(result.annual.stateIncome, 0);
  near(result.annual.net, 35605.6, 0.05);
});

test("fixture 6: $120k single, no state tax, 10% traditional 401(k) does not cut FICA", () => {
  const result = calc({
    grossAnnual: 120000,
    state: "TX",
    deductions: { traditional401k: { mode: "percent", value: 10 } },
  });
  near(result.annual.federalWages, 108000);
  near(result.annual.ficaWages, 120000);
  near(result.annual.federalIncome, 14930);
  near(result.annual.socialSecurity, 7440);
  near(result.annual.medicare, 1740);
  near(result.annual.net, 83890);
  const hsa = calc({
    grossAnnual: 120000,
    state: "TX",
    deductions: { hsa: 4400 },
  });
  near(hsa.annual.ficaWages, 115600);
  near(hsa.annual.socialSecurity, 7167.2, 0.02);
});

test("fixture 7: $200k single California is at the Additional Medicare boundary", () => {
  const result = calc({ grossAnnual: 200000, state: "CA" });
  near(result.annual.federalIncome, 36734);
  near(result.annual.socialSecurity, 11439);
  near(result.annual.medicare, 2900);
  // IRS Additional Medicare is only on wages in excess of the threshold; at exactly $200k single the tax is $0.
  near(result.annual.additionalMedicare, 0);
  near(result.annual.stateIncome, 14370.42, 1);
  const sdi = result.lines.find((line) => line.id === "ca-sdi");
  near(sdi.annual, 2600, 0.02);
  near(result.annual.net, 131956.58, 2);
  assert.ok(result.annual.net > 125000 && result.annual.net < 140000);

  const above = calc({ grossAnnual: 220000, state: "TX" });
  near(above.annual.additionalMedicare, 180, 0.02);
  near(above.annual.socialSecurity, 11439);
});

test("fixture 8: $5k bonus on a $70k New York salary", () => {
  const comparison = compareBonus(
    { grossAnnual: 70000, bonusAnnual: 5000, state: "NY", filingStatus: "single", frequency: "biweekly" },
    tables,
  );
  near(comparison.aggregate.federal, 1100, 1);
  near(comparison.supplementalFederal, 1100);
  near(comparison.aggregate.state, 270, 2);
  near(comparison.aggregate.socialSecurity, 310, 0.05);
  near(comparison.aggregate.medicare, 72.5, 0.05);
  assert.ok(comparison.withBonus.annual.gross === 75000);
  assert.equal(comparison.withBonus.lines.some((line) => line.id === "nyc"), false);
});

test("California tax is not applied to Texas, and a mismatched local is ignored", () => {
  const texas = calc({ grossAnnual: 85000, state: "TX", localId: "nyc" });
  near(texas.annual.stateIncome, 0);
  near(texas.annual.local, 0);
  assert.match(texas.notes.join(" "), /not applied/i);
});

test("Detroit, Columbus, Montgomery County, and Marion County respond to the live/work switch", () => {
  const detroitResident = calc({ grossAnnual: 70000, state: "MI", localId: "detroit", livesInPlace: true });
  const detroitWork = calc({ grossAnnual: 70000, state: "MI", localId: "detroit", livesInPlace: false });
  near(detroitResident.annual.local, 1680, 0.05);
  near(detroitWork.annual.local, 840, 0.05);

  const columbus = calc({
    grossAnnual: 80000,
    state: "OH",
    localId: "columbus-oh",
    deductions: { traditional401k: { mode: "dollar", value: 8000 } },
  });
  near(columbus.annual.local, 1800, 1);

  const montgomery = calc({ grossAnnual: 90000, state: "MD", localId: "montgomery-md" });
  assert.ok(montgomery.annual.local > 2000 && montgomery.annual.local < 3200);

  const marion = calc({ grossAnnual: 70000, state: "IN", localId: "marion-in" });
  assert.ok(marion.annual.local > 1000 && marion.annual.local < 1600);
  assert.ok(marion.annual.stateIncome > 1500 && marion.annual.stateIncome < 2500);
});

test("Portland taxes stay at zero under the threshold and apply above it", () => {
  const under = calc({ grossAnnual: 90000, state: "OR", localId: "portland-multnomah" });
  near(under.annual.local, 0, 0.02);
  const over = calc({ grossAnnual: 180000, state: "OR", localId: "portland-multnomah" });
  assert.ok(over.annual.local > 500);
  const remote = calc({ grossAnnual: 180000, state: "OR", localId: "portland-multnomah", livesInPlace: false });
  near(remote.annual.local, 0);
});

test("custom local percent overrides a named city", () => {
  const result = calc({ grossAnnual: 50000, state: "TX", customLocalPercent: 1 });
  near(result.annual.local, 500, 0.02);
});

test("every state jurisdiction is present and zero-tax states stay at zero", () => {
  assert.equal(tables.states.states.length, 51);
  for (const id of ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WY", "WA"]) {
    const result = calc({ grossAnnual: 100000, state: id });
    near(result.annual.stateIncome, 0);
    assert.ok(result.annual.federalIncome > 0);
    assert.ok(result.annual.socialSecurity > 0);
  }
});

test("employer cost adds matching FICA and capped FUTA", () => {
  const cost = calculateEmployerCost({ grossAnnual: 60000, state: "TX", filingStatus: "single" }, tables);
  near(cost.employer.socialSecurity, 3720);
  near(cost.employer.medicare, 870);
  near(cost.employer.futa, 42);
  assert.ok(cost.employer.total > 60000);
});


test("contractor $85k Texas: no employee FICA; SE tax present; Schedule C warning", () => {
  const result = calc({
    grossAnnual: 85000,
    state: "TX",
    contractor: true,
  });
  assert.equal(result.input.employment, "contractor");
  const employeeSs = result.lines.find((line) => line.id === "ss" && line.label === "Social Security");
  const employeeMed = result.lines.find((line) => line.id === "medicare" && line.label === "Medicare");
  assert.equal(employeeSs, undefined);
  assert.equal(employeeMed, undefined);
  const seSs = result.lines.find((line) => line.id === "ss");
  const seMed = result.lines.find((line) => line.id === "medicare");
  assert.ok(seSs && /self-employment/i.test(seSs.label));
  assert.ok(seMed && /self-employment/i.test(seMed.label));
  assert.ok(result.annual.selfEmployment > 0);
  assert.ok(seSs.annual > 0 && seMed.annual > 0);
  assert.ok(result.warnings.some((text) => /schedule c/i.test(text)));
  assert.equal(result.lines.some((line) => line.id === "ca-sdi" || line.id === "ny-pfl"), false);
});

test("custom local 1.5% in Texas with no built-in city", () => {
  const result = calc({
    grossAnnual: 80000,
    state: "TX",
    customLocalRatePct: 1.5,
  });
  near(result.annual.local, 1200, 0.02);
  assert.equal(result.localTaxes.length, 1);
  assert.equal(result.localTaxes[0].id, "custom-local");
  assert.match(result.localTaxes[0].rateOrNote, /1\.5%/);
  assert.equal(result.localTaxes[0].residency, "resident");
});

test("$70k and $85k New York state without NYC: no nyc line", () => {
  for (const gross of [70000, 85000]) {
    const result = calc({ grossAnnual: gross, state: "NY" });
    near(result.annual.local, 0);
    assert.equal(result.lines.some((line) => line.id === "nyc"), false);
    assert.equal(result.localTaxes.some((row) => row.id === "nyc"), false);
    assert.ok(result.warnings.some((text) => /local wage tax not applied/i.test(text)));
  }
});

test("$210k single Texas: Additional Medicare on excess over $200k threshold", () => {
  // IRS Additional Medicare Tax is 0.9% only on wages above the filing-status threshold ($200k single).
  // At exactly $200k the tax is $0 (covered in fixture 7). $210k → 0.9% × $10,000 = $90.
  const result = calc({ grossAnnual: 210000, state: "TX" });
  near(result.annual.additionalMedicare, 90, 0.02);
  assert.ok(result.additionalMedicare > 0);
  near(result.annual.socialSecurity, 11439);
});

test("401(k) contribution produces tax savings vs the same gross without it", () => {
  const base = calc({ grossAnnual: 120000, state: "TX" });
  const with401k = calc({
    grossAnnual: 120000,
    state: "TX",
    deductions: { traditional401k: { mode: "dollar", value: 10000 } },
  });
  const netDrop = money(base.annual.net - with401k.annual.net);
  // Soft assert: net should fall by less than the $10k contribution because of federal tax savings.
  assert.ok(netDrop < 10000, `expected tax savings so net drop < contribution, got drop ${netDrop}`);
  assert.ok(with401k.annual.federalIncome < base.annual.federalIncome);
  near(with401k.annual.ficaWages, 120000);
});

test("normalizeInput accepts contract aliases without breaking UI keys", () => {
  const aliased = normalizeInput({
    residentState: "pa",
    workState: "NJ",
    residentLocalId: "philadelphia",
    workLocalId: "philadelphia",
    livesInWorkCity: false,
    contractor: true,
    customLocalRatePct: 2,
    pretax: { traditional401k: { mode: "percent", value: 5 }, hsa: 1000 },
    posttax: { roth401k: 500, union: 200 },
    w4: {
      multipleJobs: true,
      dependentsAmount: 2000,
      otherIncome: 100,
      otherDeductions: 300,
      extraWithholding: 25,
    },
    remoteSplit: [
      { state: "PA", pct: 60 },
      { state: "NJ", pct: 40 },
    ],
    grossAnnual: 75000,
    frequency: "biweekly",
    filingStatus: "single",
  });
  assert.equal(aliased.state, "PA");
  assert.equal(aliased.workState, "NJ");
  assert.equal(aliased.localId, "philadelphia");
  assert.equal(aliased.livesInPlace, false);
  assert.equal(aliased.employment, "contractor");
  assert.equal(aliased.customLocalPercent, 2);
  assert.equal(aliased.w4.dependentsCredit, 2000);
  assert.equal(aliased.w4.deductions, 300);
  assert.equal(aliased.w4.extraWithholdingPerPeriod, 25);
  assert.equal(aliased.deductions.hsa, 1000);
  assert.equal(aliased.deductions.union, 200);
  assert.equal(aliased.remoteSplit.length, 2);

  const ui = normalizeInput({
    state: "TX",
    localId: "",
    livesInPlace: true,
    employment: "w2",
    customLocalPercent: 0,
    deductions: { traditional401k: { mode: "dollar", value: 1000 } },
    w4: { dependentsCredit: 500, extraWithholdingPerPeriod: 10 },
    grossAnnual: 60000,
  });
  assert.equal(ui.state, "TX");
  assert.equal(ui.employment, "w2");
  assert.equal(ui.w4.dependentsCredit, 500);
  assert.equal(ui.deductions.traditional401k.value, 1000);
});

test("expanded result fields and remote-split warning", () => {
  const result = calc({
    grossAnnual: 85000,
    residentState: "NY",
    localId: "nyc",
    livesInPlace: true,
    remoteSplit: [
      { state: "NY", pct: 70 },
      { state: "NJ", pct: 30 },
    ],
  });
  assert.equal(result.grossAnnual, 85000);
  assert.ok(result.grossPerPeriod > 0);
  assert.ok(Array.isArray(result.pretaxItemized));
  assert.ok(Array.isArray(result.posttaxItemized));
  assert.ok(result.federalTaxableWages > 0);
  assert.ok(result.federalWithholding > 0);
  assert.ok(result.stateIncomeTax > 0);
  assert.ok(result.statePayrollTaxes.length >= 1);
  assert.ok(result.localTaxes.some((row) => row.id === "nyc" && row.residency === "resident"));
  assert.ok(result.netPerPeriod > 0);
  assert.ok(result.netMonthly > 0);
  assert.equal(result.netAnnual, result.annual.net);
  assert.equal(result.keptPer100, result.keepPer100);
  assert.equal(result.effectiveRate, result.effectiveTaxRate);
  assert.ok(result.assumptions.length >= 1);
  assert.ok(result.sources.length >= 1);
  assert.match(result.method, /Annualized bracket/i);
  assert.ok(result.warnings.some((text) => /Work-state\/resident-state split is simplified/i.test(text)));
});

test("compareBonus warns that paycheck withholding can differ from annual tax", () => {
  const comparison = compareBonus(
    { grossAnnual: 70000, bonusAnnual: 5000, state: "NY", filingStatus: "single", frequency: "biweekly" },
    tables,
  );
  assert.ok(comparison.warnings.some((text) => /paycheck withholding/i.test(text) && /bonus/i.test(text)));
});

test("workLocalId with livesInWorkCity false treats local as nonresident", () => {
  const result = calc({
    grossAnnual: 75000,
    state: "PA",
    residentLocalId: "",
    workLocalId: "philadelphia",
    livesInWorkCity: false,
  });
  const city = result.localTaxes.find((row) => row.id === "philadelphia");
  assert.ok(city);
  assert.equal(city.residency, "nonresident");
  near(city.annual, 2572.5, 0.02);
});

test("all four pay frequencies convert correctly for $52k Texas", () => {
  const weekly = calc({ grossAnnual: 52000, state: "TX", frequency: "weekly" });
  const biweekly = calc({ grossAnnual: 52000, state: "TX", frequency: "biweekly" });
  const semi = calc({ grossAnnual: 52000, state: "TX", frequency: "semimonthly" });
  const monthly = calc({ grossAnnual: 52000, state: "TX", frequency: "monthly" });
  assert.equal(weekly.periods, 52);
  assert.equal(biweekly.periods, 26);
  assert.equal(semi.periods, 24);
  assert.equal(monthly.periods, 12);
  near(weekly.grossPeriod, 1000, 0.02);
  near(biweekly.grossPeriod, 2000, 0.02);
  near(semi.grossPeriod, 2166.67, 0.02);
  near(monthly.grossPeriod, 4333.33, 0.02);
  // Annualized nets (period × periods) stay within a few cents of annual.net.
  for (const result of [weekly, biweekly, semi, monthly]) {
    near(money(result.periodNet * result.periods), result.annualizedNet, 0.02);
    assert.ok(result.periodNet > 0);
  }
});

test("filing statuses change federal tax on $85k Texas", () => {
  const single = calc({ grossAnnual: 85000, state: "TX", filingStatus: "single" });
  const mfj = calc({ grossAnnual: 85000, state: "TX", filingStatus: "mfj" });
  const hoh = calc({ grossAnnual: 85000, state: "TX", filingStatus: "hoh" });
  assert.ok(mfj.annual.federalIncome < single.annual.federalIncome);
  assert.ok(hoh.annual.federalIncome < single.annual.federalIncome);
  assert.ok(mfj.annual.federalIncome !== hoh.annual.federalIncome);
});

test("health premium reduces FICA wages; traditional 401(k) does not", () => {
  const base = calc({ grossAnnual: 120000, state: "TX" });
  const health = calc({
    grossAnnual: 120000,
    state: "TX",
    deductions: { health: 6000 },
  });
  const k401 = calc({
    grossAnnual: 120000,
    state: "TX",
    deductions: { traditional401k: { mode: "percent", value: 10 } },
  });
  near(base.annual.ficaWages, 120000);
  near(health.annual.ficaWages, 114000);
  assert.ok(health.annual.socialSecurity < base.annual.socialSecurity);
  near(k401.annual.ficaWages, 120000);
  near(k401.annual.socialSecurity, base.annual.socialSecurity);
});

test("extra withholding changes period and annual net", () => {
  const base = calc({ grossAnnual: 60000, state: "TX" });
  const extra = calc({
    grossAnnual: 60000,
    state: "TX",
    w4: { extraWithholdingPerPeriod: 100 },
  });
  near(money(base.periodNet - extra.periodNet), 100, 0.02);
  assert.ok(extra.annual.net < base.annual.net);
});

test("bonus compare does not crash on $0 regular pay", () => {
  const comparison = compareBonus(
    { grossAnnual: 0, bonusAnnual: 5000, state: "NY", filingStatus: "single", frequency: "biweekly" },
    tables,
  );
  assert.ok(Number.isFinite(comparison.withBonus.annual.net));
  assert.ok(comparison.withBonus.annual.gross === 5000);
  assert.ok(comparison.aggregate.net > 0);
});

test("custom local percent adds a named custom-local line", () => {
  const result = calc({ grossAnnual: 50000, state: "OH", customLocalPercent: 2.5 });
  const line = result.lines.find((row) => row.id === "custom-local");
  assert.ok(line);
  assert.match(line.label, /Custom local tax \(2\.5%\)/);
  near(result.annual.local, 1250, 0.02);
});

test("compare A vs B same salary shows tax-driven net winner (TX vs CA)", () => {
  const a = calc({ grossAnnual: 85000, state: "TX" });
  const b = calc({ grossAnnual: 85000, state: "CA" });
  assert.equal(a.annual.gross, b.annual.gross);
  assert.ok(a.annual.net > b.annual.net, "TX should keep more than CA at the same salary");
  assert.ok(b.annual.stateIncome + b.annual.statePayroll > a.annual.stateIncome + a.annual.statePayroll);
});

test("401(k) percent over 100 is clamped to 100", () => {
  const over = normalizeInput({
    grossAnnual: 60000,
    state: "TX",
    deductions: { traditional401k: { mode: "percent", value: 150 } },
  });
  assert.equal(over.deductions.traditional401k.value, 100);
  const result = calc({
    grossAnnual: 60000,
    state: "TX",
    deductions: { traditional401k: { mode: "percent", value: 150 } },
  });
  const capped = calc({
    grossAnnual: 60000,
    state: "TX",
    deductions: { traditional401k: { mode: "percent", value: 100 } },
  });
  near(result.annual.net, capped.annual.net, 0.02);
  near(result.annual.federalWages, 0);
  near(result.annual.ficaWages, 60000);
});

test("hours = 0 and salary = 0 do not produce NaN", () => {
  const hours0 = calc({
    payType: "hourly",
    hourlyRate: 25,
    hoursPerWeek: 0,
    weeksPerYear: 52,
    state: "TX",
  });
  assert.equal(hours0.annual.gross, 0);
  assert.ok(Number.isFinite(hours0.periodNet));
  assert.equal(hours0.periodNet, 0);

  const salary0 = calc({ grossAnnual: 0, state: "CA" });
  assert.ok(Number.isFinite(salary0.periodNet));
  assert.equal(salary0.annual.net, 0);
});

test("extremely large salary still formats without NaN", () => {
  const result = calc({ grossAnnual: 1e15, state: "TX" });
  // Engine caps absurd salaries so currency formatting stays readable.
  assert.ok(result.annual.gross <= 1e12);
  assert.ok(Number.isFinite(result.periodNet));
  assert.ok(Number.isFinite(result.annual.net));
  assert.equal(/e\+/i.test(String(result.periodNet)), false);
});

test("share-style serialize/parse roundtrip restores inputs", () => {
  const original = {
    payType: "salary",
    grossAnnual: 95000,
    frequency: "semimonthly",
    filingStatus: "mfj",
    state: "NY",
    localId: "nyc",
    livesInPlace: true,
    employment: "w2",
    deductions: { traditional401k: { mode: "percent", value: 6 } },
    w4: { extraWithholdingPerPeriod: 50 },
  };
  const q = new URLSearchParams();
  q.set("pay", String(original.grossAnnual));
  q.set("freq", original.frequency);
  q.set("status", original.filingStatus);
  q.set("state", original.state);
  q.set("local", original.localId);
  q.set("k401", "6");
  q.set("extra", "50");
  const restored = {
    payType: "salary",
    grossAnnual: Number(q.get("pay")),
    frequency: q.get("freq"),
    filingStatus: q.get("status"),
    state: q.get("state"),
    localId: q.get("local"),
    livesInPlace: true,
    employment: "w2",
    deductions: { traditional401k: { mode: "percent", value: Number(q.get("k401")) } },
    w4: { extraWithholdingPerPeriod: Number(q.get("extra")) },
  };
  const a = calc(original);
  const b = calc(restored);
  near(a.annual.net, b.annual.net, 0.02);
  near(a.periodNet, b.periodNet, 0.02);
});

test("NYC resident page prefill shows NYC tax; state-only NY does not", () => {
  const nyc = calc({ grossAnnual: 85000, state: "NY", localId: "nyc", livesInPlace: true });
  const stateOnly = calc({ grossAnnual: 85000, state: "NY" });
  assert.ok(nyc.lines.some((line) => line.id === "nyc" && line.annual > 0));
  assert.equal(stateOnly.lines.some((line) => line.id === "nyc"), false);
  assert.ok(stateOnly.warnings.some((text) => /local wage tax not applied/i.test(text)));
});

test("tax JSON schema: every rate file has sources; no placeholder quiet-$0 stubs", () => {
  const errors = assertTaxDataIntegrity(tables);
  assert.equal(errors.length, 0, errors.join("\n"));

  for (const local of tables.local.jurisdictions) {
    assert.notEqual(local.placeholder, true, local.id);
    assert.ok(["published", "modeled", "estimated"].includes(local.confidence), local.id);
    if (local.method !== "reference") {
      assert.ok(local.source?.url || local.sourceLabel, `${local.id} needs source`);
      assert.ok(localIsSourced(local), `${local.id} must pass localIsSourced`);
    }
  }
  for (const program of tables.payroll.programs) {
    assert.ok(Number(program.employeeRate) > 0, program.id);
    assert.ok(program.source?.url, program.id);
  }
  for (const state of tables.states.states) {
    assert.ok(state.source?.url || state.sourceLabel, state.id);
    if (!state.wageTax) {
      assert.equal(state.confidence, "published", `${state.id} no-tax must be published/sourced`);
    }
  }
});

test("unsourced local cannot produce a clean $0 local line without warning", () => {
  const poisoned = structuredClone(tables);
  poisoned.local.jurisdictions = [
    ...tables.local.jurisdictions,
    {
      id: "fake-unsourced",
      name: "Fake Unsourced City",
      state: "TX",
      type: "city",
      appliesWhen: "resident-or-work",
      method: "flat",
      residentRate: 0.02,
      nonresidentRate: 0.01,
      base: "gross",
      confidence: "missing",
      placeholder: true,
      sourceLabel: "",
    },
  ];
  const result = calculateTakeHome(
    {
      payType: "salary",
      employment: "w2",
      frequency: "biweekly",
      filingStatus: "single",
      livesInPlace: true,
      grossAnnual: 80000,
      state: "TX",
      localId: "fake-unsourced",
    },
    poisoned,
  );
  assert.equal(result.localTaxes.length, 0);
  assert.equal(result.annual.local, 0);
  assert.ok(result.dataGaps.localNotModeled);
  assert.ok(result.warnings.some((text) => /not modeled/i.test(text) && /not a silent \$0/i.test(text)));
  assert.equal(result.lines.some((line) => line.tone === "local"), false);
});

test("placeholder rate file fails schema check", () => {
  const poisoned = structuredClone(tables);
  poisoned.local.jurisdictions = tables.local.jurisdictions.map((row) =>
    row.id === "detroit" ? { ...row, placeholder: true, confidence: "todo", source: null, sourceLabel: "" } : row,
  );
  const errors = assertTaxDataIntegrity(poisoned);
  assert.ok(errors.some((e) => /detroit/i.test(e) && /placeholder|todo|not sourced/i.test(e)));
});

test("no-tax states stay $0 state income with sourced no-tax label, not quiet fake", () => {
  for (const state of ["TX", "FL", "WA", "NV", "WY", "SD", "TN", "NH", "AK"]) {
    const result = calc({ grossAnnual: 75000, state });
    near(result.annual.stateIncome, 0);
    const stateLine = result.lines.find((line) => line.id === "state");
    assert.ok(stateLine);
    assert.match(stateLine.source, /No wage income tax/i);
  }
});

test("not-modeled payroll programs warn instead of inventing $0 lines", () => {
  const nj = calc({ grossAnnual: 90000, state: "NJ" });
  assert.ok(nj.warnings.some((text) => /New Jersey TDI/i.test(text) && /not modeled/i.test(text)));
  assert.equal(nj.lines.some((line) => /tdi|fli/i.test(line.id || "") || /tdi|fli/i.test(line.label || "")), false);
  assert.ok(nj.dataGaps.notModeledPayroll.some((name) => /New Jersey TDI/i.test(name)));

  const or = calc({ grossAnnual: 90000, state: "OR" });
  assert.ok(or.warnings.some((text) => /Paid Leave Oregon|PFMLI/i.test(text)));
  assert.ok(or.lines.some((line) => line.id === "or-transit"));
});

test("Pittsburgh and Marion County use published sourced rates", () => {
  const pitt = tables.local.jurisdictions.find((row) => row.id === "pittsburgh");
  assert.equal(pitt.confidence, "published");
  assert.equal(pitt.residentRate, 0.03);
  assert.ok(pitt.source.url.includes("pittsburghpa.gov"));

  const marion = tables.local.jurisdictions.find((row) => row.id === "marion-in");
  assert.equal(marion.confidence, "published");
  assert.equal(marion.residentRate, 0.0202);
  assert.ok(marion.source.url.includes("in.gov"));

  const result = calc({ grossAnnual: 80000, state: "PA", localId: "pittsburgh" });
  near(result.annual.local, 2400, 0.02);
  assert.equal(result.dataGaps.localNotModeled, false);
});

test("Portland Metro SHS uses 2026 indexed thresholds ($128k / $205k)", () => {
  const local = tables.local.jurisdictions.find((row) => row.id === "portland-multnomah");
  const metro = local.layers.find((layer) => layer.id === "metro-shs");
  assert.equal(metro.tiers[0].threshold.single, 128000);
  assert.equal(metro.tiers[0].threshold.mfj, 205000);
  assert.equal(local.confidence, "published");

  const under = calc({ grossAnnual: 90000, state: "OR", localId: "portland-multnomah" });
  near(under.annual.local, 0, 0.02);
  const over = calc({ grossAnnual: 200000, state: "OR", localId: "portland-multnomah" });
  assert.ok(over.annual.local > 1000);
});

test("estimated state confidence surfaces an explicit warning", () => {
  const result = calc({ grossAnnual: 80000, state: "AL" });
  assert.equal(result.dataGaps.stateEstimated, true);
  assert.ok(result.warnings.some((text) => /Alabama/i.test(text) && /estimated/i.test(text)));
});
