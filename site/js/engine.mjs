/**
 * LocalTakehome calculation engine.
 * calculateTakeHome(input, tables) -> result
 * No DOM and no network. Annualize, then split into paychecks and round to cents.
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


export function localIsSourced(local) {
  if (!local) return false;
  if (local.placeholder === true || local.todo === true) return false;
  const conf = local.confidence;
  if (conf === "todo" || conf === "missing" || conf === "unsourced" || conf === "placeholder") return false;
  if (!["published", "modeled", "estimated"].includes(conf)) return false;
  if (local.method === "reference") return true;
  return Boolean(local.source?.url || local.source?.name || local.sourceLabel);
}

/** Schema / integrity errors for tax JSON. Empty array means pass. */
export function assertTaxDataIntegrity(tables) {
  const errors = [];
  if (!tables?.federal?.sources?.length) errors.push("federal-2026.json: missing sources");
  if (!(tables?.federal?.standardDeduction?.single > 0)) errors.push("federal-2026.json: standard deduction missing");
  if (!tables?.fica?.sources?.length) errors.push("fica-2026.json: missing sources");
  if (!(tables?.fica?.socialSecurity?.wageBase > 0)) errors.push("fica-2026.json: wage base missing");
  if (!(tables?.fica?.socialSecurity?.employeeRate > 0)) errors.push("fica-2026.json: SS rate missing");

  for (const state of tables?.states?.states || []) {
    if (state.placeholder === true || state.todo === true) {
      errors.push(`states-2026.json: ${state.id} marked placeholder/todo`);
    }
    if (!["published", "modeled", "estimated"].includes(state.confidence)) {
      errors.push(`states-2026.json: ${state.id} missing/invalid confidence`);
    }
    if (!(state.source?.url || state.source?.name || state.sourceLabel || (tables.states.sources || []).length)) {
      errors.push(`states-2026.json: ${state.id} missing source`);
    }
    if (state.wageTax) {
      const hasRate = state.flat
        ? Number(state.rate) > 0 || state.special === "utah"
        : (state.brackets?.single || []).some((b) => Number(b.rate) > 0) || state.special === "utah";
      if (!hasRate && state.special !== "utah") {
        errors.push(`states-2026.json: ${state.id} wageTax true but no positive rate (would quiet-$0)`);
      }
    }
  }

  for (const local of tables?.local?.jurisdictions || []) {
    if (local.placeholder === true || local.todo === true) {
      errors.push(`local-2026.json: ${local.id} marked placeholder/todo — remove or source before shipping`);
    }
    if (!["published", "modeled", "estimated"].includes(local.confidence)) {
      errors.push(`local-2026.json: ${local.id} missing/invalid confidence`);
    }
    if (local.method !== "reference" && !localIsSourced(local)) {
      errors.push(`local-2026.json: ${local.id} not sourced`);
    }
    if (local.method === "flat") {
      if (!(Number(local.residentRate) > 0)) {
        errors.push(`local-2026.json: ${local.id} flat residentRate must be > 0 (no quiet $0 stub)`);
      }
    }
  }

  for (const program of tables?.payroll?.programs || []) {
    if (program.placeholder === true || program.todo === true) {
      errors.push(`state-payroll-2026.json: ${program.id} marked placeholder/todo`);
    }
    if (!["published", "modeled", "estimated"].includes(program.confidence)) {
      errors.push(`state-payroll-2026.json: ${program.id} missing/invalid confidence`);
    }
    if (!(program.source?.url || program.source?.name || program.sourceLabel)) {
      errors.push(`state-payroll-2026.json: ${program.id} missing source`);
    }
    if (!(Number(program.employeeRate) > 0)) {
      errors.push(`state-payroll-2026.json: ${program.id} employeeRate must be > 0 or omit the program`);
    }
  }
  return errors;
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

function normalizeRetirement(value) {
  if (value == null) return { mode: "dollar", value: 0 };
  if (typeof value === "number") return { mode: "dollar", value: clamp0(value) };
  const mode = value.mode === "percent" ? "percent" : "dollar";
  let amount = clamp0(num(value.value));
  // Percent deferrals cannot exceed 100% of pay in this model.
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
    customPretaxReducesFica: pickDefined(
      pretaxNest.customPretaxReducesFica,
      pretaxNest.reducesFica,
      d.customPretaxReducesFica,
    ),
    customPosttax: pick(["customPosttax", "other", "otherPosttax"], posttaxNest),
  };
}

function normalizeRemoteSplit(raw) {
  const list = Array.isArray(raw.remoteSplit) ? raw.remoteSplit : [];
  return list
    .map((row) => ({
      state: String(row?.state || "").toUpperCase(),
      pct: clamp0(num(row?.pct ?? row?.percent ?? row?.share)),
    }))
    .filter((row) => row.state && row.pct > 0);
}

function resolveLocalSelection(raw) {
  const residentLocalId = String(pickDefined(raw.residentLocalId, raw.localId, "") || "");
  const workLocalId = String(raw.workLocalId || "");
  const livesExplicit =
    raw.livesInWorkCity !== undefined
      ? Boolean(raw.livesInWorkCity)
      : raw.livesInPlace !== undefined
        ? Boolean(raw.livesInPlace)
        : true;
  let localId = residentLocalId || workLocalId;
  let livesInPlace = livesExplicit;
  if (workLocalId && residentLocalId && workLocalId !== residentLocalId && !livesExplicit) {
    localId = workLocalId;
    livesInPlace = false;
  } else if (workLocalId && !residentLocalId && !livesExplicit) {
    localId = workLocalId;
    livesInPlace = false;
  }
  return { localId, livesInPlace, residentLocalId, workLocalId };
}


const RATE_BLOCK_CAP = 24;

/** Hours × absolute $/hr lines. Flags label overtime vs differential; they do not change the dollars. */
export function normalizeRateBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const blocks = [];
  for (const row of raw.slice(0, RATE_BLOCK_CAP)) {
    if (!row || typeof row !== "object") continue;
    const hours = clamp0(num(row.hours));
    const rate = Math.min(1e6, clamp0(num(row.rate)));
    if (!(hours > 0)) continue;
    const label = String(row.label || "Base").trim().slice(0, 40) || "Base";
    blocks.push({
      label,
      hours,
      rate,
      overtime: Boolean(row.overtime),
      differential: Boolean(row.differential),
    });
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
  if (block.overtime && block.differential) {
    return "Overtime and a differential are stacked on these hours. The rate is the combined dollars per hour, not an extra multiplier.";
  }
  if (block.overtime) {
    return "Marked as overtime. The rate is the overtime dollars per hour for these hours.";
  }
  if (block.differential) {
    return "Marked as a differential (night, weekend, hazard, or similar). The rate is the dollars per hour for these hours.";
  }
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
  const remoteSplit = normalizeRemoteSplit(raw);
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
    state,
    workState,
    localId: localSel.localId,
    residentLocalId: localSel.residentLocalId,
    workLocalId: localSel.workLocalId,
    livesInPlace: localSel.livesInPlace,
    customLocalPercent: Math.min(
      100,
      clamp0(num(pickDefined(raw.customLocalPercent, raw.customLocalRatePct, 0))),
    ),
    dependentsCount: Math.max(0, Math.floor(num(raw.dependentsCount))),
    contractorExpensesAnnual: clamp0(num(raw.contractorExpensesAnnual)),
    remoteSplit,
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
      extraWithholdingPerPeriod: money(
        clamp0(num(pickDefined(w4raw.extraWithholdingPerPeriod, w4raw.extraWithholding, 0))),
      ),
    },
    employerBenefitsAnnual: clamp0(num(raw.employerBenefitsAnnual)),
    employerRetirementAnnual: clamp0(num(raw.employerRetirementAnnual)),
    sutaRate: clamp0(num(raw.sutaRate)),
  };
}

function retirementAmount(spec, gross) {
  const base = clamp0(gross);
  if (spec.mode === "percent") {
    const pct = Math.min(100, clamp0(spec.value));
    return money(base * (pct / 100));
  }
  return money(Math.min(clamp0(spec.value), base));
}

function buildDeductionItems(input, gross) {
  const d = input.deductions;
  const items = [];
  const push = (type, label, annual, flags) => {
    const amount = money(annual);
    if (amount > 0) items.push({ type, label, annual: amount, ...flags });
  };
  push("401k", "Traditional 401(k)", retirementAmount(d.traditional401k, gross), {
    bucket: "pretax",
    federal: true,
    state: "retirement",
    fica: false,
  });
  push("hsa", "HSA", d.hsa, { bucket: "pretax", federal: true, state: true, fica: true });
  push("fsa", "Health FSA", d.fsa, { bucket: "pretax", federal: true, state: true, fica: true });
  push("health", "Health premium", d.health, { bucket: "pretax", federal: true, state: true, fica: true });
  push("dental", "Dental premium", d.dental, { bucket: "pretax", federal: true, state: true, fica: true });
  push("vision", "Vision premium", d.vision, { bucket: "pretax", federal: true, state: true, fica: true });
  push("commuter", "Commuter benefits", d.commuter, { bucket: "pretax", federal: true, state: true, fica: true });
  push("custom-pretax", "Other pre-tax", d.customPretax, {
    bucket: "pretax",
    federal: true,
    state: true,
    fica: d.customPretaxReducesFica,
  });
  push("roth", "Roth 401(k)", retirementAmount(d.roth401k, gross), {
    bucket: "posttax",
    federal: false,
    state: false,
    fica: false,
  });
  push("union", "Union dues", d.union, { bucket: "posttax", federal: false, state: false, fica: false });
  push("custom-posttax", "Other post-tax", d.customPosttax, {
    bucket: "posttax",
    federal: false,
    state: false,
    fica: false,
  });
  return items;
}

function phaseLinear(amount, agi, start, end) {
  if (agi <= start) return amount;
  if (agi >= end) return 0;
  return amount * (1 - (agi - start) / (end - start));
}

function ohioExemption(agi, status, dependents) {
  let per = 1900;
  if (agi <= 40000) per = 2400;
  else if (agi <= 80000) per = 2150;
  else if (agi >= 500000) per = 0;
  const people = (status === "mfj" ? 2 : 1) + dependents;
  return per * people;
}

function connecticutExemption(agi, status) {
  const joint = status === "mfj";
  const base = joint ? 24000 : status === "mfs" ? 12000 : 15000;
  const start = joint ? 48000 : status === "mfs" ? 24000 : 30000;
  if (agi <= start) return base;
  const steps = Math.ceil((agi - start) / 1000);
  return Math.max(0, base - steps * 1000);
}

function exemptionDeduction(state, status, dependents, agi) {
  if (!state) return 0;
  if (state.special === "ohio") return ohioExemption(agi, status, dependents);
  if (state.special === "connecticut") return connecticutExemption(agi, status);
  const ex = state.personalExemption;
  if (!ex || ex.kind !== "deduction") return 0;
  let personal = ex[status] ?? 0;
  let dep = (ex.dependent || 0) * dependents;
  if (state.exemptionCliff) {
    const cliff = state.exemptionCliff[status] ?? state.exemptionCliff.single;
    if (cliff && agi > cliff) {
      personal = 0;
      dep = 0;
    }
  }
  if (state.exemptionPhaseout) {
    const range = state.exemptionPhaseout[status] || state.exemptionPhaseout.single;
    if (range) {
      personal = phaseLinear(personal, agi, range[0], range[1]);
      dep = phaseLinear(dep, agi, range[0], range[1]);
    }
  }
  return personal + dep;
}

function exemptionCredit(state, status, dependents, agi) {
  const ex = state?.personalExemption;
  if (!ex || ex.kind !== "credit") return 0;
  let credit = (ex[status] ?? 0) + (ex.dependent || 0) * dependents;
  if (state.creditPhaseoutAgi) {
    const limit = state.creditPhaseoutAgi[status] ?? state.creditPhaseoutAgi.single;
    if (limit && agi > limit) credit = 0;
  }
  return credit;
}

function bracketsFor(state, status) {
  const brackets = state?.brackets || {};
  if (status === "mfj" && brackets.mfj?.length) return brackets.mfj;
  if (brackets[status]?.length) return brackets[status];
  return brackets.single || [];
}

function utahTax(wages, status, federal) {
  const std = federal.standardDeduction[status] ?? federal.standardDeduction.single;
  let credit = 0.06 * std;
  const threshold = status === "mfj" ? 36426 : 18213;
  if (wages > threshold) credit -= (wages - threshold) * 0.013;
  if (credit < 0) credit = 0;
  return Math.max(0, wages * 0.045 - credit);
}

function federalTaxDetail(federalWages, input, federal) {
  const status = input.filingStatus;
  const fullBrackets = federal.brackets[status];
  const fullStd = federal.standardDeduction[status];
  const multiple = input.w4.multipleJobs;
  const std = multiple ? fullStd / 2 : fullStd;
  const brackets = multiple ? fullBrackets.map((row) => ({ over: row.over / 2, rate: row.rate })) : fullBrackets;
  const deduction = std + input.w4.deductions;
  const taxable = Math.max(0, federalWages + input.w4.otherIncome - deduction);
  const beforeCredit = bracketTax(taxable, brackets);
  const tax = Math.max(0, beforeCredit - input.w4.dependentsCredit);
  return { tax, taxable, standardDeductionUsed: std, multiple };
}

function findState(tables, id) {
  return tables.states.states.find((row) => row.id === id) || null;
}

function stateName(tables, id) {
  return findState(tables, id)?.name || id;
}

function computeStateIncome(state, stateWages, input) {
  if (!state?.wageTax || state.special === "utah") {
    return { tax: 0, taxable: stateWages };
  }
  const agi = stateWages;
  const deduction = state.standardDeduction?.[input.filingStatus] ?? 0;
  const exemption = exemptionDeduction(state, input.filingStatus, input.dependentsCount, agi);
  const taxable = Math.max(0, stateWages - deduction - exemption);
  const credit = exemptionCredit(state, input.filingStatus, input.dependentsCount, agi);
  const tax = Math.max(0, bracketTax(taxable, bracketsFor(state, input.filingStatus)) - credit);
  return { tax, taxable, deduction, exemption, credit };
}

function payrollLines(stateId, ficaWages, tables, employment, warnings) {
  if (employment === "contractor" || !stateId) return [];
  const lines = [];
  for (const program of tables.payroll.programs || []) {
    if (program.state !== stateId) continue;
    const rateMissing =
      program.employeeRate == null ||
      program.employeeRate === "" ||
      Number.isNaN(Number(program.employeeRate)) ||
      program.todo === true ||
      program.confidence === "todo" ||
      program.confidence === "missing";
    if (rateMissing) {
      warnings.push(
        `${program.name} is listed for this state but has no sourced employee rate, so $0 was not invented for it. Confirm the current agency rate before relying on a stub.`,
      );
      continue;
    }
    const base = program.wageBase ? Math.min(ficaWages, program.wageBase) : ficaWages;
    let tax = base * program.employeeRate;
    if (program.annualMax != null) tax = Math.min(tax, program.annualMax);
    const annual = money(tax);
    if (!(annual > 0)) continue;
    lines.push({
      id: program.id,
      name: program.name,
      annual,
      why: program.shortWhy,
      source: program.sourceLabel,
      sourceMeta: program.source || null,
      tone: "state",
    });
  }
  return lines;
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
          why: `Custom ${residency} local percent you entered, applied to gross wages. It stands in for a city or county that is not in the named list.`,
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
    const msg = "That city or county is not in the 2026 local file, so local tax is not modeled (not a silent $0).";
    notes.push(msg);
    warnings.push(msg);
    return { lines: [], notes, warnings };
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
    const msg = `${local.name} has no sourced 2026 rate in the local file, so local tax is not modeled — not a silent $0. Enter a custom local percent if you know the rate, or see methodology for gaps.`;
    notes.push(msg);
    warnings.push(msg);
    return { lines: [], notes, warnings, notModeled: true, localId: local.id };
  }
  if (local.confidence === "estimated") {
    const msg = `${local.name} local tax is an estimate (labeled in the 2026 local file). Confirm the current agency rate; it is not treated as a silent exact $0.`;
    notes.push(msg);
    warnings.push(msg);
  }
  if ((local.appliesWhen === "resident-only" || local.method === "layered-threshold") && !input.livesInPlace) {
    notes.push(
      local.residentOnlyNote ||
        `${local.name} tax is modeled for residents. It was left off because you marked that you work there and live somewhere else.`,
    );
    return { lines: [], notes, warnings };
  }

  if (local.method === "brackets") {
    const brackets = local.brackets[input.filingStatus] || local.brackets.single;
    const annual = money(bracketTax(ctx.stateTaxable, brackets));
    return {
      lines: [
        {
          id: local.id,
          name: local.name,
          annual,
          why: local.residentOnlyNote
            ? `${local.name} ${residency} tax on income after the state deduction. ${local.residentOnlyNote}`
            : `${local.name} ${residency} tax, modeled on the same taxable income as the state.`,
          source: local.sourceLabel,
          sourceMeta: local.source || null,
          tone: "local",
          residency,
          jurisdiction: local.name,
          rateOrNote: "Bracket schedule on state taxable income",
          confidence: local.confidence,
        },
      ],
      notes,
      warnings,
    };
  }

  if (local.method === "surcharge") {
    if (input.livesInPlace) {
      const annual = money(ctx.stateIncome * local.residentSurchargeOfStateTax);
      return {
        lines: [
          {
            id: local.id,
            name: `${local.name} resident surcharge`,
            annual,
            why: `Residents pay ${pctLabel(local.residentSurchargeOfStateTax)} of their New York State income tax. It is not a flat percent of wages.`,
            source: local.sourceLabel,
            sourceMeta: local.source || null,
            tone: "local",
            residency: "resident",
            jurisdiction: local.name,
            rateOrNote: `${pctLabel(local.residentSurchargeOfStateTax)} of state income tax`,
            confidence: local.confidence,
          },
        ],
        notes,
        warnings,
      };
    }
    const annual = money(ctx.localGross * local.nonresidentRate);
    return {
      lines: [
        {
          id: local.id,
          name: `${local.name} nonresident earnings tax`,
          annual,
          why: `Nonresidents who work in ${local.name} are modeled at ${pctLabel(local.nonresidentRate)} of wages.`,
          source: local.sourceLabel,
          sourceMeta: local.source || null,
          tone: "local",
          residency: "nonresident",
          jurisdiction: local.name,
          rateOrNote: pctLabel(local.nonresidentRate),
          confidence: local.confidence,
        },
      ],
      notes,
      warnings,
    };
  }

  if (local.method === "layered-threshold") {
    const lines = [];
    for (const layer of local.layers) {
      let tax = 0;
      const bits = [];
      for (const tier of layer.tiers) {
        const threshold = tier.threshold[input.filingStatus] ?? tier.threshold.single;
        const slice = Math.max(0, ctx.stateTaxable - threshold);
        tax += slice * tier.rate;
        bits.push(`${pctLabel(tier.rate)} above $${Math.round(threshold).toLocaleString("en-US")}`);
      }
      lines.push({
        id: layer.id,
        name: layer.name,
        annual: money(tax),
        why:
          tax > 0
            ? `${layer.name} (${residency}): ${bits.join(", ")} of Oregon taxable income. These are resident income taxes, not typical wage withholding on every stub.`
            : `${layer.name} (${residency}) does not start until income clears the threshold (${bits.join("; ")}). Nothing is added at this pay.`,
        source: local.sourceLabel,
        sourceMeta: local.source || null,
        tone: "local",
        residency,
        jurisdiction: local.name,
        rateOrNote: bits.join("; "),
        confidence: local.confidence,
      });
    }
    return { lines, notes, warnings };
  }

  const rate = input.livesInPlace ? local.residentRate : local.nonresidentRate ?? local.residentRate;
  let base = ctx.localGross;
  if (local.base === "state-taxable") base = ctx.stateTaxable;
  else if (local.pretaxReducesBase) base = ctx.qualifyingWages;
  const who = input.livesInPlace ? "Resident" : "Nonresident";
  return {
    lines: [
      {
        id: local.id,
        name: local.name,
        annual: money(base * rate),
        why: `${who} rate ${pctLabel(rate)}. ${
          local.pretaxReducesBase
            ? "Traditional 401(k) and Section 125 amounts are removed from this base."
            : "This base is gross wages. Traditional 401(k) deferrals are not removed."
        }`,
        source: local.sourceLabel,
        sourceMeta: local.source || null,
        tone: "local",
        residency,
        jurisdiction: local.name,
        rateOrNote: pctLabel(rate),
        confidence: local.confidence,
      },
    ],
    notes,
    warnings,
  };
}

function pushLine(lines, row) {
  lines.push(row);
}

export function calculateTakeHome(raw, tables) {
  const input = normalizeInput(raw);
  const notes = [];
  const warnings = [];
  const periods = PERIODS[input.frequency];
  const federal = tables.federal;
  const fica = tables.fica;
  const state = findState(tables, input.state);

  let gross = 0;
  const blockDetail = [];
  if (input.rateBlocks.length) {
    const scale = input.rateBlockUnit === "period" ? periods : input.weeksPerYear;
    for (const block of input.rateBlocks) {
      blockDetail.push({ block, annual: money(block.hours * block.rate * scale) });
    }
    gross =
      blockDetail.reduce((sum, row) => sum + row.annual, 0) + input.tipsAnnual + input.bonusAnnual;
    notes.push(
      input.rateBlockUnit === "period"
        ? "Rate blocks are the hours on this paycheck. Each line is hours times its own dollar rate. Annual figures repeat that paycheck by pay frequency."
        : "Rate blocks are hours per week, multiplied by paid weeks. Each line is hours times its own dollar rate. Put a combined rate on a line when overtime and a differential apply to the same hours.",
    );
  } else if (input.payType === "hourly") {
    const regular = input.hourlyRate * input.hoursPerWeek * input.weeksPerYear;
    const overtime =
      input.hourlyRate * input.overtimeMultiplier * input.overtimeHoursPerWeek * input.weeksPerYear;
    gross = regular + overtime + input.tipsAnnual + input.bonusAnnual;
  } else {
    gross = input.grossAnnual + input.tipsAnnual + input.bonusAnnual;
  }
  gross = money(gross);

  const expenses = input.employment === "contractor" ? money(Math.min(input.contractorExpensesAnnual, gross)) : 0;
  const profit = money(Math.max(0, gross - expenses));
  const items = buildDeductionItems(input, input.employment === "contractor" ? profit : gross);

  if (!state && input.state) {
    warnings.push("That state code is not in the 2026 table. State income tax was left at $0.");
  }
  if (!input.state) {
    notes.push("Choose a state. Until you do, only federal tax and FICA are estimated.");
  }

  const limits = federal.limits || {};
  const traditional = items.find((item) => item.type === "401k")?.annual || 0;
  const roth = items.find((item) => item.type === "roth")?.annual || 0;
  if (traditional + roth > (limits.electiveDeferral401k || 24500)) {
    warnings.push(
      `Traditional and Roth deferrals together are above the 2026 employee elective deferral limit of $${(limits.electiveDeferral401k || 24500).toLocaleString("en-US")}. Catch-up contributions are not added automatically. The amount you entered is still used.`,
    );
  }
  const hsa = items.find((item) => item.type === "hsa")?.annual || 0;
  if (hsa > (limits.hsaFamily || 8750)) {
    warnings.push("HSA contributions are above the 2026 family limit. The amount you entered is still used.");
  } else if (hsa > (limits.hsaSelfOnly || 4400)) {
    notes.push("HSA amount is above the 2026 self-only limit. That is fine with family coverage.");
  }
  const fsa = items.find((item) => item.type === "fsa")?.annual || 0;
  if (fsa > (limits.healthFsa || 3400)) {
    warnings.push("Health FSA amount is above the 2026 salary-reduction limit. The amount you entered is still used.");
  }

  let federalReduction = 0;
  let stateReduction = 0;
  let ficaReduction = 0;
  let pretaxSum = 0;
  let posttaxSum = 0;
  for (const item of items) {
    if (item.bucket === "pretax") {
      pretaxSum += item.annual;
      if (item.federal) federalReduction += item.annual;
      const stateAllows =
        item.state === true || (item.state === "retirement" && state?.retirementDeferralDeductible !== false);
      if (stateAllows) stateReduction += item.annual;
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

  if (input.employment === "contractor") {
    seBase = profit * fica.selfEmploymentFactor;
    ssTax = Math.min(seBase, ssBase) * fica.socialSecurity.selfEmployedRate;
    medTax = seBase * fica.medicare.selfEmployedRate;
    addlTax = Math.max(0, seBase - addlThreshold) * fica.additionalMedicare.rate;
    halfSe = (ssTax + medTax) * 0.5;
    federalWages = Math.max(0, profit - halfSe - federalReduction);
    stateWages = Math.max(0, profit - halfSe - stateReduction);
    ficaWages = 0;
    warnings.push(
      "Contractor mode is not a Schedule C. Self-employment tax is estimated on 92.35% of profit after expenses; the qualified business income deduction is not included.",
    );
    notes.push(
      "Contractor mode estimates self-employment tax on 92.35% of profit after expenses. It is not a Schedule C and it does not include the qualified business income deduction.",
    );
    notes.push(
      `Half of Social Security and Medicare self-employment tax ($${money(halfSe).toLocaleString("en-US")}) is subtracted before income tax. Additional Medicare is not part of that half.`,
    );
    notes.push("A rough quarterly set-aside is total income tax, self-employment tax, state, and local, divided by four. It is not a 1040-ES voucher.");
  } else {
    federalWages = Math.max(0, gross - federalReduction);
    ficaWages = Math.max(0, gross - ficaReduction);
    stateWages = Math.max(0, gross - stateReduction);
    ssTax = Math.min(ficaWages, ssBase) * fica.socialSecurity.employeeRate;
    medTax = ficaWages * fica.medicare.employeeRate;
    addlTax = Math.max(0, ficaWages - addlThreshold) * fica.additionalMedicare.rate;
  }

  const federalDetail = federalTaxDetail(federalWages, input, federal);
  let federalIncome = money(federalDetail.tax);
  ssTax = money(ssTax);
  medTax = money(medTax);
  addlTax = money(addlTax);

  let stateIncome = 0;
  let stateTaxable = 0;
  if (state?.wageTax) {
    if (state.special === "utah") {
      stateIncome = money(utahTax(stateWages, input.filingStatus, federal));
      stateTaxable = money(stateWages);
    } else {
      const computed = computeStateIncome(state, stateWages, input);
      stateIncome = money(computed.tax);
      stateTaxable = money(computed.taxable);
    }
  }

  if (state?.stubNote) notes.push(state.stubNote);
  if (state?.recaptureWarningAbove) {
    const cutoff = state.recaptureWarningAbove[input.filingStatus] ?? state.recaptureWarningAbove.single;
    if (stateWages > cutoff) {
      notes.push(
        `${state.name} tax-benefit recapture is not computed. Above this income the official tax is often higher than the bracket math shown here.`,
      );
    }
  }
  if (state?.creditPhaseoutNoteAbove) {
    const cutoff = state.creditPhaseoutNoteAbove[input.filingStatus] ?? state.creditPhaseoutNoteAbove.single;
    if (stateWages > cutoff) {
      notes.push(
        `${state.name} phases out exemption credits at this income. The credit is still subtracted here, so the state line can run a bit low.`,
      );
    }
  }
  if (traditional > 0 && state && state.retirementDeferralDeductible === false) {
    notes.push(
      `${state.name} does not exclude traditional 401(k) deferrals the way the federal return does. Those dollars stayed in the state wage base.`,
    );
  }
  if (traditional > 0 && input.employment === "w2") {
    notes.push("Traditional 401(k) reduced income-tax wages. It did not reduce Social Security or Medicare wages.");
  }

  if (input.w4.multipleJobs) {
    notes.push(
      "The multiple-jobs checkbox is approximated with half the standard deduction and bracket thresholds at half width. It is not the IRS two-earners worksheet.",
    );
  }

  if (input.workState && input.workState !== input.state && input.state) {
    const partners = tables.states.reciprocity?.[input.state] || [];
    const home = stateName(tables, input.state);
    const work = stateName(tables, input.workState);
    if (partners.includes(input.workState)) {
      const msg = `${home} and ${work} have a wage reciprocity agreement. This estimate taxes ${home} only. Your employer usually needs a certificate before they stop withholding the work state. A credit for taxes paid to the other state is not computed.`;
      warnings.push(msg);
      notes.push(msg);
    } else {
      const msg = `Work state is ${work} and home state is ${home}. This estimate taxes ${home} only. It does not compute a second return or a credit for taxes paid to ${work}.`;
      warnings.push(msg);
      notes.push(msg);
    }
  }

  if (input.remoteSplit?.length) {
    const dominant = input.remoteSplit.find((row) => row.pct >= 100 && row.state === input.state);
    const singleState = input.remoteSplit.length === 1 && input.remoteSplit[0].state === input.state && input.remoteSplit[0].pct >= 100;
    if (!singleState && !dominant) {
      warnings.push("Work-state/resident-state split is simplified.");
      notes.push(
        "A remote work split was provided, but multi-state liability is not computed. Tax is estimated for the primary resident state only.",
      );
    }
  }

  const payroll = payrollLines(
    input.state,
    input.employment === "contractor" ? 0 : ficaWages,
    tables,
    input.employment,
    warnings,
  );
  const payrollSum = money(payroll.reduce((sum, line) => sum + line.annual, 0));

  const qualifyingWages = money(Math.max(0, (input.employment === "contractor" ? profit : gross) - federalReduction));
  const localGross = input.employment === "contractor" ? profit : gross;
  const local = localResult(
    input,
    { localGross, stateTaxable, qualifyingWages, stateIncome },
    tables,
  );
  notes.push(...local.notes);
  warnings.push(...(local.warnings || []));
  const localSum = money(local.lines.reduce((sum, line) => sum + line.annual, 0));

  if (state?.confidence === "estimated") {
    const msg = `${state.name} income tax is marked estimated in the 2026 table (phaseouts, conformity, or federal-tax deductions may be incomplete). See methodology — this is not a silent exact figure.`;
    warnings.push(msg);
    notes.push(msg);
  }

  if (input.employment === "w2" && input.state) {
    for (const gap of tables.payroll.notModeledPrograms || []) {
      if (gap.state !== input.state) continue;
      const msg = `${gap.name} is not modeled: ${gap.note} No silent $0 employee line was invented.`;
      warnings.push(msg);
      notes.push(msg);
    }
  }

  const extraAnnual = money(input.w4.extraWithholdingPerPeriod * periods);

  const taxSum = money(federalIncome + extraAnnual + ssTax + medTax + addlTax + stateIncome + payrollSum + localSum);
  const exactNet = money(gross - expenses - pretaxSum - posttaxSum - taxSum);

  if (exactNet < 0) {
    warnings.push("Deductions and taxes are larger than gross pay, so net is negative. Check the amounts.");
  }

  const annual = {
    gross,
    expenses,
    pretax: pretaxSum,
    posttax: posttaxSum,
    federalWages: money(federalWages),
    ficaWages: money(input.employment === "contractor" ? seBase : ficaWages),
    stateWages: money(stateWages),
    federalTaxable: money(federalDetail.taxable),
    stateTaxable,
    federalIncome,
    extraWithholding: extraAnnual,
    socialSecurity: ssTax,
    medicare: medTax,
    additionalMedicare: addlTax,
    selfEmployment: input.employment === "contractor" ? money(ssTax + medTax + addlTax) : 0,
    stateIncome,
    statePayroll: payrollSum,
    local: localSum,
    taxes: taxSum,
    net: exactNet,
    halfSelfEmploymentDeduction: money(halfSe),
  };

  const lineDraft = [];
  if (blockDetail.length) {
    const unit = input.rateBlockUnit === "period" ? "this paycheck" : "per week";
    blockDetail.forEach((row, index) => {
      const block = row.block;
      const rateLabel = block.rate.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      pushLine(lineDraft, {
        id: `block-${index}`,
        label: blockLineLabel(block),
        annual: row.annual,
        section: "gross",
        tone: "ink",
        why: `${block.hours} h ${unit} × $${rateLabel}/hr. ${blockKindNote(block)}`,
        source: "Rate block",
      });
    });
    if (input.tipsAnnual > 0) {
      pushLine(lineDraft, {
        id: "tips",
        label: "Tips",
        annual: money(input.tipsAnnual),
        section: "gross",
        tone: "ink",
        why: "Added on top of rate blocks for the year.",
        source: "User-entered",
      });
    }
    if (input.bonusAnnual > 0) {
      pushLine(lineDraft, {
        id: "bonus",
        label: "Bonus",
        annual: money(input.bonusAnnual),
        section: "gross",
        tone: "ink",
        why: "Added on top of rate blocks for the year.",
        source: "User-entered",
      });
    }
  } else {
    pushLine(lineDraft, {
      id: "gross",
      label: input.employment === "contractor" ? "Gross receipts" : "Gross pay",
      annual: gross,
      section: "gross",
      tone: "ink",
      why: "",
      source: "",
    });
  }
  if (expenses > 0) {
    pushLine(lineDraft, {
      id: "expenses",
      label: "Business expenses",
      annual: expenses,
      section: "expense",
      tone: "muted",
      why: "Subtracted before self-employment tax. This is not a judgment about which expenses belong on Schedule C.",
      source: "User-entered",
    });
  }
  for (const item of items.filter((row) => row.bucket === "pretax")) {
    let why = "Pre-tax. Removed before federal income tax.";
    if (item.type === "401k") {
      why = "Reduces federal income tax and, in most states, state income tax. It does not reduce Social Security or Medicare.";
    } else if (item.fica) {
      why = "Modeled as a Section 125 or HSA amount. It reduces federal income tax, FICA wages, and state wages.";
    }
    pushLine(lineDraft, {
      id: item.type,
      label: item.label,
      annual: item.annual,
      section: "pretax",
      tone: "benefit",
      why,
      source: item.type === "401k" ? "IRS elective deferral · 2026" : "",
    });
  }

  const federalWhy = input.w4.multipleJobs
    ? "Annualized brackets with the Step 2 checkbox approximated as half the standard deduction and half-width brackets. An educational estimate, not Pub 15-T payroll software."
    : `Annualized 2026 brackets after the $${federal.standardDeduction[input.filingStatus].toLocaleString("en-US")} standard deduction. An educational withholding estimate, not a payroll table and not the IRS Tax Withholding Estimator.`;

  pushLine(lineDraft, {
    id: "federal",
    label: "Federal income tax",
    annual: federalIncome,
    section: "tax",
    tone: "federal",
    why: federalWhy,
    source: "IRS Rev. Proc. 2025-32",
  });
  if (extraAnnual > 0) {
    pushLine(lineDraft, {
      id: "extra",
      label: "Extra federal withholding",
      annual: extraAnnual,
      section: "tax",
      tone: "federal",
      why: "W-4 Step 4(c), added on each paycheck. It does not change the bracket math.",
      source: "Form W-4",
    });
  }

  if (input.employment === "contractor") {
    pushLine(lineDraft, {
      id: "ss",
      label: "Self-employment Social Security",
      annual: ssTax,
      section: "tax",
      tone: "fica",
      why: `12.4% of 92.35% of profit, up to the $${ssBase.toLocaleString("en-US")} wage base.`,
      source: "SSA wage base · 2026",
    });
    pushLine(lineDraft, {
      id: "medicare",
      label: "Self-employment Medicare",
      annual: medTax,
      section: "tax",
      tone: "fica",
      why: "2.9% of 92.35% of profit. No wage base.",
      source: "IRS Pub 15 · 2026",
    });
  } else {
    pushLine(lineDraft, {
      id: "ss",
      label: "Social Security",
      annual: ssTax,
      section: "tax",
      tone: "fica",
      why: `6.2% of Social Security wages up to $${ssBase.toLocaleString("en-US")}. Traditional 401(k) stays in this base. The employee maximum is $11,439.`,
      source: "SSA contribution base · 2026",
    });
    pushLine(lineDraft, {
      id: "medicare",
      label: "Medicare",
      annual: medTax,
      section: "tax",
      tone: "fica",
      why: "1.45% of Medicare wages, with no cap. Traditional 401(k) stays in this base. HSA and Section 125 premiums come out of it.",
      source: "IRS Pub 15 · 2026",
    });
  }
  pushLine(lineDraft, {
    id: "addl",
    label: "Additional Medicare",
    annual: addlTax,
    section: "tax",
    tone: "fica",
    why: `0.9% above $${addlThreshold.toLocaleString("en-US")} for this filing status. Employers must start withholding at $200,000 of wages even when a joint return uses $250,000. This line uses the return threshold. At exactly the threshold the tax is $0.`,
    source: "Additional Medicare Tax",
  });

  pushLine(lineDraft, {
    id: "state",
    label: state ? `${state.name} income tax` : "State income tax",
    annual: stateIncome,
    section: "tax",
    tone: "state",
    why: state?.why || "No state selected.",
    source: state?.wageTax ? "State table · 2026" : "No wage income tax",
  });
  for (const program of payroll) {
    pushLine(lineDraft, {
      id: program.id,
      label: program.name,
      annual: program.annual,
      section: "tax",
      tone: "state",
      why: program.why,
      source: program.source,
    });
  }
  if (local.lines.length === 0 && !input.localId && !(input.customLocalPercent > 0) && state?.localPossible) {
    const msg = "Local wage tax not applied — choose a city if your area charges one.";
    warnings.push(msg);
    notes.push(
      `${state.name} has local taxes in some cities or counties. None is selected, so the local line is $0.`,
    );
  }
  for (const line of local.lines) {
    pushLine(lineDraft, {
      id: line.id,
      label: line.name,
      annual: line.annual,
      section: "tax",
      tone: "local",
      why: line.why,
      source: line.source,
    });
  }
  for (const item of items.filter((row) => row.bucket === "posttax")) {
    pushLine(lineDraft, {
      id: item.type,
      label: item.label,
      annual: item.annual,
      section: "posttax",
      tone: "benefit",
      why: "Taken after tax. It does not change federal, FICA, state, or local tax in this model.",
      source: "",
    });
  }

  const lines = lineDraft.map((line) => {
    const period = line.id === "extra" ? input.w4.extraWithholdingPerPeriod : money(line.annual / periods);
    return {
      ...line,
      period,
      annualized: money(period * periods),
    };
  });

  const grossPeriod = money(gross / periods);
  const withheldPeriod = money(
    lines.filter((line) => line.section !== "gross").reduce((sum, line) => sum + line.period, 0),
  );
  const netPeriod = money(grossPeriod - withheldPeriod);
  lines.push({
    id: "net",
    label: "Net pay",
    annual: exactNet,
    period: netPeriod,
    annualized: money(netPeriod * periods),
    section: "net",
    tone: "net",
    why: "Gross minus the lines above, after each line is rounded to the cent and split across paychecks. Educational estimate, not an employer stub.",
    source: "",
  });

  const benefits = money(pretaxSum + posttaxSum);
  const ficaTotal = money(ssTax + medTax + addlTax);
  const stateTotal = money(stateIncome + payrollSum);
  const federalTotal = money(federalIncome + extraAnnual);
  const chart = {
    gross,
    keep: Math.max(0, exactNet),
    federal: federalTotal,
    fica: ficaTotal,
    state: stateTotal,
    local: localSum,
    benefits,
    expenses,
  };

  const keepPer100 = gross > 0 ? money((exactNet / gross) * 100) : 0;
  const effectiveTaxRate = gross > 0 ? taxSum / gross : 0;
  const quarterlySetAside =
    input.employment === "contractor" ? money((federalIncome + stateIncome + localSum + ssTax + medTax + addlTax) / 4) : null;
  const monthlyNet = money((netPeriod * periods) / 12);
  const annualizedNet = money(netPeriod * periods);

  const pretaxItemized = items
    .filter((item) => item.bucket === "pretax")
    .map((item) => ({
      id: item.type,
      label: item.label,
      annual: item.annual,
      period: money(item.annual / periods),
    }));
  const posttaxItemized = items
    .filter((item) => item.bucket === "posttax")
    .map((item) => ({
      id: item.type,
      label: item.label,
      annual: item.annual,
      period: money(item.annual / periods),
    }));

  const statePayrollTaxes = payroll.map((program) => ({
    id: program.id,
    name: program.name,
    annual: program.annual,
    period: money(program.annual / periods),
    source: program.source,
  }));

  const localTaxes = local.lines.map((line) => ({
    id: line.id,
    name: line.name,
    jurisdiction: line.jurisdiction || line.name,
    residency: line.residency || (input.livesInPlace ? "resident" : "nonresident"),
    annual: line.annual,
    period: money(line.annual / periods),
    rateOrNote: line.rateOrNote || "",
    source: line.source || "",
    confidence: line.confidence || null,
  }));

  const dataGaps = {
    localNotModeled: Boolean(local.notModeled),
    localEstimated: localTaxes.some((row) => row.confidence === "estimated"),
    stateEstimated: state?.confidence === "estimated",
    notModeledPayroll: (tables.payroll.notModeledPrograms || [])
      .filter((gap) => gap.state === input.state && input.employment === "w2")
      .map((gap) => gap.name),
  };

  const assumptions = notes.filter((text) =>
    /approximat|model|estimate|not computed|not include|not a |simplified|educational|does not|omitted|rough /i.test(
      text,
    ),
  );

  const sourceBucket = [];
  const pushSource = (entry) => {
    if (!entry) return;
    if (typeof entry === "string") {
      if (!entry.trim()) return;
      sourceBucket.push({ name: entry, url: "" });
      return;
    }
    if (entry.name || entry.url) sourceBucket.push({ name: entry.name || entry.sourceLabel || "", url: entry.url || "" });
  };
  for (const src of federal.sources || []) pushSource(src);
  pushSource({ name: "IRS Rev. Proc. 2025-32", url: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" });
  for (const src of fica.sources || []) pushSource(src);
  if (state?.source) pushSource(state.source);
  if (state?.sources) for (const src of state.sources) pushSource(src);
  if (state?.wageTax) pushSource({ name: state.sourceLabel || `${state.name} income tax · 2026`, url: state.source?.url || "" });
  for (const program of payroll) {
    pushSource(program.sourceMeta || { name: program.source, url: "" });
  }
  for (const line of local.lines) {
    pushSource(line.sourceMeta || { name: line.source, url: "" });
  }
  if (input.customLocalPercent > 0) pushSource({ name: "Custom local rate", url: "" });

  const seenSources = new Set();
  const sources = [];
  for (const src of sourceBucket) {
    const key = `${src.name}|${src.url}`;
    if (!src.name || seenSources.has(key)) continue;
    seenSources.add(key);
    sources.push(src);
  }

  const method =
    federal.method ||
    "Annualized bracket estimate for tax year 2026. Taxes are computed on the year, rounded to cents, then divided by the number of paychecks. Not Pub 15-T wage-bracket tables and not an employer payroll system.";

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
    monthlyNet,
    annualizedNet,
    keepPer100,
    effectiveTaxRate,
    quarterlySetAside,
    notes,
    warnings,
    method,
    // Expanded API contract fields (aliases keep calculator UI working)
    grossPerPeriod: grossPeriod,
    grossAnnual: gross,
    pretaxItemized,
    posttaxItemized,
    federalTaxableWages: money(federalWages),
    ficaTaxableWages: money(input.employment === "contractor" ? seBase : ficaWages),
    stateTaxableWages: money(stateWages),
    federalWithholding: money(federalIncome + extraAnnual),
    socialSecurity: ssTax,
    medicare: medTax,
    additionalMedicare: addlTax,
    stateIncomeTax: stateIncome,
    statePayrollTaxes,
    localTaxes,
    dataGaps,
    netPerPeriod: netPeriod,
    netMonthly: monthlyNet,
    netAnnual: exactNet,
    effectiveRate: effectiveTaxRate,
    keptPer100: keepPer100,
    assumptions,
    sources,
  };
}

export function compareBonus(raw, tables) {
  const bonus = clamp0(num(raw.bonusAnnual));
  const without = calculateTakeHome({ ...raw, bonusAnnual: 0 }, tables);
  const withBonus = calculateTakeHome({ ...raw, bonusAnnual: bonus }, tables);
  const delta = (key) => money(withBonus.annual[key] - without.annual[key]);
  const supplementalRate = tables.federal.limits?.supplementalWithholdingRate ?? 0.22;
  const bonusWarning =
    "Paycheck withholding on a bonus can differ from the annual tax on that bonus. Employers often use a flat supplemental rate (commonly 22% federal); the return still uses ordinary brackets. This tool shows both the aggregate annual difference and a flat supplemental federal estimate.";
  const warnings = [...new Set([...(withBonus.warnings || []), bonusWarning])];
  return {
    bonus,
    without,
    withBonus: { ...withBonus, warnings },
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
    warnings,
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
      return {
        id: program.id,
        name: `${program.name} (employer)`,
        annual: money(base * program.employerRate),
      };
    });
  const suta = employee.input.sutaRate > 0 ? money(employee.annual.gross * (employee.input.sutaRate / 100)) : 0;
  const retirement = employee.input.employerRetirementAnnual;
  const benefits = employee.input.employerBenefitsAnnual;
  const programSum = money(programs.reduce((sum, line) => sum + line.annual, 0));
  const total = money(employee.annual.gross + socialSecurity + medicare + futa + programSum + suta + retirement + benefits);
  return {
    employee,
    employer: {
      socialSecurity,
      medicare,
      futa,
      programs,
      suta,
      retirement,
      benefits,
      total,
      ficaWages,
    },
  };
}

export function scenarioDeltas(baseResult, nextResult) {
  return {
    periodNet: money(nextResult.periodNet - baseResult.periodNet),
    annualNet: money(nextResult.annual.net - baseResult.annual.net),
    federal: money(nextResult.annual.federalIncome - baseResult.annual.federalIncome),
    fica: money(
      nextResult.annual.socialSecurity +
        nextResult.annual.medicare +
        nextResult.annual.additionalMedicare -
        (baseResult.annual.socialSecurity + baseResult.annual.medicare + baseResult.annual.additionalMedicare),
    ),
  };
}
