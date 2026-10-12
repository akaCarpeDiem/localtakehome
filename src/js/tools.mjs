/**
 * The smaller calculators (compare, bonus, raise, and so on).
 *
 * Each tool is { defaults, form(tables, v), out(tables, v) } built from pure
 * string functions, so the page generator can pre-render the default state and
 * the browser can take over from there. Field names double as link keys.
 */
import { PERIODS, calculateEmployerCost, calculateTakeHome, compareBonus, grossForNet } from "./engine.mjs";
import { commas, debounce, esc, num, pct, signed, slugify, usd, usd0 } from "./format.mjs";
import { DISCLAIMER, compareTable, renderChart, renderLines, renderMath } from "./view.mjs";

/* ───────────── shared form pieces ───────────── */

function sortedStates(tables) {
  return [...tables.states.states].sort((a, b) => a.name.localeCompare(b.name));
}

function localsFor(tables, stateId) {
  return (tables.local.jurisdictions || []).filter((row) => row.state === stateId && row.method !== "reference").sort((a, b) => a.name.localeCompare(b.name));
}

function opt(value, label, selected) {
  return `<option value="${esc(value)}"${String(value) === String(selected) ? " selected" : ""}>${esc(label)}</option>`;
}

function stateField(tables, name, selected, label = "State") {
  return `<label class="field"><span class="label">${label}</span><select name="${name}" data-state-for="${name}">${sortedStates(tables)
    .map((state) => opt(state.id, state.name, selected))
    .join("")}</select></label>`;
}

function localField(tables, stateName, name, stateId, selected) {
  const locals = localsFor(tables, stateId);
  const options = locals.length ? `<option value="">None</option>${locals.map((row) => opt(row.id, row.name.replace(/, (Indiana|Maryland|Ohio|Missouri|Delaware)$/, ""), selected)).join("")}` : `<option value="">No local income tax</option>`;
  return `<label class="field" data-local-of="${stateName}"><span class="label">City or county tax</span><select name="${name}"${locals.length ? "" : " disabled"}>${options}</select></label>`;
}

function statusField(selected, name = "status") {
  return `<label class="field"><span class="label">Filing status</span><select name="${name}">${opt("single", "Single", selected)}${opt("mfj", "Married filing jointly", selected)}${opt("mfs", "Married filing separately", selected)}${opt("hoh", "Head of household", selected)}</select></label>`;
}

function freqField(selected, name = "freq") {
  return `<label class="field"><span class="label">Paid</span><select name="${name}">${opt("weekly", "Weekly", selected)}${opt("biweekly", "Every 2 weeks", selected)}${opt("semimonthly", "Twice a month", selected)}${opt("monthly", "Monthly", selected)}</select></label>`;
}

function money(name, label, value, { suffix = "", hint = "", big = false } = {}) {
  return `<label class="field${big ? " big" : ""}"><span class="label">${label}</span><span class="control"><span class="affix">$</span><input name="${name}" inputmode="decimal" autocomplete="off" value="${esc(value)}">${suffix ? `<span class="affix">${suffix}</span>` : ""}</span>${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}

function number(name, label, value, suffix = "", hint = "") {
  return `<label class="field"><span class="label">${label}</span><span class="control"><input name="${name}" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(value)}">${suffix ? `<span class="affix">${suffix}</span>` : ""}</span>${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}

function figure(label, value, sub = "", tone = "") {
  return `<div class="figure ${tone}"><span class="figure-label">${esc(label)}</span><strong>${esc(value)}</strong>${sub ? `<span class="figure-sub">${sub}</span>` : ""}</div>`;
}

function fine() {
  return `<p class="disclaimer">${DISCLAIMER}</p>`;
}

function calcLink(params, text = "Open this in the full calculator") {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== "" && value != null && value !== false) q.set(key, String(value));
  return `<a class="more-link" href="/?${esc(q.toString())}">${esc(text)}</a>`;
}

function input(v, extra = {}) {
  return {
    payType: "salary",
    frequency: v.freq || "biweekly",
    filingStatus: v.status || "single",
    grossAnnual: num(v.salary),
    state: v.state,
    localId: v.local || "",
    livesInPlace: true,
    childrenUnder17: num(v.kids),
    deductions: { traditional401k: { mode: "percent", value: Math.min(100, num(v.k401)) } },
    ...extra,
  };
}

const fica = (r) => r.annual.socialSecurity + r.annual.medicare + r.annual.additionalMedicare;

/* ───────────── compare two offers ───────────── */

const compare = {
  defaults: { "a.salary": "85000", "a.state": "TX", "a.local": "", "b.salary": "95000", "b.state": "CA", "b.local": "", status: "single", freq: "biweekly", k401: "", kids: "" },
  fromQuery(q, v) {
    const shared = q.get("salary") || q.get("pay");
    if (shared) v["a.salary"] = v["b.salary"] = shared;
    if (q.get("state") && !q.get("a.state")) v["a.state"] = q.get("state").toUpperCase();
    if (q.get("local") && !q.get("a.local")) v["a.local"] = q.get("local");
    if (q.get("state2")) v["b.state"] = q.get("state2").toUpperCase();
    if (q.get("local2")) v["b.local"] = q.get("local2");
    if (q.get("pay2")) v["b.salary"] = q.get("pay2");
  },
  form(tables, v) {
    const side = (key, title) => `<fieldset class="panel"><legend>${title}</legend>
      ${money(`${key}.salary`, "Salary", v[`${key}.salary`], { suffix: "a year", big: true })}
      ${stateField(tables, `${key}.state`, v[`${key}.state`])}
      ${localField(tables, `${key}.state`, `${key}.local`, v[`${key}.state`], v[`${key}.local`])}
    </fieldset>`;
    return `<div class="two-up">${side("a", "Offer A")}${side("b", "Offer B")}</div>
      <div class="grid-4">${statusField(v.status)}${freqField(v.freq)}${number("k401", "401(k)", v.k401, "% of pay")}${number("kids", "Children under 17", v.kids)}</div>`;
  },
  out(tables, v) {
    const make = (key) => calculateTakeHome(input({ ...v, salary: v[`${key}.salary`], state: v[`${key}.state`], local: v[`${key}.local`] }), tables);
    const a = make("a");
    const b = make("b");
    const diff = b.annual.net - a.annual.net;
    const nameOf = (r, key) => {
      const local = localsFor(tables, v[`${key}.state`]).find((row) => row.id === v[`${key}.local`]);
      return local ? local.name.replace(/,.*$/, "") : r.state?.name || "";
    };
    const nameA = nameOf(a, "a");
    const nameB = nameOf(b, "b");
    let headline;
    if (Math.abs(diff) < 0.5) headline = "Both offers leave you with the same take-home pay.";
    else headline = `Offer ${diff > 0 ? "B" : "A"} leaves you ${usd0(Math.abs(diff))} more a year, or ${usd(Math.abs(b.periodNet - a.periodNet))} a paycheck.`;
    // The salary in B that matches A's take-home, and the other way round.
    const base = (key) => input({ ...v, state: v[`${key}.state`], local: v[`${key}.local`] });
    const needB = a.annual.net > 0 ? grossForNet(a.annual.net, base("b"), tables).gross : 0;
    const needA = b.annual.net > 0 ? grossForNet(b.annual.net, base("a"), tables).gross : 0;
    return `<p class="answer">${esc(headline)}</p>
      <div class="figures">
        ${figure(`Offer A · ${nameA}`, usd0(a.annual.net), `a year · ${usd(a.periodNet)} a paycheck`)}
        ${figure(`Offer B · ${nameB}`, usd0(b.annual.net), `a year · ${usd(b.periodNet)} a paycheck`)}
        ${figure("Break-even", usd0(needB), `is the salary in ${esc(nameB)} that matches offer A. In ${esc(nameA)}, ${usd0(needA)} matches offer B.`)}
      </div>
      ${compareTable(a, b, { labelA: `A · ${nameA}`, labelB: `B · ${nameB}` })}
      <p class="fine">Taxes only. Rent, sales tax, property tax and commuting costs differ by place and are not counted.</p>
      ${fine()}`;
  },
};

/* ───────────── bonus ───────────── */

const bonus = {
  defaults: { salary: "70000", bonus: "5000", state: "NY", local: "", status: "single" },
  form(tables, v) {
    return `<div class="grid-2">${money("salary", "Salary, not counting the bonus", v.salary, { suffix: "a year", big: true })}${money("bonus", "Bonus", v.bonus, { big: true })}</div>
      <div class="grid-3">${stateField(tables, "state", v.state)}${localField(tables, "state", "local", v.state, v.local)}${statusField(v.status)}</div>`;
  },
  out(tables, v) {
    const c = compareBonus({ ...input(v), bonusAnnual: num(v.bonus) }, tables);
    const bonusAmount = c.bonus;
    const kept = c.aggregate.net;
    const ficaTax = c.aggregate.socialSecurity + c.aggregate.medicare + c.aggregate.additionalMedicare;
    const stateTax = c.aggregate.state + c.aggregate.payroll;
    // What a typical bonus check looks like: flat 22% federal, the same FICA, and the state and local amounts above.
    const checkNet = bonusAmount - c.supplementalFederal - ficaTax - stateTax - c.aggregate.local;
    const settle = c.supplementalFederal - c.aggregate.federal;
    const rows = [
      ["Federal income tax", c.aggregate.federal, c.supplementalFederal],
      ["Social Security and Medicare", ficaTax, ficaTax],
      ["State tax", stateTax, stateTax],
      ["Local tax", c.aggregate.local, c.aggregate.local],
    ].filter(([, x, y]) => x > 0.004 || y > 0.004);
    return `<p class="answer">You keep about ${usd0(kept)} of a ${usd0(bonusAmount)} bonus${bonusAmount > 0 ? `, or ${pct(kept / bonusAmount, 0)} of it` : ""}.</p>
      <div class="figures">
        ${figure("Added to your take-home for the year", usd0(kept), "after every tax on the bonus", "pos")}
        ${figure("On the bonus check itself", usd0(checkNet), "if your employer withholds federal tax at the flat 22%")}
        ${figure(settle >= 0 ? "Likely back at tax time" : "Likely owed at tax time", usd0(Math.abs(settle)), settle >= 0 ? "because 22% is more than the bonus really adds to your federal tax" : "because 22% is less than the bonus really adds to your federal tax")}
      </div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Tax on the bonus</th><th scope="col" class="num">What it adds for the year</th><th scope="col" class="num">Typical withholding</th></tr></thead><tbody>
        ${rows.map(([label, x, y]) => `<tr><th scope="row">${label}</th><td class="num">${usd(x)}</td><td class="num">${usd(y)}</td></tr>`).join("")}
        <tr class="sum"><th scope="row">You keep</th><td class="num">${usd(kept)}</td><td class="num">${usd(checkNet)}</td></tr>
      </tbody></table></div>
      <p class="fine">Employers may withhold federal tax on bonuses at a flat 22% (37% above $1 million). That is a withholding shortcut, not a special bonus tax: on your return a bonus is taxed like any other pay. State withholding on bonuses varies; the state figures here are what the bonus adds to the year's tax.</p>
      ${fine()}`;
  },
};

/* ───────────── overtime ───────────── */

const overtime = {
  defaults: { rate: "28", hours: "40", ot: "8", otm: "1.5", state: "TX", status: "single", weeks: "52" },
  form(tables, v) {
    return `<div class="grid-4">${money("rate", "Hourly pay", v.rate, { suffix: "/hr", big: true })}${number("hours", "Regular hours a week", v.hours, "hr")}${number("ot", "Overtime hours a week", v.ot, "hr")}${number("otm", "Overtime pays", v.otm, "× rate")}</div>
      <div class="grid-3">${stateField(tables, "state", v.state)}${statusField(v.status)}${number("weeks", "Weeks with this overtime", v.weeks, "a year", "Regular pay is counted for 52 weeks.")}</div>`;
  },
  out(tables, v) {
    const rate = num(v.rate);
    const multiplier = num(v.otm) > 0 ? num(v.otm) : 1.5;
    const weeks = Math.min(52, num(v.weeks) || 52);
    const otHoursYear = num(v.ot) * weeks;
    const otPay = rate * multiplier * otHoursYear;
    const premium = rate * Math.min(0.5, Math.max(0, multiplier - 1)) * otHoursYear;
    const common = { payType: "salary", state: v.state, filingStatus: v.status, frequency: "weekly" };
    const regular = rate * num(v.hours) * 52;
    const none = calculateTakeHome({ ...common, grossAnnual: regular }, tables);
    const withOt = calculateTakeHome({ ...common, grossAnnual: regular + otPay, overtimePremiumAnnual: premium }, tables);
    const withoutDeduction = calculateTakeHome({ ...common, grossAnnual: regular + otPay, overtimePremiumAnnual: premium, workerDeductions: false }, tables);
    const gain = withOt.annual.net - none.annual.net;
    const saved = withOt.annual.net - withoutDeduction.annual.net;
    const perHour = otHoursYear > 0 ? gain / otHoursYear : 0;
    return `<p class="answer">That overtime adds about ${usd0(gain)} a year to your take-home pay, or ${usd(perHour)} for each overtime hour.</p>
      <div class="figures">
        ${figure("Overtime pay before tax", usd0(otPay), `${commas(otHoursYear, 1)} hours at ${usd(rate * multiplier)} an hour`)}
        ${figure("Overtime pay after tax", usd0(gain), `you keep ${otPay > 0 ? pct(gain / otPay, 0) : "0%"} of it`, "pos")}
        ${figure("Saved by the overtime deduction", usd0(saved), `${usd0(withOt.annual.overtimeDeduction)} of premium pay is deducted from federal taxable income`)}
      </div>
      ${compareTable(none, withOt, { labelA: "No overtime", labelB: "With overtime", perPeriod: false })}
      <p class="fine">From 2025 through 2028 the premium part of overtime pay (the extra half in time-and-a-half) can be deducted on the federal return, up to $12,500 a year ($25,000 for a joint return), shrinking above $150,000 of income ($300,000 joint). Social Security and Medicare still apply to all overtime pay, and most states still tax it. Your employer may keep withholding as before, in which case the saving arrives as a refund.</p>
      ${fine()}`;
  },
};

/* ───────────── tips ───────────── */

const tips = {
  defaults: { salary: "24000", tips: "22000", state: "NV", status: "single" },
  form(tables, v) {
    return `<div class="grid-2">${money("salary", "Wages, not counting tips", v.salary, { suffix: "a year", big: true })}${money("tips", "Tips", v.tips, { suffix: "a year", big: true })}</div>
      <div class="grid-2">${stateField(tables, "state", v.state)}${statusField(v.status)}</div>`;
  },
  out(tables, v) {
    const base = { ...input(v), tipsAnnual: num(v.tips) };
    const withDeduction = calculateTakeHome(base, tables);
    const without = calculateTakeHome({ ...base, workerDeductions: false }, tables);
    const saved = withDeduction.annual.net - without.annual.net;
    const mfs = v.status === "mfs";
    return `<p class="answer">${mfs ? "The tips deduction is not available when married filing separately." : `The tips deduction saves you about ${usd0(saved)} in tax this year.`}</p>
      <div class="figures">
        ${figure("Tips deducted", usd0(withDeduction.annual.tipsDeduction), "from federal taxable income (limit $25,000)")}
        ${figure("Tax saved", usd0(saved), "federal income tax, plus state tax where the state follows", "pos")}
        ${figure("Take-home pay", usd0(withDeduction.annual.net), `a year · ${usd(withDeduction.annual.net / 12)} a month`)}
      </div>
      ${compareTable(without, withDeduction, { labelA: "Without the deduction", labelB: "With it", perPeriod: false })}
      <p class="fine">From 2025 through 2028, workers in jobs that customarily receive tips can deduct up to $25,000 of qualified tips on the federal return. The limit shrinks by $100 for every $1,000 of income above $150,000 ($300,000 on a joint return). Tips are still subject to Social Security and Medicare, and most states still tax them. Mandatory service charges are not tips.</p>
      ${fine()}`;
  },
};

/* ───────────── raise ───────────── */

const raise = {
  defaults: { salary: "80000", next: "88000", state: "IL", local: "", status: "single", k401: "" },
  form(tables, v) {
    const current = num(v.salary);
    const percent = current > 0 ? Math.round(((num(v.next) - current) / current) * 1000) / 10 : 0;
    return `<div class="grid-3">${money("salary", "Pay now", v.salary, { suffix: "a year", big: true })}${money("next", "Pay after the raise", v.next, { suffix: "a year", big: true })}${number("pct", "Raise", String(percent), "%")}</div>
      <div class="grid-4">${stateField(tables, "state", v.state)}${localField(tables, "state", "local", v.state, v.local)}${statusField(v.status)}${number("k401", "401(k)", v.k401, "% of pay")}</div>`;
  },
  out(tables, v) {
    const before = calculateTakeHome(input(v), tables);
    const after = calculateTakeHome(input({ ...v, salary: v.next }), tables);
    const grossDelta = after.annual.gross - before.annual.gross;
    const netDelta = after.annual.net - before.annual.net;
    const kept = grossDelta !== 0 ? netDelta / grossDelta : 0;
    return `<p class="answer">${grossDelta >= 0 ? "The raise" : "The pay cut"} of ${usd0(Math.abs(grossDelta))} changes your take-home pay by ${signed(netDelta)} a year, or ${signed(after.periodNet - before.periodNet, 2)} a paycheck.</p>
      <div class="figures">
        ${figure("You keep", `${usd0(kept * 100)} of each $100`, "of the raise, after federal, state and local tax")}
        ${figure("Take-home now", usd(before.periodNet), `a paycheck · ${usd0(before.annual.net)} a year`)}
        ${figure("Take-home after", usd(after.periodNet), `a paycheck · ${usd0(after.annual.net)} a year`, "pos")}
      </div>
      ${compareTable(before, after, { labelA: "Now", labelB: "After" })}
      <p class="fine">A raise never lowers your take-home pay through income tax: only the dollars above a bracket line are taxed at the higher rate.</p>
      ${fine()}`;
  },
};

/* ───────────── 401(k) ───────────── */

const k401 = {
  defaults: { salary: "85000", k401: "6", match: "", state: "TX", status: "single", freq: "biweekly" },
  form(tables, v) {
    return `<div class="grid-3">${money("salary", "Salary", v.salary, { suffix: "a year", big: true })}${number("k401", "You put in", v.k401, "% of pay")}${number("match", "Employer match", v.match, "% of pay", "Optional. Shown as extra savings.")}</div>
      <div class="grid-3">${stateField(tables, "state", v.state)}${statusField(v.status)}${freqField(v.freq)}</div>`;
  },
  out(tables, v) {
    const run = (percent) => calculateTakeHome({ ...input(v), deductions: { traditional401k: { mode: "percent", value: percent } } }, tables);
    const chosen = Math.min(100, num(v.k401));
    const zero = run(0);
    const mine = run(chosen);
    const contribution = mine.annual.pretax;
    const cost = zero.annual.net - mine.annual.net;
    const taxSaved = contribution - cost;
    const matchAmount = (Math.min(num(v.match), 100) / 100) * mine.annual.gross;
    const steps = [...new Set([0, 3, 5, 6, 8, 10, 15, chosen])].sort((x, y) => x - y);
    const limit = tables.federal.limits?.electiveDeferral401k || 24500;
    const maxPct = mine.annual.gross > 0 ? (limit / mine.annual.gross) * 100 : 0;
    return `<p class="answer">Putting in ${commas(chosen, 2)}% saves ${usd0(contribution)} a year and lowers your paycheck by only ${usd(cost / mine.periods)}.</p>
      <div class="figures">
        ${figure("Into your 401(k)", usd0(contribution + matchAmount), matchAmount > 0 ? `a year: ${usd0(contribution)} from you, ${usd0(matchAmount)} from your employer` : "a year, from your pay", "pos")}
        ${figure("Income tax saved", usd0(taxSaved), `each $1 you save costs about ${usd(contribution > 0 ? cost / contribution : 1)} of take-home pay`)}
        ${figure("Take-home pay", usd(mine.periodNet), `a paycheck, down from ${usd(zero.periodNet)}`)}
      </div>
      <div class="table-wrap"><table><thead><tr><th scope="col">You put in</th><th scope="col" class="num">Saved a year</th><th scope="col" class="num">Income tax saved</th><th scope="col" class="num">Take-home a paycheck</th><th scope="col" class="num">Change</th></tr></thead><tbody>
        ${steps
          .map((percent) => {
            const r = run(percent);
            return `<tr${percent === chosen ? ' class="sum"' : ""}><th scope="row">${commas(percent, 2)}%</th><td class="num">${usd0(r.annual.pretax)}</td><td class="num">${usd0(r.annual.pretax - (zero.annual.net - r.annual.net))}</td><td class="num">${usd(r.periodNet)}</td><td class="num">${signed(r.periodNet - zero.periodNet, 2)}</td></tr>`;
          })
          .join("")}
      </tbody></table></div>
      <p class="fine">The 2026 employee limit is ${usd0(limit)}${mine.annual.gross > 0 && maxPct < 100 ? `, which is ${commas(maxPct, 1)}% of this salary` : ""}. People aged 50 or over can add catch-up contributions. A traditional 401(k) lowers income tax now; Social Security and Medicare are still charged on the full salary${mine.state?.pretax?.k401 === false ? `, and ${esc(mine.state.name)} still taxes the contribution` : ""}.</p>
      ${fine()}`;
  },
};

/* ───────────── employer cost ───────────── */

const employer = {
  defaults: { salary: "75000", state: "CO", status: "single", retire: "3000", health: "6000", suta: "" },
  form(tables, v) {
    return `<div class="grid-2">${money("salary", "Employee salary", v.salary, { suffix: "a year", big: true })}${stateField(tables, "state", v.state)}</div>
      <div class="grid-3">${money("retire", "Employer retirement contribution", v.retire, { suffix: "a year" })}${money("health", "Employer health contribution", v.health, { suffix: "a year" })}${number("suta", "State unemployment tax rate", v.suta, "% of pay", "Optional. Leave blank if you do not know it.")}</div>`;
  },
  out(tables, v) {
    const cost = calculateEmployerCost({ ...input(v), employerRetirementAnnual: num(v.retire), employerBenefitsAnnual: num(v.health), sutaRate: num(v.suta) }, tables);
    const er = cost.employer;
    const gross = cost.employee.annual.gross;
    const rows = [
      ["Salary", gross],
      ["Employer Social Security (6.2%)", er.socialSecurity],
      ["Employer Medicare (1.45%)", er.medicare],
      ["Federal unemployment tax", er.futa],
      ...er.programs.map((program) => [program.name, program.annual]),
      ["State unemployment tax", er.suta],
      ["Retirement contribution", er.retirement],
      ["Health contribution", er.benefits],
    ].filter(([, amount], index) => index === 0 || amount > 0.004);
    return `<p class="answer">A ${usd0(gross)} salary costs the employer about ${usd0(er.total)} a year${gross > 0 ? `, ${pct(er.total / gross - 1, 1)} on top of the salary` : ""}.</p>
      <div class="figures">
        ${figure("Total cost to the employer", usd0(er.total), `${usd0(er.total / 12)} a month`)}
        ${figure("Employee take-home", usd0(cost.employee.annual.net), `${usd(cost.employee.periodNet)} every two weeks`)}
        ${figure("Gap", usd0(er.total - cost.employee.annual.net), "taxes on both sides, plus benefits")}
      </div>
      <div class="table-wrap"><table><tbody>${rows.map(([label, amount]) => `<tr><th scope="row">${esc(label)}</th><td class="num">${usd(amount)}</td></tr>`).join("")}<tr class="sum"><th scope="row">Total</th><td class="num">${usd(er.total)}</td></tr></tbody></table></div>
      <p class="fine">Federal unemployment tax is 0.6% of the first $7,000 of pay ($42) for employers that pay their state unemployment tax on time. State unemployment rates depend on the employer's history, so it is counted only if you enter a rate; real state unemployment tax also stops at a wage limit. Workers' compensation insurance, equipment and office costs are not included.</p>
      ${fine()}`;
  },
};

/* ───────────── contractor vs employee ───────────── */

const contractor = {
  defaults: { salary: "90000", gross: "110000", expenses: "6000", state: "TX", status: "single" },
  form(tables, v) {
    return `<div class="grid-3">${money("salary", "Salary as an employee (W-2)", v.salary, { suffix: "a year", big: true })}${money("gross", "Income as a contractor (1099)", v.gross, { suffix: "a year", big: true })}${money("expenses", "Business expenses", v.expenses, { suffix: "a year" })}</div>
      <div class="grid-2">${stateField(tables, "state", v.state)}${statusField(v.status)}</div>`;
  },
  out(tables, v) {
    const w2 = calculateTakeHome(input(v), tables);
    const seInput = { ...input({ ...v, salary: v.gross }), employment: "contractor", contractorExpensesAnnual: num(v.expenses) };
    const se = calculateTakeHome(seInput, tables);
    const diff = se.annual.net - w2.annual.net;
    const need = w2.annual.net > 0 ? grossForNet(w2.annual.net, seInput, tables).gross : 0;
    return `<p class="answer">${Math.abs(diff) < 0.5 ? "Both leave the same take-home pay." : `${diff > 0 ? "The contract" : "The salaried job"} leaves you ${usd0(Math.abs(diff))} more a year.`} To match the ${usd0(w2.annual.gross)} salary you would need to bill about ${usd0(need)}.</p>
      <div class="figures">
        ${figure("Employee take-home", usd0(w2.annual.net), `${usd0(w2.annual.net / 12)} a month`)}
        ${figure("Contractor take-home", usd0(se.annual.net), `${usd0(se.annual.net / 12)} a month, after expenses and tax`)}
        ${figure("Set aside each quarter", usd0(se.quarterlySetAside || 0), "for income tax and self-employment tax")}
      </div>
      <div class="table-wrap"><table><thead><tr><th scope="col">For the year</th><th scope="col" class="num">Employee</th><th scope="col" class="num">Contractor</th></tr></thead><tbody>
        <tr><th scope="row">Pay</th><td class="num">${usd0(w2.annual.gross)}</td><td class="num">${usd0(se.annual.gross)}</td></tr>
        <tr><th scope="row">Business expenses</th><td class="num">${usd0(0)}</td><td class="num">${usd0(se.annual.expenses)}</td></tr>
        <tr><th scope="row">Social Security and Medicare</th><td class="num">${usd0(fica(w2))}</td><td class="num">${usd0(se.annual.selfEmployment)}</td></tr>
        <tr><th scope="row">Federal income tax</th><td class="num">${usd0(w2.annual.federalIncome)}</td><td class="num">${usd0(se.annual.federalIncome)}</td></tr>
        <tr><th scope="row">State and local tax</th><td class="num">${usd0(w2.annual.stateIncome + w2.annual.statePayroll + w2.annual.local)}</td><td class="num">${usd0(se.annual.stateIncome + se.annual.statePayroll + se.annual.local)}</td></tr>
        <tr class="sum"><th scope="row">Take-home pay</th><td class="num">${usd0(w2.annual.net)}</td><td class="num">${usd0(se.annual.net)}</td></tr>
      </tbody></table></div>
      <p class="fine">Contractors pay both halves of Social Security and Medicare (15.3% on 92.35% of profit) and get no employer benefits, paid leave or unemployment cover, so a contract usually needs to pay well above a salary to come out even. The 20% qualified business income deduction is not included, so the contractor figure may be a little low.</p>
      ${fine()}`;
  },
};

/* ───────────── take-home to salary ───────────── */

const reverse = {
  defaults: { want: "5000", per: "month", state: "CA", local: "", status: "single", freq: "biweekly", k401: "", kids: "" },
  form(tables, v) {
    return `<div class="grid-2"><label class="field big"><span class="label">Take-home pay you want</span><span class="control"><span class="affix">$</span><input name="want" inputmode="decimal" autocomplete="off" value="${esc(v.want)}"><select name="per" aria-label="Per">${opt("month", "a month", v.per)}${opt("period", "a paycheck", v.per)}${opt("year", "a year", v.per)}</select></span></label>${freqField(v.freq)}</div>
      <div class="grid-3">${stateField(tables, "state", v.state)}${localField(tables, "state", "local", v.state, v.local)}${statusField(v.status)}</div>
      <div class="grid-2">${number("k401", "401(k)", v.k401, "% of pay")}${number("kids", "Children under 17", v.kids)}</div>`;
  },
  out(tables, v) {
    const periods = PERIODS[v.freq] || 26;
    const target = num(v.want) * (v.per === "month" ? 12 : v.per === "period" ? periods : 1);
    const base = input({ ...v, salary: 0 });
    const { gross, result } = grossForNet(target, base, tables);
    return `<p class="answer">To take home ${usd0(num(v.want))} ${v.per === "month" ? "a month" : v.per === "period" ? "a paycheck" : "a year"} in ${esc(result.state?.name || "")}, you need a salary of about ${usd0(gross)}.</p>
      <div class="figures">
        ${figure("Salary needed", usd0(gross), `a year · ${usd(gross / 2080)} an hour at 40 hours a week`, "pos")}
        ${figure("Taxes", usd0(result.annual.taxes), `${pct(result.effectiveTaxRate, 1)} of the salary`)}
        ${figure("Take-home pay", usd0(result.annual.net), `a year · ${usd(result.annual.net / 12)} a month · ${usd(result.periodNet)} a paycheck`)}
      </div>
      ${renderChart(result)}
      ${renderLines(result)}
      ${renderMath(result)}
      <p>${calcLink({ pay: Math.round(gross), state: v.state, local: v.local, status: v.status === "single" ? "" : v.status, freq: v.freq === "biweekly" ? "" : v.freq, k401: v.k401, kids: v.kids })}</p>
      ${fine()}`;
  },
};

/* ───────────── salary and hourly converter ───────────── */

const UNITS = [
  ["hour", "an hour"],
  ["day", "a day"],
  ["week", "a week"],
  ["biweek", "every two weeks"],
  ["month", "a month"],
  ["year", "a year"],
];

const convert = {
  defaults: { amount: "30", unit: "hour", hours: "40", weeks: "52", state: "TX", status: "single" },
  form(tables, v) {
    return `<div class="grid-3"><label class="field big"><span class="label">Pay before taxes</span><span class="control"><span class="affix">$</span><input name="amount" inputmode="decimal" autocomplete="off" value="${esc(v.amount)}"><select name="unit" aria-label="Per">${UNITS.map(([id, label]) => opt(id, label, v.unit)).join("")}</select></span></label>${number("hours", "Hours a week", v.hours, "hr")}${number("weeks", "Paid weeks a year", v.weeks, "wk")}</div>
      <div class="grid-2">${stateField(tables, "state", v.state)}${statusField(v.status)}</div>`;
  },
  out(tables, v) {
    const hours = num(v.hours) || 40;
    const weeks = Math.min(53, num(v.weeks) || 52);
    const days = 5;
    const perYear = { hour: hours * weeks, day: days * weeks, week: weeks, biweek: weeks / 2, month: 12, year: 1 };
    const annual = num(v.amount) * (perYear[v.unit] || 1);
    const result = calculateTakeHome({ ...input(v), grossAnnual: annual }, tables);
    const share = annual > 0 ? result.annual.net / annual : 0;
    const rows = UNITS.map(([id, label]) => {
      const gross = annual / perYear[id];
      return `<tr${id === v.unit ? ' class="sum"' : ""}><th scope="row">${label[0].toUpperCase()}${label.slice(1)}</th><td class="num">${usd(gross)}</td><td class="num">${usd(gross * share)}</td></tr>`;
    }).join("");
    const unitLabel = UNITS.find(([id]) => id === v.unit)?.[1] || "";
    return `<p class="answer">${usd(num(v.amount))} ${unitLabel} is ${usd0(annual)} a year before taxes and about ${usd0(result.annual.net)} after, in ${esc(result.state?.name || "")}.</p>
      <div class="figures">
        ${figure("A year", usd0(annual), `${usd0(result.annual.net)} after tax`)}
        ${figure("A month", usd0(annual / 12), `${usd0(result.annual.net / 12)} after tax`)}
        ${figure("An hour", usd(annual / (hours * weeks)), `${usd((annual / (hours * weeks)) * share)} after tax`, "pos")}
      </div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Pay</th><th scope="col" class="num">Before taxes</th><th scope="col" class="num">After taxes</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="fine">Based on ${commas(hours, 2)} hours a week for ${commas(weeks, 2)} weeks, which is ${commas(hours * weeks, 1)} paid hours a year, and a five-day week. After-tax figures use the year's average: ${pct(1 - share, 1)} of pay goes to tax.</p>
      <p>${calcLink({ pay: Math.round(annual), state: v.state, status: v.status === "single" ? "" : v.status })}</p>
      ${fine()}`;
  },
};

/* ───────────── take-home by state ───────────── */

// A tile map of the states: [column, row].
export const TILE = {
  AK: [0, 0], ME: [11, 0], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], WI: [7, 2], MI: [8, 2], NY: [9, 2], RI: [10, 2], MA: [11, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [9, 7],
};

export function rankStates(tables, v) {
  return tables.states.states
    .map((state) => {
      const result = calculateTakeHome({ ...input({ ...v, state: state.id, local: "" }) }, tables);
      return { state, result, net: result.annual.net, stateTax: result.annual.stateIncome + result.annual.statePayroll };
    })
    .sort((a, b) => b.net - a.net || a.state.name.localeCompare(b.state.name));
}

const rank = {
  defaults: { salary: "85000", status: "single", kids: "" },
  form(tables, v) {
    return `<div class="grid-3">${money("salary", "Salary", v.salary, { suffix: "a year", big: true })}${statusField(v.status)}${number("kids", "Children under 17", v.kids)}</div>`;
  },
  out(tables, v) {
    const rows = rankStates(tables, v);
    const best = rows[0];
    const worst = rows.at(-1);
    const span = best.net - worst.net || 1;
    const bucket = (net) => Math.min(4, Math.floor(((best.net - net) / span) * 5));
    const nameOf = Object.fromEntries(tables.states.states.map((state) => [state.id, state.name]));
    const href = (id) => `/${slugify(nameOf[id])}-paycheck-calculator/?pay=${Math.round(num(v.salary))}${v.status !== "single" ? `&status=${v.status}` : ""}`;
    const tiles = rows
      .map((row) => {
        const [col, r] = TILE[row.state.id] || [0, 0];
        return `<a class="tile b${bucket(row.net)}" style="grid-column:${col + 1};grid-row:${r + 1}" href="${href(row.state.id)}" title="${esc(row.state.name)}: ${usd0(row.net)} a year"><span>${row.state.id}</span></a>`;
      })
      .join("");
    const body = rows
      .map(
        (row, index) =>
          `<tr><td class="num rank">${index + 1}</td><th scope="row"><a href="${href(row.state.id)}">${esc(row.state.name)}</a></th><td class="num">${usd0(row.stateTax)}</td><td class="num">${usd0(row.net)}</td><td class="num">${usd0(row.net / 12)}</td><td class="num diff">${index === 0 ? "" : Math.abs(row.net - best.net) < 0.5 ? "same" : signed(row.net - best.net)}</td></tr>`,
      )
      .join("");
    const tied = rows.filter((row) => Math.abs(row.net - best.net) < 0.5).length;
    return `<p class="answer">On ${usd0(num(v.salary))} a year, take-home pay runs from ${usd0(best.net)} in ${esc(best.state.name)}${tied > 1 ? ` and ${tied - 1} other state${tied > 2 ? "s" : ""}` : ""} down to ${usd0(worst.net)} in ${esc(worst.state.name)}: a gap of ${usd0(span)} a year.</p>
      <div class="tilemap" role="img" aria-label="Map of take-home pay by state. Darker states keep more.">${tiles}</div>
      <p class="tile-key"><span class="tile b0"></span> keeps the most <span class="tile b2"></span> <span class="tile b4"></span> keeps the least</p>
      <div class="table-wrap"><table class="rank-table"><thead><tr><th scope="col" class="num">#</th><th scope="col">State</th><th scope="col" class="num">State taxes</th><th scope="col" class="num">Take-home a year</th><th scope="col" class="num">A month</th><th scope="col" class="num">Against the top</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="fine">State taxes are state income tax plus payroll programs taken from pay, such as California SDI. City and county income taxes are left out because they depend on where in the state you live. Federal tax, Social Security and Medicare are the same everywhere.</p>
      ${fine()}`;
  },
};

export const TOOLS = { compare, bonus, overtime, tips, raise, "401k": k401, employer, contractor, reverse, convert, rank };

/** Default values for a tool, with any link parameters applied. */
export function toolValues(id, q) {
  const tool = TOOLS[id];
  const v = { ...tool.defaults };
  if (q) {
    for (const key of Object.keys(v)) if (q.has(key)) v[key] = String(q.get(key)).slice(0, 60);
    tool.fromQuery?.(q, v);
    for (const key of Object.keys(v)) if (/state$/.test(key)) v[key] = String(v[key]).toUpperCase().slice(0, 2);
  }
  return v;
}

export function renderTool(id, tables, v) {
  const tool = TOOLS[id];
  return `<form class="tool-form" id="tool-form" novalidate autocomplete="off">${tool.form(tables, v)}</form><div class="tool-out" data-out aria-live="polite">${tool.out(tables, v)}</div>`;
}

export function mountTool(root, tables) {
  const id = root.dataset.tool;
  const tool = TOOLS[id];
  if (!tool) return;
  const q = new URLSearchParams(location.search);
  let pageDefaults = {};
  try {
    pageDefaults = JSON.parse(root.dataset.defaults || "{}");
  } catch {
    pageDefaults = {};
  }
  let v = { ...tool.defaults, ...pageDefaults };
  const linked = toolValues(id, q);
  const hasLink = Object.keys(v).some((key) => q.has(key)) || ["salary", "pay", "state", "state2", "local", "local2", "pay2"].some((key) => q.has(key));
  if (hasLink) for (const key of Object.keys(v)) if (linked[key] !== tool.defaults[key]) v[key] = linked[key];
  if (hasLink || !root.querySelector("#tool-form")) root.innerHTML = renderTool(id, tables, v);
  const form = root.querySelector("#tool-form");
  const out = root.querySelector("[data-out]");

  const read = () => {
    const next = { ...tool.defaults };
    for (const key of Object.keys(next)) {
      const el = form.elements[key];
      if (el) next[key] = el.value;
    }
    return next;
  };
  let shown = JSON.stringify(v);
  const paint = () => {
    v = read();
    // Skip the re-draw when nothing changed, so a click on a link in the result is not lost.
    const next = JSON.stringify(v);
    if (next === shown) return;
    shown = next;
    out.innerHTML = tool.out(tables, v);
  };
  const update = debounce(paint, 110);

  form.addEventListener("input", (event) => {
    // The raise tool keeps the percent and the new salary in step.
    if (id === "raise") {
      const current = num(form.elements.salary.value);
      if (event.target.name === "pct") form.elements.next.value = String(Math.round(current * (1 + num(event.target.value) / 100)));
      else if (current > 0 && (event.target.name === "salary" || event.target.name === "next")) form.elements.pct.value = String(Math.round(((num(form.elements.next.value) - current) / current) * 1000) / 10);
    }
    update();
  });
  form.addEventListener("change", (event) => {
    const stateName = event.target.dataset.stateFor;
    if (stateName) {
      const holder = form.querySelector(`[data-local-of="${stateName}"]`);
      if (holder) holder.outerHTML = localField(tables, stateName, holder.querySelector("select").name, event.target.value, "");
    }
    paint();
  });
  form.addEventListener("submit", (event) => event.preventDefault());

  const share = root.parentElement?.querySelector("[data-tool-link]");
  share?.addEventListener("click", async () => {
    const params = new URLSearchParams();
    const now = read();
    for (const [key, value] of Object.entries(now)) if (value !== "" && value !== tool.defaults[key]) params.set(key, value);
    const link = `${location.origin}${location.pathname}${params.toString() ? `?${params}` : ""}`;
    try {
      await navigator.clipboard.writeText(link);
      share.textContent = "Link copied";
      setTimeout(() => (share.textContent = "Copy a link to these numbers"), 1800);
    } catch {
      window.prompt("Copy this link", link);
    }
  });
}

