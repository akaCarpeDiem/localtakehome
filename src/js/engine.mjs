/**
 * LocalTakehome calculation engine.
 *
 *   calculateTakeHome(input, tables) -> result
 *
 * Pure functions: no DOM, no network, no dates. Everything is worked out for
 * the year, rounded to cents, then split evenly across the paychecks.
 *
 * `tables` is { federal, fica, states, local, payroll } from src/data/*.json.
 * Numbers live in those files; this file holds only the arithmetic. A state
 * whose tax cannot be described by "deduction, exemption, brackets" names a
 * rule (state.rule) and the rule's code is in STATE_RULES below.
 */

export const PERIODS = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export const FILING_LABELS = {
  single: "Single",
  mfj: "Married filing jointly",
  mfs: "Married filing separately",
  hoh: "Head of household",
};

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "Semimonthly",
  monthly: "Monthly",
};

export function money(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Tax on `income` from a list of { over, rate } brackets (marginal). */
export function bracketTax(income, brackets) {
  if (!brackets?.length || !(income > 0)) return 0;
  const sorted = [...brackets].sort((a, b) => a.over - b.over);
  let tax = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const start = sorted[i].over;
    const end = i + 1 < sorted.length ? sorted[i + 1].over : Infinity;
    if (income <= start) break;
    const slice = Math.min(income, end) - start;
    if (slice > 0) tax += slice * sorted[i].rate;
  }
  return tax;
}

/** The rate that applies to the last dollar of `income`. */
export function marginalRate(income, brackets) {
  if (!brackets?.length) return 0;
  const sorted = [...brackets].sort((a, b) => a.over - b.over);
  let rate = 0;
  for (const row of sorted) {
    if (income > row.over) rate = row.rate;
  }
  return rate;
}

function num(value) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function clamp0(n) {
  return n > 0 ? n : 0;
}

function pctLabel(rate) {
  const text = (rate * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function dollars(n) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** First row of [[limit, value], ...] whose limit is null or >= x. */
function tier(rows, x) {
  for (const [limit, value] of rows) {
    if (limit == null || x <= limit) return value;
  }
  return rows.length ? rows[rows.length - 1][1] : 0;
}

/* ───────────────────────────── data checks ───────────────────────────── */

export function localIsSourced(local) {
  if (!local) return false;
  if (local.placeholder === true || local.todo === true) return false;
  if (!["published", "modeled", "estimated"].includes(local.confidence)) return false;
  if (local.method === "reference") return true;
  return Boolean(local.source?.url || local.source?.name || local.sourceLabel);
}

/** Schema and sanity errors in the tax tables. An empty array means pass. */
export function assertTaxDataIntegrity(tables) {
  const errors = [];
  const fed = tables?.federal;
  if (!fed?.sources?.length) errors.push("federal: missing sources");
  for (const status of Object.keys(FILING_LABELS)) {
    if (!(fed?.standardDeduction?.[status] > 0)) errors.push(`federal: standard deduction missing for ${status}`);
    if (!fed?.brackets?.[status]?.length) errors.push(`federal: brackets missing for ${status}`);
  }
  if (!tables?.fica?.sources?.length) errors.push("fica: missing sources");
  if (!(tables?.fica?.socialSecurity?.wageBase > 0)) errors.push("fica: wage base missing");
  if (!(tables?.fica?.socialSecurity?.employeeRate > 0)) errors.push("fica: Social Security rate missing");

  const isBrackets = (rows) =>
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.every((row, i) => Number.isFinite(row.over) && Number.isFinite(row.rate) && row.rate >= 0 && row.rate < 0.2 && (i === 0 || row.over > rows[i - 1].over));

  const states = tables?.states?.states || [];
  if (states.length !== 51) errors.push(`states: expected 51 jurisdictions, found ${states.length}`);
  for (const state of states) {
    const tag = `states: ${state.id}`;
    if (!["official", "estimated"].includes(state.confidence)) errors.push(`${tag} missing or invalid confidence`);
    if (!state.sources?.length || state.sources.some((s) => !s.name || !/^https:\/\//.test(s.url || ""))) errors.push(`${tag} needs sources with https links`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.lastVerified || "")) errors.push(`${tag} missing lastVerified`);
    if (!state.why) errors.push(`${tag} missing the one-line description`);
    if (!state.wageTax) {
      if (state.brackets || state.rule) errors.push(`${tag} has no wage tax but carries brackets or a rule`);
      continue;
    }
    if (!state.brackets?.single) errors.push(`${tag} missing single brackets`);
    for (const [status, rows] of Object.entries(state.brackets || {})) {
      if (!isBrackets(rows)) errors.push(`${tag} brackets for ${status} are not ascending or have a bad rate`);
      if (rows?.[0]?.over !== 0) errors.push(`${tag} brackets for ${status} must start at 0`);
    }
    if (!(state.brackets?.single || []).some((row) => row.rate > 0)) errors.push(`${tag} taxes wages but has no positive rate`);
    for (const key of ["hohUses", "mfsUses"]) {
      if (state[key] && !state.brackets?.[state[key]]) errors.push(`${tag} ${key} points at a schedule that is missing`);
    }
    if (state.sd && state.sd !== "federal") {
      for (const status of Object.keys(FILING_LABELS)) {
        if (!(state.sd[status] >= 0)) errors.push(`${tag} standard deduction missing for ${status}`);
      }
    }
    if (state.exemption) {
      if (!["deduction", "credit"].includes(state.exemption.kind)) errors.push(`${tag} exemption kind`);
      for (const key of ["single", "mfj", "mfs", "hoh", "dependent"]) {
        if (!(state.exemption[key] >= 0)) errors.push(`${tag} exemption missing ${key}`);
      }
    }
    if (state.rule && !STATE_RULES[state.rule]) errors.push(`${tag} names rule ${state.rule}, which the engine does not have`);
  }

  for (const local of tables?.local?.jurisdictions || []) {
    const tag = `local: ${local.id}`;
    if (local.placeholder === true || local.todo === true) errors.push(`${tag} marked placeholder`);
    if (!["published", "modeled", "estimated"].includes(local.confidence)) errors.push(`${tag} missing or invalid confidence`);
    if (local.method !== "reference" && !localIsSourced(local)) errors.push(`${tag} not sourced`);
    if (!states.some((s) => s.id === local.state)) errors.push(`${tag} belongs to an unknown state`);
    if (local.method === "flat" && !(Number(local.residentRate) > 0)) errors.push(`${tag} flat residentRate must be above 0`);
    if (local.method === "flat" && !["gross", "state-taxable", "medicare-wages", "federal-wages", "state-wages"].includes(local.base)) errors.push(`${tag} unknown base`);
    if (local.method === "fixed" && !(local.monthly > 0)) errors.push(`${tag} fixed amount missing`);
  }

  for (const program of tables?.payroll?.programs || []) {
    const tag = `payroll: ${program.id}`;
    if (!["published", "modeled", "estimated"].includes(program.confidence)) errors.push(`${tag} missing or invalid confidence`);
    if (!(program.source?.url || program.sourceLabel)) errors.push(`${tag} missing source`);
    if (!(Number(program.employeeRate) > 0)) errors.push(`${tag} employeeRate must be above 0 (or leave the program out)`);
    if (program.employeeRate > 0.03) errors.push(`${tag} employeeRate looks too high`);
    if (!states.some((s) => s.id === program.state)) errors.push(`${tag} belongs to an unknown state`);
    if (program.annualMax != null && program.wageBase != null) {
      const implied = program.wageBase * program.employeeRate;
      if (Math.abs(implied - program.annualMax) > 1) errors.push(`${tag} annualMax does not match rate x wage base (${implied.toFixed(2)})`);
    }
  }
  return errors;
}

/* ───────────────────────────── input ───────────────────────────── */

function normalizeRetirement(value) {
  if (value == null) return { mode: "dollar", value: 0 };
  if (typeof value === "number") return { mode: "dollar", value: clamp0(value) };
  const mode = value.mode === "percent" ? "percent" : "dollar";
  let amount = clamp0(num(value.value));
  if (mode === "percent" && amount > 100) amount = 100;
  return { mode, value: amount };
}

function pickDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function flattenDeductionBag(raw = {}) {
  const d = { ...(raw.deductions || {}) };
  const pretaxNest = raw.pretax || d.pretax || {};
  const posttaxNest = raw.posttax || d.posttax || {};
  delete d.pretax;
  delete d.posttax;
  const pick = (keys, nest) => {
    for (const key of keys) {
      if (nest[key] != null) return nest[key];
      if (d[key] != null) return d[key];
    }
    return undefined;
  };
  return {
    traditional401k: pick(["traditional401k", "401k", "traditional"], pretaxNest),
    roth401k: pick(["roth401k", "roth"], { ...pretaxNest, ...posttaxNest }),
    hsa: pick(["hsa"], pretaxNest),
    fsa: pick(["fsa", "healthFsa"], pretaxNest),
    health: pick(["health", "healthPremium", "medical"], pretaxNest),
    dental: pick(["dental", "dentalPremium"], pretaxNest),
    vision: pick(["vision", "visionPremium"], pretaxNest),
    commuter: pick(["commuter", "commuterBenefits"], pretaxNest),
    union: pick(["union", "unionDues"], posttaxNest),
    customPretax: pick(["customPretax", "other", "otherPretax"], pretaxNest),
    customPretaxReducesFica: pickDefined(pretaxNest.customPretaxReducesFica, pretaxNest.reducesFica, d.customPretaxReducesFica),
    customPosttax: pick(["customPosttax", "other", "otherPosttax"], posttaxNest),
  };
}

function resolveLocalSelection(raw) {
  const residentLocalId = String(pickDefined(raw.residentLocalId, raw.localId, "") || "");
  const workLocalId = String(raw.workLocalId || "");
  const livesExplicit =
    raw.livesInWorkCity !== undefined ? Boolean(raw.livesInWorkCity) : raw.livesInPlace !== undefined ? Boolean(raw.livesInPlace) : true;
  let localId = residentLocalId || workLocalId;
  let livesInPlace = livesExplicit;
  if (workLocalId && !livesExplicit && (!residentLocalId || workLocalId !== residentLocalId)) {
    localId = workLocalId;
    livesInPlace = false;
  }
  return { localId, livesInPlace, residentLocalId, workLocalId };
}

const RATE_BLOCK_CAP = 24;

/** Hours x dollars-per-hour lines. Flags label overtime or a differential; they do not change the dollars. */
export function normalizeRateBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const blocks = [];
  for (const row of raw.slice(0, RATE_BLOCK_CAP)) {
    if (!row || typeof row !== "object") continue;
    const hours = clamp0(num(row.hours));
    const rate = Math.min(1e6, clamp0(num(row.rate)));
    if (!(hours > 0)) continue;
    const label = String(row.label || "Base").trim().slice(0, 40) || "Base";
    blocks.push({ label, hours, rate, overtime: Boolean(row.overtime), differential: Boolean(row.differential) });
  }
  return blocks;
}

function blockLineLabel(block) {
  const tags = [];
  if (block.differential) tags.push("differential");
  if (block.overtime) tags.push("OT");
  return tags.length ? `${block.label} · ${tags.join(" + ")}` : block.label;
}

function blockKindNote(block) {
  if (block.overtime && block.differential) return "Overtime and a differential on the same hours. The rate is the combined dollars per hour.";
  if (block.overtime) return "Marked as overtime. The rate is the overtime dollars per hour for these hours.";
  if (block.differential) return "Marked as a differential (night, weekend, hazard, or similar). The rate is the dollars per hour for these hours.";
  return "Straight time at the rate on this line.";
}

export function normalizeInput(raw = {}) {
  const status = FILING_LABELS[raw.filingStatus] ? raw.filingStatus : "single";
  const frequency = PERIODS[raw.frequency] ? raw.frequency : "biweekly";
  const payType = raw.payType === "hourly" ? "hourly" : "salary";
  const d = flattenDeductionBag(raw);
  const weeks = clamp0(num(raw.weeksPerYear ?? 52));
  const contractorFlag = raw.contractor === true || raw.employment === "contractor";
  const state = String(pickDefined(raw.residentState, raw.state, "") || "").toUpperCase();
  const workState = raw.workState ? String(raw.workState).toUpperCase() : "";
  const localSel = resolveLocalSelection(raw);
  const w4raw = raw.w4 || {};
  const children = Math.max(0, Math.floor(num(pickDefined(raw.childrenUnder17, w4raw.childrenUnder17, 0))));
  const otherDeps = Math.max(0, Math.floor(num(pickDefined(raw.otherDependents, w4raw.otherDependents, 0))));
  const explicitDeps = pickDefined(raw.dependentsCount);
  return {
    taxYear: 2026,
    payType,
    employment: contractorFlag ? "contractor" : "w2",
    frequency,
    filingStatus: status,
    grossAnnual: Math.min(1e12, clamp0(num(raw.grossAnnual))),
    hourlyRate: Math.min(1e6, clamp0(num(raw.hourlyRate))),
    hoursPerWeek: clamp0(num(raw.hoursPerWeek ?? (payType === "hourly" ? 40 : 0))),
    weeksPerYear: weeks || 52,
    overtimeHoursPerWeek: clamp0(num(raw.overtimeHoursPerWeek)),
    overtimeMultiplier: num(raw.overtimeMultiplier) > 0 ? num(raw.overtimeMultiplier) : 1.5,
    rateBlocks: normalizeRateBlocks(raw.rateBlocks),
    rateBlockUnit: raw.rateBlockUnit === "period" ? "period" : "week",
    tipsAnnual: clamp0(num(raw.tipsAnnual)),
    bonusAnnual: clamp0(num(raw.bonusAnnual)),
    /** Premium part of overtime pay for the year when it cannot be worked out from hours (salary mode). */
    overtimePremiumAnnual: raw.overtimePremiumAnnual == null || raw.overtimePremiumAnnual === "" ? null : clamp0(num(raw.overtimePremiumAnnual)),
    /** Apply the federal deductions for qualified tips and overtime (2025 through 2028). On unless switched off. */
    workerDeductions: raw.workerDeductions !== false,
    state,
    workState,
    localId: localSel.localId,
    residentLocalId: localSel.residentLocalId,
    workLocalId: localSel.workLocalId,
    livesInPlace: localSel.livesInPlace,
    customLocalPercent: Math.min(100, clamp0(num(pickDefined(raw.customLocalPercent, raw.customLocalRatePct, 0)))),
    childrenUnder17: children,
    otherDependents: otherDeps,
    dependentsCount: explicitDeps !== undefined ? Math.max(0, Math.floor(num(explicitDeps))) : children + otherDeps,
    contractorExpensesAnnual: clamp0(num(raw.contractorExpensesAnnual)),
    deductions: {
      traditional401k: normalizeRetirement(d.traditional401k),
      roth401k: normalizeRetirement(d.roth401k),
      hsa: clamp0(num(d.hsa)),
      fsa: clamp0(num(d.fsa)),
      health: clamp0(num(d.health)),
      dental: clamp0(num(d.dental)),
      vision: clamp0(num(d.vision)),
      commuter: clamp0(num(d.commuter)),
      union: clamp0(num(d.union)),
      customPretax: clamp0(num(d.customPretax)),
      customPretaxReducesFica: Boolean(d.customPretaxReducesFica),
      customPosttax: clamp0(num(d.customPosttax)),
    },
    w4: {
      multipleJobs: Boolean(w4raw.multipleJobs),
      dependentsCredit: clamp0(num(pickDefined(w4raw.dependentsCredit, w4raw.dependentsAmount, 0))),
      otherIncome: clamp0(num(w4raw.otherIncome)),
      deductions: clamp0(num(pickDefined(w4raw.deductions, w4raw.otherDeductions, 0))),
      extraWithholdingPerPeriod: money(clamp0(num(pickDefined(w4raw.extraWithholdingPerPeriod, w4raw.extraWithholding, 0)))),
    },
    employerBenefitsAnnual: clamp0(num(raw.employerBenefitsAnnual)),
    employerRetirementAnnual: clamp0(num(raw.employerRetirementAnnual)),
    sutaRate: clamp0(num(raw.sutaRate)),
  };
}

function retirementAmount(spec, gross) {
  const base = clamp0(gross);
  if (spec.mode === "percent") return money(base * (Math.min(100, clamp0(spec.value)) / 100));
  return money(Math.min(clamp0(spec.value), base));
}

/**
 * Each deduction with what it reduces. `kind` is how states refer to it
 * (state.pretax[kind] === false keeps it in that state's wages).
 */
function buildDeductionItems(input, gross) {
  const d = input.deductions;
  const items = [];
  const push = (type, label, annual, flags) => {
    const amount = money(annual);
    if (amount > 0) items.push({ type, label, annual: amount, ...flags });
  };
  push("401k", "Traditional 401(k)", retirementAmount(d.traditional401k, gross), { bucket: "pretax", federal: true, kind: "k401", fica: false });
  push("hsa", "HSA", d.hsa, { bucket: "pretax", federal: true, kind: "hsa", fica: true });
  push("fsa", "Health FSA", d.fsa, { bucket: "pretax", federal: true, kind: "fsa", fica: true });
  push("health", "Health premium", d.health, { bucket: "pretax", federal: true, kind: "s125", fica: true });
  push("dental", "Dental premium", d.dental, { bucket: "pretax", federal: true, kind: "s125", fica: true });
  push("vision", "Vision premium", d.vision, { bucket: "pretax", federal: true, kind: "s125", fica: true });
  push("commuter", "Commuter benefits", d.commuter, { bucket: "pretax", federal: true, kind: "commuter", fica: true });
  push("custom-pretax", "Other pre-tax", d.customPretax, { bucket: "pretax", federal: true, kind: "other", fica: d.customPretaxReducesFica });
  push("roth", "Roth 401(k)", retirementAmount(d.roth401k, gross), { bucket: "posttax", federal: false, kind: "roth", fica: false });
  push("union", "Union dues", d.union, { bucket: "posttax", federal: false, kind: "union", fica: false });
  push("custom-posttax", "Other post-tax", d.customPosttax, { bucket: "posttax", federal: false, kind: "other", fica: false });
  return items;
}

/* ───────────────────────────── federal ───────────────────────────── */

/** Federal deductions for qualified tips and the premium part of overtime pay (2025 through 2028). */
function workerDeductionAmounts(input, federal, magi, tips, overtimePremium) {
  const rules = federal.workerDeductions;
  if (!rules || !input.workerDeductions || input.employment === "contractor") return { tips: 0, overtime: 0 };
  const status = input.filingStatus;
  if (status === "mfs") return { tips: 0, overtime: 0 };
  const start = rules.phaseoutStart[status] ?? rules.phaseoutStart.single;
  const reduction = magi > start ? Math.ceil((magi - start) / 1000) * rules.phaseoutPer1000 : 0;
  const tipsMax = clamp0(rules.tipsMax - reduction);
  const overtimeMax = clamp0((rules.overtimeMax[status] ?? rules.overtimeMax.single) - reduction);
  return { tips: Math.min(tips, tipsMax), overtime: Math.min(overtimePremium, overtimeMax) };
}

function childCredit(input, federal, magi) {
  const rules = federal.credits;
  if (!rules) return 0;
  const full = input.childrenUnder17 * rules.childTaxCredit + input.otherDependents * rules.otherDependentCredit;
  if (!(full > 0)) return 0;
  const start = rules.phaseoutStart[input.filingStatus] ?? rules.phaseoutStart.single;
  const reduction = magi > start ? Math.ceil((magi - start) / 1000) * rules.phaseoutPer1000 : 0;
  return clamp0(full - reduction);
}

function federalTaxDetail(federalWages, input, federal, extraDeduction, credit) {
  const status = input.filingStatus;
  const fullBrackets = federal.brackets[status];
  const fullStd = federal.standardDeduction[status];
  const multiple = input.w4.multipleJobs;
  const std = multiple ? fullStd / 2 : fullStd;
  const brackets = multiple ? fullBrackets.map((row) => ({ over: row.over / 2, rate: row.rate })) : fullBrackets;
  const deduction = std + input.w4.deductions + extraDeduction;
  const taxable = Math.max(0, federalWages + input.w4.otherIncome - deduction);
  const beforeCredit = bracketTax(taxable, brackets);
  const credits = credit + input.w4.dependentsCredit;
  const tax = Math.max(0, beforeCredit - credits);
  return { tax, taxable, beforeCredit, creditsUsed: Math.min(beforeCredit, credits), standardDeductionUsed: std, multiple, marginal: marginalRate(taxable, brackets) };
}

/* ───────────────────────────── states ───────────────────────────── */

function findState(tables, id) {
  return tables.states.states.find((row) => row.id === id) || null;
}

function stateName(tables, id) {
  return findState(tables, id)?.name || id;
}

/** The rate schedule a state uses for a filing status. */
export function stateBrackets(state, status) {
  const b = state?.brackets || {};
  if (b[status]?.length) return b[status];
  if (status === "hoh" && state.hohUses && b[state.hohUses]) return b[state.hohUses];
  if (status === "mfs" && state.mfsUses && b[state.mfsUses]) return b[state.mfsUses];
  return b.single || [];
}

function baseStandardDeduction(state, status, federal) {
  if (!state.sd) return 0;
  if (state.sd === "federal") return federal.standardDeduction[status] ?? federal.standardDeduction.single;
  return state.sd[status] ?? state.sd.single ?? 0;
}

function people(status, dependents) {
  return (status === "mfj" ? 2 : 1) + dependents;
}

/**
 * State-specific arithmetic. Each rule may adjust the working figures before
 * the brackets are applied (`before`) and adjust the tax afterwards (`after`).
 * `c` is the working context:
 *   agi, status, dependents, federalTax, federal (table), p (state.params),
 *   sd, exemptionDeduction, exemptionCredit, subtractions[], steps[]
 */
const STATE_RULES = {
  AL: {
    before(c) {
      const chart = c.p.sdChart[c.status] || c.p.sdChart.single;
      c.sd = c.agi < chart.floor ? chart.max : Math.max(chart.min, chart.max - chart.dec * (Math.floor((c.agi - chart.floor) / chart.step) + 1));
      const perDependent = tier(c.p.dependentByAgi, c.agi);
      c.exemptionDeduction = (c.state.exemption[c.status] ?? c.state.exemption.single) + perDependent * c.dependents;
      if (c.federalTax > 0) c.subtract("Federal income tax", c.federalTax);
      const ot = Math.min(c.p.overtimePremiumDeductionMax || 0, c.overtimePremium || 0);
      if (ot > 0) c.subtract("Overtime premium deduction", ot);
    },
  },
  AR: {
    tax(c, taxable) {
      const rows = c.p.table;
      if (taxable < rows[0][0]) return 0;
      let rate = rows[0][1];
      let sub = rows[0][2];
      for (const [from, r, s] of rows) {
        if (taxable >= from) {
          rate = r;
          sub = s;
        }
      }
      const adj = c.p.adjust;
      if (taxable > adj.to) sub = adj.above;
      else if (taxable >= adj.from) sub = adj.start - adj.stepAmount * Math.floor((taxable - adj.from) / adj.stepIncome);
      return Math.max(0, taxable * rate - sub);
    },
  },
  CA: {
    after(c, tax, taxable) {
      const s = c.p.surtax;
      const extra = Math.max(0, taxable - s.over) * s.rate;
      if (extra > 0) c.step(`${pctLabel(s.rate)} on taxable income over ${dollars(s.over)}`, extra);
      return tax + extra;
    },
  },
  CO: {
    before(c) {
      if (c.agi > c.p.deductionCapAbove) {
        const cap = c.p.deductionCap[c.status] ?? c.p.deductionCap.single;
        if (c.sd > cap) c.sd = cap;
      }
    },
  },
  CT: {
    before(c) {
      const [base, start] = c.p.exemption[c.status] || c.p.exemption.single;
      c.exemptionDeduction = c.agi <= start ? base : Math.max(0, base - 1000 * Math.ceil((c.agi - start) / 1000));
    },
    after(c, tax) {
      const [abStart, abBand, abStep, abMax] = c.p.addBack[c.status] || c.p.addBack.single;
      const addBack = c.agi > abStart ? Math.min(abMax, abStep * Math.ceil((c.agi - abStart) / abBand)) : 0;
      let recapture = 0;
      for (const [start, band, step, count] of c.p.recapture[c.status] || c.p.recapture.single) {
        if (c.agi > start) recapture += step * Math.min(count, Math.ceil((c.agi - start) / band));
      }
      const table = c.p.credit[c.status] || c.p.credit.single;
      let pct = 0;
      for (const [limit, value] of table) {
        if (c.agi <= limit) {
          pct = value;
          break;
        }
      }
      if (addBack > 0) c.step("2% rate phase-out add-back", addBack);
      if (recapture > 0) c.step("Benefit recapture", recapture);
      const before = tax + addBack + recapture;
      const credit = before * pct;
      if (credit > 0) c.step(`Personal tax credit (${Math.round(pct * 100)}%)`, -credit);
      return before - credit;
    },
  },
  MD: {
    before(c) {
      const steps = c.status === "mfj" || c.status === "hoh" ? c.p.exemptionSteps.joint : c.p.exemptionSteps.single;
      c.exemptionDeduction = tier(steps, c.agi) * people(c.status, c.dependents);
    },
  },
  ME: {
    before(c) {
      const [sdStart, sdRange] = c.p.sdPhaseout[c.status] || c.p.sdPhaseout.single;
      if (c.agi > sdStart) c.sd *= 1 - Math.min(1, (c.agi - sdStart) / sdRange);
      const [exStart, exRange] = c.p.exemptionPhaseout[c.status] || c.p.exemptionPhaseout.single;
      if (c.agi > exStart) c.exemptionDeduction *= 1 - Math.min(1, (c.agi - exStart) / exRange);
      c.exemptionCredit += (c.p.dependentCredit || 0) * c.dependents;
    },
  },
  MO: {
    before(c) {
      const share = tier(c.p.federalTaxDeduction, c.agi);
      const cap = c.p.federalTaxDeductionCap[c.status] ?? c.p.federalTaxDeductionCap.single;
      const amount = Math.min(cap, share * c.federalTax);
      if (amount > 0) c.subtract(`Federal income tax (${Math.round(share * 100)}%, up to ${dollars(cap)})`, amount);
    },
  },
  NY: {
    after(c, tax, taxable) {
      const p = c.p;
      if (c.agi <= p.recaptureStart) return tax;
      if (c.agi > p.flatAgi) {
        c.step(`Income over ${dollars(p.flatAgi)}: ${pctLabel(p.flatRate)} of all taxable income`, taxable * p.flatRate - tax);
        return taxable * p.flatRate;
      }
      const rows = [...stateBrackets(c.state, c.status)].sort((a, b) => a.over - b.over);
      const flat = p.flatTier[c.status] ?? p.flatTier.single;
      const firstIndex = rows.findIndex((row) => row.rate > flat + 1e-9);
      // Thresholds where the rate steps above the flat tier.
      const tiers = rows.slice(firstIndex);
      let k = -1;
      tiers.forEach((row, i) => {
        if (taxable > row.over) k = i;
      });
      let recapture;
      if (k === -1) {
        const share = Math.min(1, (c.agi - p.recaptureStart) / p.recaptureRange);
        recapture = Math.max(0, taxable * flat - tax) * share;
      } else {
        const t = tiers[k].over;
        const below = k === 0 ? flat : tiers[k - 1].rate;
        const base = below * t - bracketTax(t, rows);
        const incremental = (tiers[k].rate - below) * t;
        recapture = base + incremental * Math.min(1, Math.max(0, c.agi - t) / p.recaptureRange);
      }
      if (recapture > 0) c.step("Tax-benefit recapture (income over $107,650)", recapture);
      return tax + recapture;
    },
  },
  OH: {
    before(c) {
      const each = c.agi >= c.p.exemptionNoneAt ? 0 : tier(c.p.exemptionByAgi, c.agi);
      c.exemptionDeduction = each * people(c.status, c.dependents);
    },
    tax(c, taxable) {
      return taxable > c.p.threshold ? c.p.base + (taxable - c.p.threshold) * c.p.rate : 0;
    },
  },
  OR: {
    before(c) {
      const f = c.p.federalTaxSubtraction;
      const limit = tier(c.status === "mfj" || c.status === "hoh" ? f.joint : f.single, c.agi);
      // The table's limits apply "under" each income step.
      const amount = Math.min(c.federalTax, limit);
      if (amount > 0) c.subtract(`Federal income tax (up to ${dollars(limit)})`, amount);
      const cut = c.p.creditAgiLimit[c.status] ?? c.p.creditAgiLimit.single;
      if (c.agi > cut) c.exemptionCredit = 0;
    },
  },
  RI: {
    before(c) {
      const { start, end, increment } = c.p.phaseout;
      if (c.agi <= start) return;
      const factor = c.agi > end ? 0 : Math.max(0, 1 - 0.2 * Math.ceil((c.agi - start) / increment));
      c.sd *= factor;
      c.exemptionDeduction *= factor;
    },
  },
  SC: {
    before(c) {
      const [max, start, range] = c.p.sciad[c.status] || c.p.sciad.single;
      let deduction = max;
      if (c.agi > start) {
        const reduction = Math.floor((max * Math.min(1, (c.agi - start) / range)) / 10) * 10;
        deduction = Math.max(0, max - reduction);
      }
      c.sd = deduction;
      c.sdLabel = "South Carolina income adjusted deduction";
    },
  },
  UT: {
    tax(c) {
      const p = c.p;
      const std = c.federal.standardDeduction[c.status] ?? c.federal.standardDeduction.single;
      const initial = p.creditRate * (std + p.dependentExemption * c.dependents);
      const threshold = p.phaseoutThreshold[c.status] ?? p.phaseoutThreshold.single;
      const credit = Math.max(0, initial - Math.max(0, c.agi - threshold) * p.phaseoutRate);
      c.step(`${pctLabel(p.rate)} of income`, c.agi * p.rate);
      if (credit > 0) c.step("Taxpayer tax credit", -credit);
      return Math.max(0, c.agi * p.rate - credit);
    },
    noDeductions: true,
  },
  WI: {
    before(c) {
      const rows = c.p.sd[c.status] || c.p.sd.single;
      let sd = 0;
      for (const [limit, base, rate, floor] of rows) {
        if (limit == null || c.agi < limit) {
          sd = Math.max(0, base - rate * Math.max(0, c.agi - floor));
          break;
        }
      }
      c.sd = sd;
    },
  },
};

/**
 * State income tax for the year.
 * @returns {{ tax:number, taxable:number, deduction:number, exemption:number, credit:number, steps:Array<{label:string, amount:number}> }}
 */
export function stateIncomeTax(state, ctx) {
  if (!state?.wageTax) return { tax: 0, taxable: 0, deduction: 0, exemption: 0, credit: 0, steps: [] };
  const status = ctx.status;
  const dependents = ctx.dependents || 0;
  const steps = [];
  const rule = STATE_RULES[state.rule] || {};
  const p = state.params || {};
  const ex = state.exemption;
  const c = {
    state,
    status,
    dependents,
    agi: clamp0(ctx.wages),
    federalTax: clamp0(ctx.federalTax),
    federal: ctx.federal,
    overtimePremium: ctx.overtimePremium || 0,
    p,
    sd: baseStandardDeduction(state, status, ctx.federal),
    sdLabel: "Standard deduction",
    exemptionDeduction: 0,
    exemptionCredit: 0,
    subtractions: [],
    subtract(label, amount) {
      this.subtractions.push({ label, amount });
    },
    step(label, amount) {
      steps.push({ label, amount: money(amount) });
    },
  };

  // Tips and overtime: states that follow the federal deductions, and states with an exclusion of their own.
  const fedTips = ctx.federalWorker?.tips || 0;
  const fedOvertime = ctx.federalWorker?.overtime || 0;
  const followTips = p.tipsOvertimeFollowFederal || p.tipsFollowFederal;
  const followOvertime = p.tipsOvertimeFollowFederal || p.overtimeFollowFederal;
  if (followTips && fedTips > 0) c.subtract("Tips deducted on the federal return", fedTips);
  if (followOvertime && fedOvertime > 0) c.subtract("Overtime premium deducted on the federal return", fedOvertime);
  if (p.ownTipsMax > 0 && (ctx.tips || 0) > 0) c.subtract(`Tips exclusion (up to ${dollars(p.ownTipsMax)})`, Math.min(p.ownTipsMax, ctx.tips));
  if (p.ownOvertimeMax > 0 && c.overtimePremium > 0) c.subtract(`Overtime exclusion (up to ${dollars(p.ownOvertimeMax)})`, Math.min(p.ownOvertimeMax, c.overtimePremium));

  if (ex) {
    let personal = ex[status] ?? ex.single ?? 0;
    let dependentCount = dependents;
    if (p.dependentSkipFirst) dependentCount = Math.max(0, dependents - 1);
    let dep = (ex.dependent || 0) * dependentCount;
    if (p.exemptionCliff) {
      const cliff = p.exemptionCliff[status] ?? p.exemptionCliff.single;
      if (cliff && c.agi > cliff) {
        personal = 0;
        dep = 0;
      }
    }
    if (ex.kind === "deduction") c.exemptionDeduction = personal + dep;
    else c.exemptionCredit = personal + dep;
  }

  rule.before?.(c);

  steps.push({ label: "Wages taxed by the state", amount: money(c.agi) });
  let taxable = c.agi;
  if (!rule.noDeductions) {
    if (c.sd > 0) steps.push({ label: c.sdLabel, amount: -money(c.sd) });
    if (c.exemptionDeduction > 0) steps.push({ label: "Exemptions", amount: -money(c.exemptionDeduction) });
    for (const row of c.subtractions) steps.push({ label: row.label, amount: -money(row.amount) });
    const subtractions = c.subtractions.reduce((sum, row) => sum + row.amount, 0);
    taxable = Math.max(0, c.agi - c.sd - c.exemptionDeduction - subtractions);
    steps.push({ label: "Taxable income", amount: money(taxable), total: true });
  }

  let tax;
  if (rule.tax) {
    tax = rule.tax(c, taxable);
    if (!rule.noDeductions) steps.push({ label: "Tax from the rate schedule", amount: money(tax) });
  } else {
    tax = bracketTax(taxable, stateBrackets(state, status));
    steps.push({ label: "Tax from the rate schedule", amount: money(tax) });
  }
  if (rule.after) tax = rule.after(c, tax, taxable);
  if (c.exemptionCredit > 0) {
    steps.push({ label: "Exemption credits", amount: -money(Math.min(tax, c.exemptionCredit)) });
    tax = Math.max(0, tax - c.exemptionCredit);
  }
  tax = Math.max(0, tax);
  steps.push({ label: `${state.name} income tax`, amount: money(tax), total: true });
  return { tax, taxable, deduction: c.sd, exemption: c.exemptionDeduction, credit: c.exemptionCredit, steps };
}

/* ───────────────────────────── payroll programs ───────────────────────────── */

function payrollLines(stateId, ficaWages, tables, employment) {
  if (employment === "contractor" || !stateId) return [];
  const lines = [];
  for (const program of tables.payroll.programs || []) {
    if (program.state !== stateId) continue;
    if (!(Number(program.employeeRate) > 0)) continue;
    const base = program.wageBase ? Math.min(ficaWages, program.wageBase) : ficaWages;
    let tax = base * program.employeeRate;
    if (program.annualMax != null) tax = Math.min(tax, program.annualMax);
    const annual = money(tax);
    if (!(annual > 0)) continue;
    lines.push({
      id: program.id,
      name: program.name,
      annual,
      why: program.upTo ? `${program.shortWhy} This is the most an employer may withhold; some pay part or all of it themselves.` : program.shortWhy,
      source: program.sourceLabel,
      sourceMeta: program.source || null,
      upTo: Boolean(program.upTo),
      tone: "state",
    });
  }
  return lines;
}

/* ───────────────────────────── local ───────────────────────────── */

function localLine(local, extra) {
  return {
    id: local.id,
    name: local.name,
    source: local.sourceLabel,
    sourceMeta: local.source || null,
    tone: "local",
    jurisdiction: local.name,
    confidence: local.confidence,
    ...extra,
  };
}

function localResult(input, ctx, tables) {
  const notes = [];
  const warnings = [];
  const residency = input.livesInPlace ? "resident" : "nonresident";
  if (input.customLocalPercent > 0) {
    const rate = input.customLocalPercent / 100;
    return {
      lines: [
        {
          id: "custom-local",
          name: `Custom local tax (${pctLabel(rate)})`,
          annual: money(ctx.localGross * rate),
          why: "The local percent you entered, applied to gross wages. It stands in for a city or county that is not in the list.",
          source: "Custom rate",
          sourceMeta: null,
          tone: "local",
          residency,
          jurisdiction: "Custom",
          rateOrNote: pctLabel(rate),
        },
      ],
      notes,
      warnings,
    };
  }
  if (!input.localId) return { lines: [], notes, warnings };
  const local = (tables.local.jurisdictions || []).find((row) => row.id === input.localId);
  if (!local) {
    const msg = "That city or county is not in the 2026 local file, so no local tax was added.";
    notes.push(msg);
    warnings.push(msg);
    return { lines: [], notes, warnings, notModeled: true };
  }
  if (local.state !== input.state) {
    notes.push(`${local.name} belongs to ${stateName(tables, local.state)}, not the state you selected, so it was not applied.`);
    return { lines: [], notes, warnings };
  }
  if (local.method === "reference") {
    notes.push("The District of Columbia tax is already the income-tax line above. There is no second city tax on top.");
    return { lines: [], notes, warnings };
  }
  if (!localIsSourced(local)) {
    const msg = `${local.name} has no sourced 2026 rate, so no local tax was added. Enter a custom local percent if you know the rate.`;
    notes.push(msg);
    warnings.push(msg);
    return { lines: [], notes, warnings, notModeled: true, localId: local.id };
  }
  if (local.confidence === "estimated") {
    const msg = `${local.name} local tax is an estimate. Check the current rate with the local tax office.`;
    notes.push(msg);
    warnings.push(msg);
  }
  const residentOnly = local.appliesWhen === "resident-only" || local.method === "layered-threshold";
  if (residentOnly && !input.livesInPlace) {
    notes.push(local.residentOnlyNote || `${local.name} tax applies to residents. It was left off because you marked that you work there and live somewhere else.`);
    return { lines: [], notes, warnings };
  }

  const lines = [];

  if (local.method === "brackets") {
    const brackets = local.brackets[input.filingStatus] || local.brackets.single;
    lines.push(
      localLine(local, {
        annual: money(bracketTax(ctx.stateTaxable, brackets)),
        why: local.residentOnlyNote ? `${local.name} resident tax on income after the state deduction. ${local.residentOnlyNote}` : `${local.name} ${residency} tax, on the same taxable income as the state.`,
        residency,
        rateOrNote: "Bracket schedule on state taxable income",
      }),
    );
  } else if (local.method === "tiered-flat") {
    const rows = local.tiers[input.filingStatus] || local.tiers.single;
    const rate = tier(rows, ctx.stateTaxable);
    lines.push(
      localLine(local, {
        annual: money(ctx.stateTaxable * rate),
        why: `${local.name} charges one rate on all of your state taxable income, and the rate depends on how much that is. At this income it is ${pctLabel(rate)}.`,
        residency,
        rateOrNote: pctLabel(rate),
      }),
    );
  } else if (local.method === "surcharge") {
    if (input.livesInPlace) {
      lines.push(
        localLine(local, {
          name: `${local.name} resident surcharge`,
          annual: money(ctx.stateIncome * local.residentSurchargeOfStateTax),
          why: `Residents pay ${pctLabel(local.residentSurchargeOfStateTax)} of their New York State income tax. It is not a flat percent of wages.`,
          residency: "resident",
          rateOrNote: `${pctLabel(local.residentSurchargeOfStateTax)} of state income tax`,
        }),
      );
    } else {
      lines.push(
        localLine(local, {
          name: `${local.name} nonresident earnings tax`,
          annual: money(ctx.localGross * local.nonresidentRate),
          why: `Nonresidents who work in ${local.name} pay ${pctLabel(local.nonresidentRate)} of wages.`,
          residency: "nonresident",
          rateOrNote: pctLabel(local.nonresidentRate),
        }),
      );
    }
  } else if (local.method === "layered-threshold") {
    for (const layer of local.layers) {
      let tax = 0;
      const bits = [];
      for (const row of layer.tiers) {
        const threshold = row.threshold[input.filingStatus] ?? row.threshold.single;
        tax += Math.max(0, ctx.stateTaxable - threshold) * row.rate;
        bits.push(`${pctLabel(row.rate)} above ${dollars(threshold)}`);
      }
      lines.push(
        localLine(local, {
          id: layer.id,
          name: layer.name,
          annual: money(tax),
          why:
            tax > 0
              ? `${layer.name}: ${bits.join(", ")} of Oregon taxable income. A resident income tax, usually withheld only if you ask your employer.`
              : `${layer.name} does not start until income passes the threshold (${bits.join("; ")}). Nothing is added at this pay.`,
          residency,
          rateOrNote: bits.join("; "),
        }),
      );
    }
  } else if (local.method === "fixed") {
    const applies = !local.minMonthlyWages || ctx.localGross / 12 >= local.minMonthlyWages;
    lines.push(
      localLine(local, {
        annual: applies ? money(local.monthly * 12) : 0,
        why: applies
          ? `A flat ${dollars(local.monthly * 100) === "$0" ? "" : `$${local.monthly.toFixed(2)}`} a month for people who work in ${local.name}. It is not a percent of pay.`
          : `${local.name} charges a flat monthly amount only in months you earn at least ${dollars(local.minMonthlyWages)} there.`,
        residency,
        rateOrNote: `$${local.monthly.toFixed(2)} a month`,
      }),
    );
  } else {
    const rate = input.livesInPlace ? local.residentRate : local.nonresidentRate ?? local.residentRate;
    let base = ctx.localGross;
    let baseNote = "It is charged on gross wages. 401(k) and benefit contributions do not reduce it.";
    if (local.base === "state-taxable") {
      base = ctx.stateTaxable;
      baseNote = "It is charged on the same taxable income as the state tax.";
    } else if (local.base === "medicare-wages") {
      base = ctx.medicareWages;
      baseNote = "It is charged on Medicare wages: traditional 401(k) contributions stay in, and cafeteria-plan premiums, FSA and HSA amounts come out.";
    } else if (local.base === "federal-wages") {
      base = ctx.federalWages;
      baseNote = "It is charged on the same wages as federal income tax, so 401(k) and cafeteria-plan amounts come out.";
    } else if (local.base === "state-wages") {
      base = ctx.stateWages;
      baseNote = "It is charged on the same wages the state taxes.";
    }
    if (local.exemptionPerPerson > 0) {
      const off = local.exemptionPerPerson * people(input.filingStatus, input.dependentsCount);
      base = Math.max(0, base - off);
      baseNote += ` ${dollars(off)} of exemptions comes off first.`;
    }
    lines.push(
      localLine(local, {
        annual: money(base * rate),
        why: `${input.livesInPlace ? "Resident" : "Nonresident"} rate ${pctLabel(rate)}. ${baseNote}`,
        residency,
        rateOrNote: pctLabel(rate),
      }),
    );
  }

  if (local.fixedAnnual > 0 && (!local.fixedAnnualMinWages || ctx.localGross >= local.fixedAnnualMinWages)) {
    lines.push(
      localLine(local, {
        id: `${local.id}-lst`,
        name: local.fixedAnnualName || `${local.name} local services tax`,
        annual: money(local.fixedAnnual),
        why: `A flat ${dollars(local.fixedAnnual)} a year for people who work there, taken in small amounts from each paycheck.`,
        residency,
        rateOrNote: `${dollars(local.fixedAnnual)} a year`,
      }),
    );
  }
  return { lines, notes, warnings };
}

/* ───────────────────────────── the calculation ───────────────────────────── */

export function calculateTakeHome(raw, tables) {
  const input = normalizeInput(raw);
  const notes = [];
  const warnings = [];
  const periods = PERIODS[input.frequency];
  const federal = tables.federal;
  const fica = tables.fica;
  const state = findState(tables, input.state);
  const contractor = input.employment === "contractor";

  /* gross */
  let gross = 0;
  let overtimePremium = 0;
  const blockDetail = [];
  if (input.rateBlocks.length) {
    const scale = input.rateBlockUnit === "period" ? periods : input.weeksPerYear;
    for (const block of input.rateBlocks) {
      const annual = money(block.hours * block.rate * scale);
      blockDetail.push({ block, annual });
      // An overtime line's rate is the whole overtime rate; at time and a half, a third of it is the premium.
      if (block.overtime) overtimePremium += annual / 3;
    }
    gross = blockDetail.reduce((sum, row) => sum + row.annual, 0) + input.tipsAnnual + input.bonusAnnual;
    notes.push(
      input.rateBlockUnit === "period"
        ? "Rate blocks are the hours on this paycheck. Each line is hours times its own dollar rate, repeated for every paycheck in the year."
        : "Rate blocks are hours per week, multiplied by paid weeks. Each line is hours times its own dollar rate.",
    );
  } else if (input.payType === "hourly") {
    const regular = input.hourlyRate * input.hoursPerWeek * input.weeksPerYear;
    const overtime = input.hourlyRate * input.overtimeMultiplier * input.overtimeHoursPerWeek * input.weeksPerYear;
    // Only the "half" of time and a half counts as premium, whatever the multiplier.
    overtimePremium = input.hourlyRate * Math.min(0.5, Math.max(0, input.overtimeMultiplier - 1)) * input.overtimeHoursPerWeek * input.weeksPerYear;
    gross = regular + overtime + input.tipsAnnual + input.bonusAnnual;
  } else {
    gross = input.grossAnnual + input.tipsAnnual + input.bonusAnnual;
  }
  if (input.overtimePremiumAnnual != null) overtimePremium = Math.min(input.overtimePremiumAnnual, gross);
  gross = money(gross);
  overtimePremium = money(overtimePremium);

  const expenses = contractor ? money(Math.min(input.contractorExpensesAnnual, gross)) : 0;
  const profit = money(Math.max(0, gross - expenses));
  const items = buildDeductionItems(input, contractor ? profit : gross);

  if (!state && input.state) warnings.push("That state code is not in the 2026 table. State income tax was left at $0.");
  if (!input.state) notes.push("Choose a state. Until you do, only federal tax, Social Security and Medicare are estimated.");

  /* contribution limits */
  const limits = federal.limits || {};
  const traditional = items.find((item) => item.type === "401k")?.annual || 0;
  const roth = items.find((item) => item.type === "roth")?.annual || 0;
  if (traditional + roth > (limits.electiveDeferral401k || 24500)) {
    warnings.push(
      `Traditional and Roth contributions together are above the 2026 employee limit of ${dollars(limits.electiveDeferral401k || 24500)}. Catch-up contributions are not added automatically. The amount you entered is still used.`,
    );
  }
  const hsa = items.find((item) => item.type === "hsa")?.annual || 0;
  if (hsa > (limits.hsaFamily || 8750)) warnings.push("HSA contributions are above the 2026 family limit. The amount you entered is still used.");
  else if (hsa > (limits.hsaSelfOnly || 4400)) notes.push("The HSA amount is above the 2026 self-only limit, which is fine with family coverage.");
  const fsa = items.find((item) => item.type === "fsa")?.annual || 0;
  if (fsa > (limits.healthFsa || 3400)) warnings.push("The health FSA amount is above the 2026 limit. The amount you entered is still used.");

  /* which wages each tax sees */
  const statePretax = state?.pretax || {};
  let federalReduction = 0;
  let stateReduction = 0;
  let ficaReduction = 0;
  let pretaxSum = 0;
  let posttaxSum = 0;
  const keptInState = [];
  for (const item of items) {
    if (item.bucket === "pretax") {
      pretaxSum += item.annual;
      if (item.federal) federalReduction += item.annual;
      if (statePretax[item.kind] === false) keptInState.push(item.label);
      else stateReduction += item.annual;
      if (item.fica) ficaReduction += item.annual;
    } else {
      posttaxSum += item.annual;
    }
  }
  pretaxSum = money(pretaxSum);
  posttaxSum = money(posttaxSum);

  const ssBase = fica.socialSecurity.wageBase;
  const addlThreshold = fica.additionalMedicare.thresholds[input.filingStatus] ?? 200000;

  let federalWages;
  let ficaWages;
  let stateWages;
  let ssTax = 0;
  let medTax = 0;
  let addlTax = 0;
  let halfSe = 0;
  let seBase = 0;

  if (contractor) {
    seBase = profit * fica.selfEmploymentFactor;
    ssTax = Math.min(seBase, ssBase) * fica.socialSecurity.selfEmployedRate;
    medTax = seBase * fica.medicare.selfEmployedRate;
    addlTax = Math.max(0, seBase - addlThreshold) * fica.additionalMedicare.rate;
    halfSe = (ssTax + medTax) * 0.5;
    federalWages = Math.max(0, profit - halfSe - federalReduction);
    stateWages = Math.max(0, profit - halfSe - stateReduction);
    ficaWages = 0;
    warnings.push("Contractor mode is not a Schedule C. Self-employment tax is estimated on 92.35% of profit after expenses, and the qualified business income deduction is not included.");
    notes.push(`Half of the Social Security and Medicare part of self-employment tax (${dollars(halfSe)}) is subtracted before income tax.`);
    notes.push("A rough quarterly set-aside is income tax plus self-employment tax, state and local, divided by four. It is not a 1040-ES voucher.");
  } else {
    federalWages = Math.max(0, gross - federalReduction);
    ficaWages = Math.max(0, gross - ficaReduction);
    stateWages = Math.max(0, gross - stateReduction);
    ssTax = Math.min(ficaWages, ssBase) * fica.socialSecurity.employeeRate;
    medTax = ficaWages * fica.medicare.employeeRate;
    addlTax = Math.max(0, ficaWages - addlThreshold) * fica.additionalMedicare.rate;
  }

  /* federal income tax */
  const magi = federalWages + input.w4.otherIncome;
  const worker = workerDeductionAmounts(input, federal, magi, input.tipsAnnual, overtimePremium);
  const workerDeduction = money(worker.tips + worker.overtime);
  const credit = childCredit(input, federal, magi);
  const federalDetail = federalTaxDetail(federalWages, input, federal, workerDeduction, credit);
  const federalIncome = money(federalDetail.tax);
  ssTax = money(ssTax);
  medTax = money(medTax);
  addlTax = money(addlTax);

  if (worker.overtime > 0) {
    notes.push(
      `${dollars(worker.overtime)} of overtime premium pay is deducted before federal income tax under the 2025 through 2028 overtime deduction. Social Security and Medicare still apply to it. Your paychecks reflect this only if your W-4 does; otherwise it comes back as a refund.`,
    );
  }
  if (worker.tips > 0) {
    notes.push(`${dollars(worker.tips)} of tips is deducted before federal income tax under the 2025 through 2028 tips deduction. Social Security and Medicare still apply to it.`);
  }
  if (input.workerDeductions && input.filingStatus === "mfs" && (input.tipsAnnual > 0 || overtimePremium > 0)) {
    notes.push("The federal tips and overtime deductions are not available to married people filing separately, so they were not applied.");
  }

  /* state income tax */
  let stateIncome = 0;
  let stateTaxable = 0;
  let stateSteps = [];
  if (state?.wageTax) {
    const computed = stateIncomeTax(state, {
      wages: stateWages,
      status: input.filingStatus,
      dependents: input.dependentsCount,
      federalTax: federalDetail.tax,
      federal,
      overtimePremium,
      tips: input.tipsAnnual,
      federalWorker: worker,
    });
    stateIncome = money(computed.tax);
    stateTaxable = money(computed.taxable);
    stateSteps = computed.steps;
  }

  if (keptInState.length && state?.wageTax) {
    notes.push(`${state.name} does not exclude these from wages the way the federal return does, so they stayed in the state wage base: ${[...new Set(keptInState)].join(", ")}.`);
  }
  if (traditional > 0 && !contractor) notes.push("Traditional 401(k) reduced income-tax wages. It did not reduce Social Security or Medicare wages.");
  if (input.w4.multipleJobs) notes.push("The multiple-jobs box is estimated with half the standard deduction and half-width brackets, as the IRS percentage method does.");
  if (state?.confidence === "estimated") {
    const msg = `Part of the ${state.name} figure is estimated because the state had not published every 2026 amount when it was last checked. See the notes for ${state.name}.`;
    warnings.push(msg);
  }

  if (input.workState && input.workState !== input.state && input.state) {
    const partners = tables.states.reciprocity?.[input.state] || [];
    const home = stateName(tables, input.state);
    const work = stateName(tables, input.workState);
    const msg = partners.includes(input.workState)
      ? `${home} and ${work} have a reciprocity agreement, so wages are taxed by ${home} only. Your employer needs the exemption certificate before it stops withholding ${work} tax.`
      : `You work in ${work} and live in ${home}. This estimate taxes ${home} only. It does not work out a ${work} nonresident return or the credit ${home} gives for it.`;
    warnings.push(msg);
  }

  /* state payroll programs */
  const payroll = payrollLines(input.state, contractor ? 0 : ficaWages, tables, input.employment);
  const payrollSum = money(payroll.reduce((sum, line) => sum + line.annual, 0));

  /* local */
  const localGross = contractor ? profit : gross;
  const local = localResult(input, { localGross, stateTaxable, medicareWages: contractor ? profit : ficaWages, federalWages, stateWages, stateIncome }, tables);
  notes.push(...local.notes);
  warnings.push(...(local.warnings || []));
  const localSum = money(local.lines.reduce((sum, line) => sum + line.annual, 0));
  const hasLocalChoice = (tables.local.jurisdictions || []).some((row) => row.state === input.state && row.method !== "reference");
  if (!local.lines.length && !input.localId && !(input.customLocalPercent > 0) && hasLocalChoice) {
    notes.push(`Some cities or counties in ${state?.name || "this state"} charge their own income tax. None is selected, so no local tax is included.`);
  }

  if (!contractor && input.state) {
    for (const gap of tables.payroll.notModeledPrograms || []) {
      if (gap.state === input.state) notes.push(gap.note);
    }
  }

  const extraAnnual = money(input.w4.extraWithholdingPerPeriod * periods);
  const taxSum = money(federalIncome + extraAnnual + ssTax + medTax + addlTax + stateIncome + payrollSum + localSum);
  const exactNet = money(gross - expenses - pretaxSum - posttaxSum - taxSum);
  if (exactNet < 0) warnings.push("Deductions and taxes are larger than gross pay, so net is negative. Check the amounts.");

  const annual = {
    gross,
    expenses,
    pretax: pretaxSum,
    posttax: posttaxSum,
    federalWages: money(federalWages),
    ficaWages: money(contractor ? seBase : ficaWages),
    stateWages: money(stateWages),
    federalTaxable: money(federalDetail.taxable),
    stateTaxable,
    federalIncome,
    extraWithholding: extraAnnual,
    socialSecurity: ssTax,
    medicare: medTax,
    additionalMedicare: addlTax,
    selfEmployment: contractor ? money(ssTax + medTax + addlTax) : 0,
    stateIncome,
    statePayroll: payrollSum,
    local: localSum,
    taxes: taxSum,
    net: exactNet,
    halfSelfEmploymentDeduction: money(halfSe),
    overtimePremium,
    overtimeDeduction: money(worker.overtime),
    tipsDeduction: money(worker.tips),
    childCredit: money(federalDetail.creditsUsed),
  };

  /* the stub, line by line */
  const lineDraft = [];
  const push = (row) => lineDraft.push(row);
  if (blockDetail.length) {
    const unit = input.rateBlockUnit === "period" ? "this paycheck" : "per week";
    blockDetail.forEach((row, index) => {
      const rate = row.block.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      push({ id: `block-${index}`, label: blockLineLabel(row.block), annual: row.annual, section: "gross", tone: "ink", why: `${row.block.hours} h ${unit} × $${rate}/hr. ${blockKindNote(row.block)}`, source: "Rate block" });
    });
    if (input.tipsAnnual > 0) push({ id: "tips", label: "Tips", annual: money(input.tipsAnnual), section: "gross", tone: "ink", why: "Added on top of the rate blocks for the year.", source: "" });
    if (input.bonusAnnual > 0) push({ id: "bonus", label: "Bonus", annual: money(input.bonusAnnual), section: "gross", tone: "ink", why: "Added on top of the rate blocks for the year.", source: "" });
  } else {
    push({ id: "gross", label: contractor ? "Gross receipts" : "Gross pay", annual: gross, section: "gross", tone: "ink", why: "", source: "" });
  }
  if (expenses > 0) push({ id: "expenses", label: "Business expenses", annual: expenses, section: "expense", tone: "muted", why: "Subtracted before self-employment tax.", source: "" });
  for (const item of items.filter((row) => row.bucket === "pretax")) {
    let why = "Pre-tax. Taken out before federal income tax.";
    if (item.type === "401k") why = "Reduces federal income tax and, in most states, state income tax. It does not reduce Social Security or Medicare.";
    else if (item.fica) why = "Reduces federal income tax, Social Security and Medicare, and state tax in most states.";
    push({ id: item.type, label: item.label, annual: item.annual, section: "pretax", tone: "benefit", why, source: item.type === "401k" ? "IRS limit · 2026" : "" });
  }

  const stdText = dollars(federalDetail.standardDeductionUsed);
  let federalWhy = input.w4.multipleJobs
    ? `2026 brackets with the multiple-jobs box on: half the standard deduction (${stdText}) and half-width brackets.`
    : `2026 brackets after the ${stdText} standard deduction, worked out for the year and spread over your paychecks.`;
  if (workerDeduction > 0) federalWhy += ` ${dollars(workerDeduction)} of ${worker.tips > 0 && worker.overtime > 0 ? "tips and overtime premium" : worker.tips > 0 ? "tips" : "overtime premium"} is deducted first.`;
  if (federalDetail.creditsUsed > 0) federalWhy += ` ${dollars(federalDetail.creditsUsed)} of credits for children and dependents comes off the tax.`;
  push({ id: "federal", label: "Federal income tax", annual: federalIncome, section: "tax", tone: "federal", why: federalWhy, source: "IRS Rev. Proc. 2025-32" });
  if (extraAnnual > 0) push({ id: "extra", label: "Extra federal withholding", annual: extraAnnual, section: "tax", tone: "federal", why: "W-4 Step 4(c), added to each paycheck.", source: "Form W-4" });

  if (contractor) {
    push({ id: "ss", label: "Self-employment Social Security", annual: ssTax, section: "tax", tone: "fica", why: `12.4% of 92.35% of profit, up to the ${dollars(ssBase)} wage base.`, source: "SSA wage base · 2026" });
    push({ id: "medicare", label: "Self-employment Medicare", annual: medTax, section: "tax", tone: "fica", why: "2.9% of 92.35% of profit, with no cap.", source: "IRS · 2026" });
  } else {
    push({ id: "ss", label: "Social Security", annual: ssTax, section: "tax", tone: "fica", why: `6.2% of wages up to ${dollars(ssBase)}. Traditional 401(k) contributions do not reduce it.`, source: "SSA wage base · 2026" });
    push({ id: "medicare", label: "Medicare", annual: medTax, section: "tax", tone: "fica", why: "1.45% of wages, with no cap.", source: "IRS Pub. 15 · 2026" });
  }
  if (addlTax > 0) {
    push({ id: "addl", label: "Additional Medicare", annual: addlTax, section: "tax", tone: "fica", why: `0.9% of wages above ${dollars(addlThreshold)} for this filing status. Employers start withholding it at $200,000 whatever your status; the difference settles on your return.`, source: "IRS · Additional Medicare Tax" });
  }
  if (state?.wageTax) {
    push({ id: "state", label: `${state.name} income tax`, annual: stateIncome, section: "tax", tone: "state", why: state.why, source: `${state.name} · 2026` });
  }
  for (const program of payroll) push({ id: program.id, label: program.name, annual: program.annual, section: "tax", tone: "state", why: program.why, source: program.source });
  for (const line of local.lines) push({ id: line.id, label: line.name, annual: line.annual, section: "tax", tone: "local", why: line.why, source: line.source });
  for (const item of items.filter((row) => row.bucket === "posttax")) {
    push({ id: item.type, label: item.label, annual: item.annual, section: "posttax", tone: "benefit", why: "Taken after tax. It does not change any tax line.", source: "" });
  }

  const lines = lineDraft.map((line) => {
    const period = line.id === "extra" ? input.w4.extraWithholdingPerPeriod : money(line.annual / periods);
    return { ...line, period, annualized: money(period * periods) };
  });
  const grossPeriod = money(gross / periods);
  const withheldPeriod = money(lines.filter((line) => line.section !== "gross").reduce((sum, line) => sum + line.period, 0));
  const netPeriod = money(grossPeriod - withheldPeriod);
  lines.push({
    id: "net",
    label: "Take-home pay",
    annual: exactNet,
    period: netPeriod,
    annualized: money(netPeriod * periods),
    section: "net",
    tone: "net",
    why: "Gross pay minus every line above.",
    source: "",
  });

  const benefits = money(pretaxSum + posttaxSum);
  const ficaTotal = money(ssTax + medTax + addlTax);
  const stateTotal = money(stateIncome + payrollSum);
  const federalTotal = money(federalIncome + extraAnnual);
  const chart = { gross, keep: Math.max(0, exactNet), federal: federalTotal, fica: ficaTotal, state: stateTotal, local: localSum, benefits, expenses };

  const keepPer100 = gross > 0 ? money((exactNet / gross) * 100) : 0;
  const effectiveTaxRate = gross > 0 ? taxSum / gross : 0;
  const quarterlySetAside = contractor ? money((federalIncome + stateIncome + localSum + ssTax + medTax + addlTax) / 4) : null;

  const sourceBucket = [];
  const pushSource = (entry) => {
    if (entry?.name) sourceBucket.push({ name: entry.name, url: entry.url || "" });
  };
  for (const src of federal.sources || []) pushSource(src);
  for (const src of fica.sources || []) pushSource(src);
  for (const src of state?.sources || []) pushSource(src);
  for (const program of payroll) pushSource(program.sourceMeta);
  for (const line of local.lines) pushSource(line.sourceMeta);
  const seen = new Set();
  const sources = sourceBucket.filter((src) => {
    const key = `${src.name}|${src.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const federalSteps = [
    { label: contractor ? "Profit after half of self-employment tax" : "Wages", amount: money(federalWages + (contractor ? 0 : federalReduction)) },
    ...(federalReduction > 0 && !contractor ? [{ label: "Pre-tax deductions", amount: -money(federalReduction) }] : []),
    ...(input.w4.otherIncome > 0 ? [{ label: "Other income", amount: money(input.w4.otherIncome) }] : []),
    { label: "Standard deduction", amount: -money(federalDetail.standardDeductionUsed) },
    ...(input.w4.deductions > 0 ? [{ label: "Other deductions", amount: -money(input.w4.deductions) }] : []),
    ...(worker.overtime > 0 ? [{ label: "Overtime premium deduction", amount: -money(worker.overtime) }] : []),
    ...(worker.tips > 0 ? [{ label: "Tips deduction", amount: -money(worker.tips) }] : []),
    { label: "Taxable income", amount: money(federalDetail.taxable), total: true },
    { label: "Tax from the 2026 brackets", amount: money(federalDetail.beforeCredit) },
    ...(federalDetail.creditsUsed > 0 ? [{ label: "Credits for children and dependents", amount: -money(federalDetail.creditsUsed) }] : []),
    { label: "Federal income tax", amount: federalIncome, total: true },
  ];

  return {
    input,
    periods,
    frequencyLabel: FREQUENCY_LABELS[input.frequency],
    filingLabel: FILING_LABELS[input.filingStatus],
    state,
    annual,
    lines,
    chart,
    periodNet: netPeriod,
    grossPeriod,
    monthlyNet: money((netPeriod * periods) / 12),
    annualizedNet: money(netPeriod * periods),
    keepPer100,
    effectiveTaxRate,
    federalMarginalRate: federalDetail.marginal,
    quarterlySetAside,
    notes,
    warnings,
    math: { federal: federalSteps, state: stateSteps },
    method: federal.method,
    statePayrollTaxes: payroll.map((program) => ({ id: program.id, name: program.name, annual: program.annual, period: money(program.annual / periods), source: program.source, upTo: program.upTo })),
    localTaxes: local.lines.map((line) => ({ id: line.id, name: line.name, jurisdiction: line.jurisdiction || line.name, residency: line.residency, annual: line.annual, period: money(line.annual / periods), rateOrNote: line.rateOrNote || "", source: line.source || "", confidence: line.confidence || null })),
    dataGaps: { localNotModeled: Boolean(local.notModeled), stateEstimated: state?.confidence === "estimated" },
    sources,
  };
}

/* ───────────────────────────── helpers built on the calculation ───────────────────────────── */

export function compareBonus(raw, tables) {
  const bonus = clamp0(num(raw.bonusAnnual));
  const without = calculateTakeHome({ ...raw, bonusAnnual: 0 }, tables);
  const withBonus = calculateTakeHome({ ...raw, bonusAnnual: bonus }, tables);
  const delta = (key) => money(withBonus.annual[key] - without.annual[key]);
  const supplementalRate = tables.federal.limits?.supplementalWithholdingRate ?? 0.22;
  return {
    bonus,
    without,
    withBonus,
    aggregate: {
      federal: delta("federalIncome"),
      socialSecurity: delta("socialSecurity"),
      medicare: delta("medicare"),
      additionalMedicare: delta("additionalMedicare"),
      state: delta("stateIncome"),
      payroll: delta("statePayroll"),
      local: delta("local"),
      net: delta("net"),
    },
    supplementalFederal: money(bonus * supplementalRate),
    supplementalRate,
  };
}

export function calculateEmployerCost(raw, tables) {
  const employee = calculateTakeHome({ ...raw, employment: "w2" }, tables);
  const fica = tables.fica;
  const ficaWages = employee.annual.ficaWages;
  const socialSecurity = money(Math.min(ficaWages, fica.socialSecurity.wageBase) * fica.socialSecurity.employerRate);
  const medicare = money(ficaWages * fica.medicare.employerRate);
  const futa = money(Math.min(employee.annual.gross, 7000) * 0.006);
  const programs = (tables.payroll.programs || [])
    .filter((program) => program.state === employee.input.state && program.employerRate > 0)
    .map((program) => {
      const base = program.wageBase ? Math.min(ficaWages, program.wageBase) : ficaWages;
      return { id: program.id, name: `${program.name} (employer share)`, annual: money(base * program.employerRate) };
    });
  const suta = employee.input.sutaRate > 0 ? money(employee.annual.gross * (employee.input.sutaRate / 100)) : 0;
  const retirement = employee.input.employerRetirementAnnual;
  const benefits = employee.input.employerBenefitsAnnual;
  const programSum = money(programs.reduce((sum, line) => sum + line.annual, 0));
  const total = money(employee.annual.gross + socialSecurity + medicare + futa + programSum + suta + retirement + benefits);
  return { employee, employer: { socialSecurity, medicare, futa, programs, suta, retirement, benefits, total, ficaWages } };
}

export function scenarioDeltas(baseResult, nextResult) {
  const fica = (r) => r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;
  return {
    periodNet: money(nextResult.periodNet - baseResult.periodNet),
    annualNet: money(nextResult.annual.net - baseResult.annual.net),
    federal: money(nextResult.annual.federalIncome - baseResult.annual.federalIncome),
    state: money(nextResult.annual.stateIncome + nextResult.annual.statePayroll - baseResult.annual.stateIncome - baseResult.annual.statePayroll),
    local: money(nextResult.annual.local - baseResult.annual.local),
    fica: money(fica(nextResult) - fica(baseResult)),
  };
}

/** What you keep of the next `step` dollars of salary, as a share (0 to 1). */
export function keepOfNext(raw, tables, step = 1000) {
  const base = calculateTakeHome(raw, tables);
  const bump = base.input.payType === "hourly" && !base.input.rateBlocks.length
    ? { ...raw, bonusAnnual: (num(raw.bonusAnnual) || 0) + step }
    : { ...raw, grossAnnual: (num(raw.grossAnnual) || 0) + step, bonusAnnual: num(raw.bonusAnnual) || 0 };
  const next = calculateTakeHome(bump, tables);
  const grossDelta = next.annual.gross - base.annual.gross;
  return grossDelta > 0 ? (next.annual.net - base.annual.net) / grossDelta : 0;
}

/**
 * The salary that produces a wanted take-home for the year (bisection; the
 * net is increasing in gross). Returns the result for that salary too.
 */
export function grossForNet(targetNetAnnual, raw, tables) {
  const target = clamp0(num(targetNetAnnual));
  const run = (gross) => calculateTakeHome({ ...raw, payType: "salary", grossAnnual: gross, rateBlocks: [] }, tables);
  let lo = 0;
  let hi = Math.max(1000, target * 2.5 + 20000);
  for (let i = 0; i < 40 && run(hi).annual.net < target; i += 1) hi *= 1.6;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (run(mid).annual.net < target) lo = mid;
    else hi = mid;
    if (hi - lo < 0.005) break;
  }
  const gross = money(hi);
  return { gross, result: run(gross) };
}
