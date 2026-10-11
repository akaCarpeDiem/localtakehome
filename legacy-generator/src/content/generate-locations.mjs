/** Build generated state pages from per-state unique copy + published tax facts.
 * Launch pages in locations.mjs stay hand-authored. Every generated state has its
 * own lead paragraphs and FAQs — not a shared template with the state name swapped.
 */

function pct(rate) {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const n = rate * 100;
  return `${n.toFixed(n >= 10 || Number.isInteger(n * 10) ? 1 : 2).replace(/\.0$/, "")}%`;
}

function topRate(state) {
  const rows = state.brackets?.single || [];
  if (!rows.length) return null;
  return Math.max(...rows.map((row) => row.rate), 0);
}

function flatRate(state) {
  const rows = state.brackets?.single || [];
  if (state.type === "flat" || state.flat || state.special === "utah") {
    if (Number.isFinite(state.rate) && state.rate > 0) return state.rate;
    const taxed = rows.filter((row) => row.rate > 0);
    if (taxed.length) return taxed[taxed.length - 1].rate;
    const fromTop = topRate(state);
    if (fromTop) return fromTop;
    const blob = `${state.why || ""} ${state.notes || ""}`;
    const m = blob.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return Number(m[1]) / 100;
  }
  return null;
}

function bracketSummary(state) {
  const rows = (state.brackets?.single || []).filter((row) => row.rate > 0);
  if (!rows.length) return null;
  const low = pct(rows[0].rate);
  const high = pct(rows[rows.length - 1].rate);
  if (low === high) return `a ${high} rate`;
  return `brackets from ${low} to ${high}`;
}

function shapeLabel(state) {
  if (!state.wageTax) return "none";
  if (state.type === "flat" || state.flat) return "flat";
  return "graduated";
}

function slugFor(state) {
  if (state.id === "DC") return "district-of-columbia-paycheck-calculator";
  return `${state.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}-paycheck-calculator`;
}

function payrollFor(state, payroll) {
  return (payroll.programs || []).filter((p) => p.state === state.id);
}

/**
 * Hand-written uniqueness map. Keys are state ids not covered by launch pages.
 * paragraphs: 2–3 strings. faqs: [question, answer][] — questions must differ across states.
 */
const UNIQUE = {
  AL: {
    description:
      "Estimate a 2026 Alabama paycheck with federal tax, FICA, and state brackets to 5% — federal-tax deduction not modeled.",
    paragraphs: [
      "Alabama’s income tax tops out at 5% after a small standard deduction ($3,000 single / $8,500 joint) and a personal exemption. The brackets move quickly: the top rate starts at only $3,000 of taxable income for a single filer. That structure looks mild next to California, and it still bites early. Some cities can add a local wage tax; this page leaves them off until you select one or type a custom percent.",
      "Alabama lets you deduct federal income tax on the state return. This estimate does not take that deduction, so the Alabama line runs high on purpose rather than inventing a federal-tax figure. The standard deduction also phases down as AGI rises, and that phaseout is not computed either. Treat a mid-salary result as a ceiling on the state piece, not a payroll printout.",
      "A traditional 401(k) reduces the Alabama wage base here; Social Security and Medicare do not move. Use the compare tool when an offer sits next to a no-tax southern state — the gap is Alabama’s brackets plus whatever local percent you add, not a different federal schedule.",
    ],
    faqs: [
      [
        "Why does this Alabama estimate run high?",
        "Federal income tax is deductible on an Alabama return and is omitted here. The standard-deduction phaseout is also omitted. Both choices push the state line up.",
      ],
      [
        "How early does Alabama’s 5% rate start?",
        "On the single schedule in this file, the top 5% bracket begins at $3,000 of taxable income after the small deduction and exemption.",
      ],
      [
        "Are Birmingham or Huntsville city taxes included?",
        "Not automatically. Alabama can have local wage taxes; enter a custom percent or leave local off for a statewide-only estimate.",
      ],
    ],
  },
  AK: {
    description:
      "Estimate a 2026 Alaska paycheck. No state wage tax. Federal brackets and FICA still apply; Permanent Fund Dividend is not a paycheck line.",
    paragraphs: [
      "Alaska does not tax wages. There is no state income-tax withholding to model, and this file does not invent one. A $75,000 salary still loses federal income tax after the 2026 standard deduction, plus 6.2% Social Security up to $184,500 and 1.45% Medicare with no ceiling. The state line on the stub is $0. The deposit is not the gross.",
      "The Permanent Fund Dividend is a separate annual payment, not a payroll withholding, so it never appears on this estimate. Anchorage and Fairbanks do not add a city wage tax in the model. If a recruiter says “Alaska means you keep everything after FICA,” the federal brackets are the missing half of the story.",
      "Use Alaska as the clean no-state baseline when you compare an offer with a taxed lower-48 state at the same salary. The federal math is shared; the gap is the other state’s income tax, any local line, and payroll premiums such as California SDI or Washington Paid Leave.",
    ],
    faqs: [
      [
        "Does Alaska withhold state income tax from wages?",
        "No. The state income-tax line is zero. Federal income tax and FICA still apply.",
      ],
      [
        "Is the Permanent Fund Dividend in this calculator?",
        "No. It is not a wage withholding. This page estimates paycheck taxes only.",
      ],
      [
        "Do Alaska cities tax wages here?",
        "Not in this file. The statewide estimate does not invent a municipal rate.",
      ],
    ],
  },
  AR: {
    description:
      "Estimate a 2026 Arkansas paycheck with 2% then 3.9% brackets; the separate low-income table is not switched in.",
    paragraphs: [
      "Arkansas is modeled at 2%, then 3.9% over $4,600 of taxable income, after a small standard deduction around $2,470 single and a tiny exemption credit. The top rate arrives early, which makes a middle salary look more “flat 3.9% after a little relief” than a long graduated climb. There is no named city wage tax in this file.",
      "Arkansas publishes a different official rate table for filers under about $92,000 of income, plus a bracket-adjustment credit. This estimate stays on the regular 2% / 3.9% schedule and does not switch tables, so some lower-to-middle incomes can differ from a real AR return. The confidence label is estimated for that reason.",
      "A traditional 401(k) reduces the Arkansas base here; FICA does not. When you compare Arkansas with Texas at the same salary, the federal lines match and the gap is almost entirely this state schedule — not a local add-on we forgot to name.",
    ],
    faqs: [
      [
        "What Arkansas rates does this page use?",
        "The regular 2% then 3.9% schedule after the small standard deduction and exemption credit in the 2026 table.",
      ],
      [
        "Why might my real Arkansas tax be lower?",
        "Filers under about $92,000 can use a separate official table and credits this estimate does not switch to.",
      ],
      [
        "Is there an Arkansas city wage tax in the model?",
        "No named city. Leave local off unless you know a real local percent to enter.",
      ],
    ],
  },
  CT: {
    description:
      "Estimate a 2026 Connecticut paycheck with graduated rates to 6.99%, exemption phaseout, and Connecticut Paid Leave.",
    paragraphs: [
      "Connecticut runs graduated rates from 2% up to 6.99% after a personal exemption that phases out as income rises — $15,000 single starting to fade from $30,000 of AGI, and $24,000 joint from $48,000. There is no separate standard deduction in this table. On top of the income tax, employees see Connecticut Paid Leave as its own payroll premium.",
      "The 2% bracket recapture and the tax-benefit phaseout that raise the official bill above middle incomes are not fully computed. Above roughly $56,500 single or $100,500 joint, treat this state line as low relative to a full CT-1040. Personal-tax-credit percentages from the footnotes are omitted for the same reason.",
      "A traditional 401(k) lowers the Connecticut income-tax base; it does not lower FICA or the Paid Leave wage in this model’s usual treatment. Hartford does not add a city income tax here. Use the stub to see income tax and Paid Leave as separate lines rather than one blended “Connecticut percent.”",
    ],
    faqs: [
      [
        "What is Connecticut Paid Leave on this estimate?",
        "An employee payroll premium modeled separately from the income-tax brackets. It is not folded into the 6.99% top rate.",
      ],
      [
        "Why can high earners see a low Connecticut line here?",
        "Bracket recapture and tax-benefit phaseouts above middle incomes are not fully modeled, so the official tax is often higher.",
      ],
      [
        "Does the personal exemption always apply?",
        "No. It phases out with AGI — from $30,000 single and $48,000 joint in this model — and can fall to zero.",
      ],
    ],
  },
  DE: {
    description:
      "Estimate a 2026 Delaware paycheck with brackets to 6.6%, a zero-tax first $2,000, and optional local wage tax.",
    paragraphs: [
      "Delaware’s schedule runs from a 0% slice on the first $2,000 of taxable income up through 6.6% over $60,000, after a $3,250 single standard deduction and a $110 exemption credit. Joint brackets are not doubled in the 2026 table, which matters when you compare a married return with a federal schedule that widens thresholds.",
      "Wilmington and some other places can impose a local wage tax. This state page starts with local off; pick a named place only if it applies, or enter a custom percent from your stub. Do not borrow a Pennsylvania or Maryland local rate for a Delaware paycheck.",
      "A traditional 401(k) reduces Delaware wages here; Social Security and Medicare stay on their own bases. The raise calculator is useful in Delaware because a modest raise can push you through several thin brackets before you ever hit 6.6%.",
    ],
    faqs: [
      [
        "Is the first $2,000 of Delaware income untaxed?",
        "Yes in this model: the published schedule leaves the first $2,000 of taxable income at 0% before higher rates begin.",
      ],
      [
        "Are Delaware brackets doubled for joint filers?",
        "Not in the 2026 table used here. Thresholds follow the single-width schedule for joint returns as published.",
      ],
      [
        "Is Wilmington tax included automatically?",
        "No. Local tax stays off until you select a place or enter a custom percent.",
      ],
    ],
  },
  HI: {
    description:
      "Estimate a 2026 Hawaii paycheck with twelve brackets from 1.4% to 11%; Hawaii TDI is not modeled.",
    paragraphs: [
      "Hawaii uses twelve brackets, from 1.4% to 11%, after a $4,400 single / $8,800 joint standard deduction and a personal exemption of $1,144 / $2,288. Joint thresholds are double the single ones. The top rate is among the highest state schedules in this file, and it is reached at high taxable income — a middle salary is not taxed at 11% on every dollar.",
      "Hawaii Temporary Disability Insurance (TDI) is a real payroll item for many employees and is not in the payroll file yet, on purpose. This page will not invent a silent $0 TDI line. If your stub shows TDI, add it mentally or in a spreadsheet; the income-tax estimate still stands on its own.",
      "Honolulu does not add a separate city income tax in this model. A traditional 401(k) reduces the Hawaii base; FICA does not. Compare Hawaii with a mainland no-tax state at the same salary when relocation talk ignores how many thin brackets stack before the top rate.",
    ],
    faqs: [
      [
        "Is Hawaii’s 11% rate on my whole salary?",
        "No. Only the top slice of taxable income uses 11%. Lower brackets start at 1.4% after the state deduction and exemption.",
      ],
      [
        "Is Hawaii TDI included?",
        "Not yet. Temporary Disability Insurance is documented as not modeled so it is not mistaken for zero income tax.",
      ],
      [
        "Are joint Hawaii brackets wider?",
        "Yes. Joint thresholds are double the single schedule in this file.",
      ],
    ],
  },
  ID: {
    description:
      "Estimate a 2026 Idaho paycheck at a flat 5.3% after the federal standard deduction and a small zero-rate threshold.",
    paragraphs: [
      "Idaho taxes wages at 5.3% after House Bill 40, starting from a standard deduction that matches the 2026 federal amounts ($16,100 single / $32,200 joint). The published table also shows a zero-rate threshold near $4,811 single / $9,622 joint; this estimate applies that threshold. Inflation-adjusted widths for 2026 were not fully available in the source table, so confidence is estimated.",
      "Boise does not add a city wage tax here. Because the rate is flat above the threshold, reasoning about a raise is simpler than in a twelve-bracket state — and still not “5.3% of gross,” because the federal-sized deduction and the zero slice come off first. Federal brackets and FICA remain the larger lines for most salaries.",
      "A traditional 401(k) reduces the Idaho base; it does not reduce Social Security or Medicare. If the zero-rate threshold is already baked into how your payroll starts the 5.3% calculation, this line can run slightly low — the methodology calls that out rather than hiding it.",
    ],
    faqs: [
      [
        "What is Idaho’s 2026 rate in this model?",
        "A flat 5.3% after the federal-sized standard deduction and the table’s small zero-rate threshold.",
      ],
      [
        "Why is Idaho marked estimated?",
        "2026 inflation-adjusted bracket widths were not fully published in the source table used here.",
      ],
      [
        "Does Boise tax wages on this page?",
        "Not as a city income tax. The state line is the only Idaho income tax applied.",
      ],
    ],
  },
  IN: {
    description:
      "Estimate a 2026 Indiana paycheck at a flat 2.95% after a $1,000 exemption; counties add local tax separately.",
    paragraphs: [
      "Indiana’s state income tax is a flat 2.95% after a $1,000 personal exemption ($2,000 joint), down from 3% on January 1, 2026. A further cut to 2.9% scheduled for 2027 is not used early. The state piece is simple. The county piece is where Indiana paychecks diverge: every county levies a local income tax, and only Marion County (Indianapolis) is named in the calculator.",
      "Open the Indianapolis page when Marion County is your locality. For Allen, Hamilton, or any other county, enter the certified percent from the Department of Revenue chart as a custom local rate. Leaving Marion selected for a suburban county will misstate the local line.",
      "A traditional 401(k) reduces the Indiana state base in this model. Federal tax and FICA still dominate most salaries. Reciprocity notes can appear when you mark a work state; this page still taxes Indiana and does not prepare the other return.",
    ],
    faqs: [
      [
        "What is Indiana’s state rate for 2026?",
        "A flat 2.95% after a $1,000 single / $2,000 joint personal exemption.",
      ],
      [
        "Is county tax included on the state page?",
        "Only if you select Marion County or enter a custom percent. The state page starts with local off.",
      ],
      [
        "Will the rate fall again in 2027?",
        "A cut to 2.9% is scheduled; this file keeps 2.95% for tax year 2026.",
      ],
    ],
  },
  IA: {
    description:
      "Estimate a 2026 Iowa paycheck at a flat 3.8% after the federal standard deduction and a small exemption credit.",
    paragraphs: [
      "Iowa finished its move to a flat income tax: 3.8% after a standard deduction tied to the 2026 federal amounts, then a small exemption credit of $40 single / $80 joint. That is a different animal from the old multi-bracket Iowa schedule recruiters still quote from memory. Des Moines and other places can have local options; this page leaves local off until you add one.",
      "Because the deduction matches federal sizing, Iowa taxable wages often look familiar if you just glanced at your federal base — then the flat 3.8% applies. A traditional 401(k) reduces that base here; FICA does not. School district or city surtaxes, where they exist, need a custom percent rather than a guess.",
      "Iowa has reciprocity conversations with several neighbors. Marking a work state can surface a note; the estimate still taxes the state you opened and does not compute credits for tax paid elsewhere.",
    ],
    faqs: [
      [
        "Is Iowa still a graduated tax in 2026?",
        "Not in this model. Wages are taxed at a flat 3.8% after the federal-sized standard deduction and a small exemption credit.",
      ],
      [
        "What is the $40 / $80 line?",
        "A personal exemption credit subtracted after the flat tax is computed, not a large deduction.",
      ],
      [
        "Are Iowa school district taxes included?",
        "Not automatically. Enter a custom local percent if your stub shows one.",
      ],
    ],
  },
  KS: {
    description:
      "Estimate a 2026 Kansas paycheck at 5.2% and 5.58% after a large personal exemption and smaller standard deduction.",
    paragraphs: [
      "Kansas uses two rates — 5.2%, then 5.58% over $23,000 single — after a large personal exemption ($9,160 single / $18,320 joint) and a smaller standard deduction ($3,605 / $8,240). The exemption is the headline relief: it is much bigger than the deduction. Local wage taxes exist in a few Kansas jurisdictions and are not named here; use a custom percent if you know yours.",
      "A traditional 401(k) reduces the Kansas base; Social Security and Medicare do not. Because the top rate arrives at a modest taxable-income threshold, many middle salaries sit mostly in the 5.58% slice after the big exemption — the compare tool against Missouri or Nebraska shows how close the regional stacks are once federal tax is shared.",
      "Dependent exemptions from the published table apply when you enter a dependent count. Do not assume Wichita or Kansas City, KS adds a city line unless your stub says so.",
    ],
    faqs: [
      [
        "What are the Kansas rates in this file?",
        "5.2%, then 5.58% over $23,000 of taxable income for a single filer, after the large personal exemption and standard deduction.",
      ],
      [
        "Why is the Kansas exemption so large?",
        "The 2026 table treats the personal exemption as a deduction of $9,160 single / $18,320 joint — larger than the standard deduction beside it.",
      ],
      [
        "Does Kansas City, KS tax wages here?",
        "No named city. Enter a custom percent only for a real local wage tax.",
      ],
    ],
  },
  KY: {
    description:
      "Estimate a 2026 Kentucky paycheck at a flat 3.5% after a $3,360 standard deduction; city occupational taxes are custom.",
    paragraphs: [
      "Kentucky cut its flat rate to 3.5% on January 1, 2026, after a $3,360 standard deduction that is not doubled for a joint return (married filing separately is modeled with $6,720, matching the published note). The state piece got simpler. The local piece did not: many Kentucky cities and counties levy an occupational or income tax that is not in the named local list.",
      "Louisville, Lexington, and smaller cities often show a local percent on the stub. Enter that figure as a custom local rate rather than hoping Louisville is assumed. Leaving local blank is correct only when you truly have no occupational tax.",
      "A traditional 401(k) reduces the Kentucky state base here. Federal brackets and FICA still dwarf 3.5% for most salaries — until you stack a 1–2% local occupational tax on top and the combined bite looks less “low tax South” than the headline rate suggested.",
    ],
    faqs: [
      [
        "What is Kentucky’s state rate in 2026?",
        "A flat 3.5% after a $3,360 standard deduction (not doubled for joint filers in this table).",
      ],
      [
        "Why isn’t Louisville tax on the state page?",
        "Occupational and city taxes vary and are not named in the launch local file. Enter your stub’s percent as a custom rate.",
      ],
      [
        "Did Kentucky just cut the rate?",
        "Yes. It moved from 4% to 3.5% at the start of 2026. Older calculators may still show 4%.",
      ],
    ],
  },
  LA: {
    description:
      "Estimate a 2026 Louisiana paycheck at a flat 3% after a $12,875 single or $25,750 joint standard deduction.",
    paragraphs: [
      "Louisiana taxes wages at a flat 3% after a comparatively large standard deduction: $12,875 single or $25,750 joint, with no personal exemption in the 2026 table. That combination keeps the state line modest on middle salaries. New Orleans does not add a city income tax on wages in this model.",
      "The flat rate is easy to reason about and still not “3% of gross.” The deduction comes off first; federal brackets and 7.65% FICA remain the main withholdings. A traditional 401(k) reduces the Louisiana base; it does not reduce Social Security or Medicare.",
      "Sales tax and insurance costs are real Louisiana household facts and are not paycheck lines, so this calculator does not fold them into net pay. Use the result to compare a Louisiana offer with Texas or Florida at the same salary — the federal math matches; the gap is this 3% after deduction versus zero state tax.",
    ],
    faqs: [
      [
        "How much of a Louisiana salary does the state keep after the deduction?",
        "A flat 3% of taxable wages after the $12,875 single or $25,750 joint standard deduction — not 3% of gross.",
      ],
      [
        "Is there a Louisiana personal exemption?",
        "Not in the 2026 table used here. Relief comes from the standard deduction.",
      ],
      [
        "Does New Orleans add a wage tax?",
        "Not in this estimate. The state line is the only Louisiana income tax applied.",
      ],
    ],
  },
  ME: {
    description:
      "Estimate a 2026 Maine paycheck with rates to 7.15%; standard deduction may be low if federal conformity is higher.",
    paragraphs: [
      "Maine’s brackets are 5.8%, 6.75%, and 7.15% after a personal exemption and a standard deduction. This file uses $8,350 single / $16,700 joint for that deduction because the Tax Foundation conformity footnote still pointed at a pre-OBBBA federal amount. If Maine has since adopted the higher 2026 federal deduction, this state line runs high.",
      "Dependent relief is a credit in Maine and is not modeled when you enter a dependent count. Exemption and deduction phaseouts at higher incomes are also omitted. Portland does not add a city wage tax here. Paid family leave programs for Maine are documented as not modeled yet.",
      "A traditional 401(k) reduces the Maine income-tax base; FICA does not. Read the confidence label: estimated means the conformity and phaseout gaps are known, not that the brackets themselves were invented.",
    ],
    faqs: [
      [
        "What Maine rates are in this calculator?",
        "5.8%, 6.75%, and 7.15% after the modeled deduction and personal exemption.",
      ],
      [
        "Why might the Maine deduction be too small?",
        "The estimate uses a pre-OBBBA conformity figure ($8,350 / $16,700). A higher federal-conformity deduction would lower tax.",
      ],
      [
        "Are Maine dependent credits included?",
        "No. Dependent credits are not modeled; entering a dependent count does not invent them.",
      ],
    ],
  },
  MN: {
    description:
      "Estimate a 2026 Minnesota paycheck with brackets from 5.35% to 9.85%; high-income phaseouts and surtax not modeled.",
    paragraphs: [
      "Minnesota’s graduated rates run from 5.35% to 9.85% after a $15,300 single / $30,600 joint standard deduction and a $5,300 dependent deduction when you enter a count. There is no separate personal exemption in the table. Minneapolis and Saint Paul do not add a city income tax on wages in this model.",
      "At higher incomes Minnesota phases out the standard deduction and can add a 1% investment-income surtax above $1 million. Neither is computed here, so a high earner’s state line can run low. Middle salaries are usually fine on the main brackets alone.",
      "A traditional 401(k) reduces the Minnesota base; FICA does not. Paid leave programs for Minnesota are not in the employee payroll file yet. Use the compare tool against Wisconsin or Iowa when an offer straddles the border — the federal lines match; the state schedules do not.",
    ],
    faqs: [
      [
        "What is Minnesota’s top rate in this file?",
        "9.85% on the highest slice of taxable income after the state standard deduction.",
      ],
      [
        "Why can high earners see a low Minnesota line?",
        "Standard-deduction phaseout and the 1% investment-income surtax above $1 million are not computed.",
      ],
      [
        "Do Twin Cities wages get a city tax here?",
        "Not as a city income tax. The state brackets are the Minnesota income tax applied.",
      ],
    ],
  },
  MS: {
    description:
      "Estimate a 2026 Mississippi paycheck at 4% after a $10,000 zero-rate threshold, standard deduction, and exemption.",
    paragraphs: [
      "Mississippi’s rate fell to 4% on January 1, 2026. This estimate applies a $10,000 zero-rate threshold plus the published standard deduction and personal exemption. If the official form overlaps those reliefs differently than stacking them, the state line here can run low — that is why confidence is estimated.",
      "Jackson does not add a city wage tax in this model. The story for a middle salary is mostly federal tax and FICA, then a modest Mississippi slice after a sizable zero band. A traditional 401(k) reduces the state base; it does not reduce payroll taxes.",
      "When someone compares Mississippi with Alabama, remember Alabama’s federal-tax deduction is omitted (pushing Alabama high) while Mississippi’s overlapping reliefs may push this line low. Both are labeled honestly rather than forced to a fake precision.",
    ],
    faqs: [
      [
        "What Mississippi rate applies in 2026?",
        "A 4% rate after the modeled $10,000 zero-rate threshold, standard deduction, and personal exemption.",
      ],
      [
        "Why is Mississippi marked estimated?",
        "The official interaction between the zero-rate threshold, deduction, and exemption may not match stacking all three as this file does.",
      ],
      [
        "Is there a Jackson city income tax here?",
        "No. The statewide estimate does not invent a municipal wage tax.",
      ],
    ],
  },
  MO: {
    description:
      "Estimate a 2026 Missouri paycheck with a 4.7% top rate; federal-income-tax deduction omitted, so the line runs high.",
    paragraphs: [
      "Missouri reaches a 4.7% top rate at a low taxable-income bracket after a standard deduction that matches the 2026 federal amounts. Brackets are not doubled for joint filers. Kansas City and St. Louis can levy earnings taxes; they are not assumed on this state page — enter a custom percent when your stub shows one.",
      "Missouri allows some or all of federal income tax as a deduction on the state return. This estimate leaves that deduction out, so the Missouri line runs high. That is intentional understatement of net pay rather than a silent optimistic guess.",
      "A traditional 401(k) reduces the Missouri base; FICA does not. Use the compare tool with Illinois or Kansas at the same salary when an offer sits on a border — and add an earnings-tax percent only for the city that actually withholds it.",
    ],
    faqs: [
      [
        "Why does this Missouri estimate run high?",
        "A deduction for federal income tax paid is allowed on many Missouri returns and is omitted here.",
      ],
      [
        "Are Kansas City or St. Louis earnings taxes included?",
        "Not automatically. Enter the percent from your stub as a custom local rate.",
      ],
      [
        "Are Missouri brackets wider for joint filers?",
        "Not in the 2026 table used here. Thresholds follow the published non-doubled schedule.",
      ],
    ],
  },
  MT: {
    description:
      "Estimate a 2026 Montana paycheck at 4.7% then 5.65% above $47,500 single, after the federal standard deduction.",
    paragraphs: [
      "Montana taxes wages at 4.7%, then 5.65% above $47,500 single or $95,000 joint, after the federal-sized standard deduction. The top rate came down from 5.9% for 2026, and a further cut to 5.4% scheduled for 2027 is not applied early. Billings and Missoula do not add a city income tax here.",
      "Two brackets with a wide bottom slice mean many middle salaries never see 5.65%. A traditional 401(k) reduces the Montana base; Social Security and Medicare do not. Federal tax still dominates the stub for most households.",
      "Property tax debates are loud in Montana and still are not paycheck lines. This calculator estimates wage withholding only. Compare Montana with Idaho or Wyoming at the same salary when a relocation pitch skips the state income-tax difference entirely.",
    ],
    faqs: [
      [
        "What are Montana’s 2026 rates?",
        "4.7%, then 5.65% above $47,500 single or $95,000 joint, after the federal standard deduction.",
      ],
      [
        "Is the 2027 rate cut already applied?",
        "No. A scheduled move to 5.4% is not used early; this file keeps 5.65% for 2026.",
      ],
      [
        "Do Montana cities tax wages in this model?",
        "Not as a city income tax. The state schedule is the only Montana income tax applied.",
      ],
    ],
  },
  NE: {
    description:
      "Estimate a 2026 Nebraska paycheck with graduated rates topping at 4.55% after an $8,850 single standard deduction.",
    paragraphs: [
      "Nebraska cut its top rate to 4.55% for 2026 after an $8,850 single / $17,700 joint standard deduction and a small exemption credit. A scheduled march toward 3.99% is not applied early. Omaha and Lincoln do not add a city wage tax in this file.",
      "The graduated schedule still matters at lower incomes even though the top rate is moderate. A traditional 401(k) reduces the Nebraska base; FICA does not. When comparing Nebraska with Iowa’s new flat 3.8%, run both at the same salary — the federal lines match, and the state gap is smaller than older rate tables suggested.",
      "Agricultural and pass-through quirks are outside this W-2-style estimate. Treat the result as an educational paycheck range, not a filed Nebraska return.",
    ],
    faqs: [
      [
        "What is Nebraska’s top rate in this file?",
        "4.55% on the highest slice after the standard deduction and exemption credit for 2026.",
      ],
      [
        "Is the future 3.99% rate used already?",
        "No. Scheduled lower rates are not applied early; this estimate stays on the 2026 published top of 4.55%.",
      ],
      [
        "Does Omaha add a local wage tax here?",
        "Not in this model. Leave local off unless you have a real local percent to enter.",
      ],
    ],
  },
  NV: {
    description:
      "Estimate a 2026 Nevada paycheck. No state wage tax. Federal brackets and FICA still apply; Commerce Tax is not on your stub.",
    paragraphs: [
      "Nevada does not tax wages. The Commerce Tax and other business levies are not employee withholding, so they never appear on this stub. A salary still owes federal income tax after the 2026 standard deduction, plus Social Security and Medicare. Las Vegas and Reno do not add a city income tax in the model.",
      "Hospitality and tip-heavy work is common here. Tips you enter are part of gross pay and run through federal tax and FICA the same way wages do. Overtime is extra gross at the marginal federal rate. There is no Nevada disability payroll line in the employee programs we model.",
      "Use Nevada when comparing a desert offer with California at the same salary. The federal math is shared; California adds brackets and SDI. The gap is not “Nevada has no taxes” — it is “Nevada has no state wage tax.”",
    ],
    faqs: [
      [
        "Is there any Nevada income-tax line on a W-2 wage stub?",
        "No. Nevada does not tax wages. Federal income tax and FICA still apply.",
      ],
      [
        "Is the Nevada Commerce Tax on my paycheck?",
        "No. It is a business tax, not employee wage withholding in this estimate.",
      ],
      [
        "Are tips taxed on a Nevada estimate?",
        "Tips you enter increase gross and are taxed for federal and FICA purposes. They do not create a Nevada income-tax line.",
      ],
    ],
  },
  NH: {
    description:
      "Estimate a 2026 New Hampshire paycheck. No wage income tax; the old interest and dividends tax is gone and was never a wage tax.",
    paragraphs: [
      "New Hampshire does not tax wages, and the interest and dividends tax is repealed effective 2025 — it was never a wage tax anyway. This estimate does not invent a state income-tax line. Federal brackets and FICA still come out of every deposit. Manchester and Nashua do not add a city wage tax here.",
      "Cross-border work into Massachusetts or Vermont is common. Marking a work state can surface a reciprocity-style note; the page still estimates New Hampshire as the selected jurisdiction and does not compute the other state’s return or a credit.",
      "Property tax is the household cost people feel in New Hampshire, and it is not on a paycheck. Use this page to compare a New Hampshire salary with a Massachusetts offer at the same gross — the federal lines match; Massachusetts adds its flat 5% (and missing PFML in our file).",
    ],
    faqs: [
      [
        "Does New Hampshire tax wages in 2026?",
        "No. There is no wage income tax, and the old interest and dividends tax is repealed.",
      ],
      [
        "I work in Massachusetts and live in New Hampshire. What happens?",
        "This page estimates the jurisdiction you open. Reciprocity or credit rules are noted in simplified form, not filed as a second return.",
      ],
      [
        "Why is my New Hampshire deposit still below gross?",
        "Federal income tax and 7.65% FICA (until the Social Security wage base) still withhold.",
      ],
    ],
  },
  NJ: {
    description:
      "Estimate a 2026 New Jersey paycheck with graduated rates to 10.75%; 401(k) stays in NJ wages; TDI/FLI not modeled.",
    paragraphs: [
      "New Jersey uses graduated rates from 1.4% to 10.75% after a small personal exemption ($1,000 single / $2,000 joint). Joint brackets are a different schedule, not a simple doubling of single thresholds. There is no large standard deduction sitting under those rates. Newark or Jersey City employer payroll taxes are not employee withholding in this model.",
      "Traditional 401(k) deferrals stay in the New Jersey wage base — the same stubborn pattern as Pennsylvania. Federal income tax still falls when you defer; the NJ line does not. Temporary Disability Insurance and Family Leave Insurance are real New Jersey withholdings for many employees and are not in the payroll file yet, so this stub is light by those premiums on purpose.",
      "Someone commuting into New York City should leave NYC off this page and use the city control only when New York City residency applies. This estimate taxes New Jersey; it does not compute a New York nonresident return or allocate wage days.",
    ],
    faqs: [
      [
        "Does a 401(k) reduce New Jersey tax?",
        "Not in this model. Employee deferrals remain in New Jersey gross income. They still reduce federal income tax.",
      ],
      [
        "Are New Jersey TDI and FLI included?",
        "No. Those withholdings are documented as not modeled so a missing line is not mistaken for a zero rate.",
      ],
      [
        "Are joint New Jersey brackets the same as single?",
        "No. Joint filers use a separate published schedule with different thresholds.",
      ],
    ],
  },
  NM: {
    description:
      "Estimate a 2026 New Mexico paycheck with graduated rates to 5.9% after a federal-sized standard deduction.",
    paragraphs: [
      "New Mexico’s brackets top out at 5.9% after a standard deduction tied to the 2026 federal amounts. Dependent deductions are modeled at $4,000 each when you enter a count; the official rule excludes one dependent in a way this simplification may overshoot by a single exemption. Albuquerque does not add a city wage tax here.",
      "A traditional 401(k) reduces the New Mexico base; FICA does not. The top rate is moderate by national standards, and the federal-sized deduction keeps many middle salaries from feeling the top slice. Working-family credits on a real PIT-1 are not computed.",
      "Oil-patch overtime and bonus season still annualize into the same federal and state brackets in the aggregate method. Use the bonus tool when a signing check lands in one paycheck and you want the annualized estimate rather than a flat supplemental guess.",
    ],
    faqs: [
      [
        "What is New Mexico’s top rate?",
        "5.9% on the highest slice of taxable income after the federal-sized standard deduction.",
      ],
      [
        "How are dependents handled?",
        "This estimate deducts $4,000 per dependent entered. Official “all but one” rules can differ by one exemption.",
      ],
      [
        "Does Albuquerque tax wages here?",
        "Not as a city income tax. The state brackets are the New Mexico income tax applied.",
      ],
    ],
  },
  ND: {
    description:
      "Estimate a 2026 North Dakota paycheck: large zero bracket to $48,475 single, then 1.95% and 2.5%.",
    paragraphs: [
      "North Dakota does not tax the first $48,475 of single taxable income ($80,975 joint) after the federal standard deduction. Above that, rates are 1.95% and then 2.5%. Many middle salaries show little or no North Dakota tax for that reason — not because the state forgot to withhold, but because the zero bracket is huge.",
      "Fargo and Bismarck do not add a city wage tax in this model. A traditional 401(k) reduces the state base; FICA does not. When a recruiter says North Dakota is “almost no tax,” check whether the salary clears the zero bracket after the federal-sized deduction before you believe a $0 state line forever.",
      "Oil and gas bonus years can push taxable income into the thin upper rates quickly. The bonus calculator annualizes that spike rather than treating one check as if it were your only income.",
    ],
    faqs: [
      [
        "Why is my North Dakota state tax near zero?",
        "The first $48,475 single / $80,975 joint of taxable income sits in a 0% bracket after the federal standard deduction.",
      ],
      [
        "What rates apply above the zero bracket?",
        "1.95%, then 2.5% on higher slices in the 2026 table.",
      ],
      [
        "Do North Dakota cities tax wages here?",
        "Not in this file. The statewide schedule is the only North Dakota income tax applied.",
      ],
    ],
  },
  OK: {
    description:
      "Estimate a 2026 Oklahoma paycheck with three brackets to 4.5% after a standard deduction and $1,000 exemption.",
    paragraphs: [
      "Oklahoma collapsed its schedule under House Bill 2764: three brackets with a 4.5% top rate reached at a low threshold, after a standard deduction and a $1,000 personal exemption ($2,000 joint). Brackets are not inflation-indexed in the source table. Oklahoma City and Tulsa do not add a city wage tax here.",
      "Because the top rate arrives early, many full-time salaries sit in the 4.5% slice after relief — the estimate still subtracts the deduction and exemption first. A traditional 401(k) reduces the Oklahoma base; Social Security and Medicare do not.",
      "Compare Oklahoma with Texas at the same salary when a move pitch treats them as interchangeable. Texas has a $0 state line; Oklahoma has this schedule. Federal tax is shared either way.",
    ],
    faqs: [
      [
        "What is Oklahoma’s top rate for 2026?",
        "4.5% after the standard deduction and personal exemption, on a three-bracket schedule.",
      ],
      [
        "Did Oklahoma just simplify its brackets?",
        "Yes. House Bill 2764 collapsed the old schedule and cut the top rate to 4.5% for 2026.",
      ],
      [
        "Is there an Oklahoma City wage tax in this model?",
        "No. The state schedule is the only Oklahoma income tax applied.",
      ],
    ],
  },
  RI: {
    description:
      "Estimate a 2026 Rhode Island paycheck with rates to 5.99%; deduction phaseout and TDI not modeled.",
    paragraphs: [
      "Rhode Island’s rates are 3.75%, 4.75%, and 5.99% after an $11,200 single standard deduction and a $5,250 personal exemption. Brackets are not doubled for joint filers. The deduction and exemptions phase out between roughly $261,000 and $290,800 of modified AGI — that phaseout is not computed, so high earners can see a line that is too low.",
      "Rhode Island Temporary Disability Insurance is a real withholding for many employees and is not in the payroll file yet. Providence does not add a separate city income tax here. A traditional 401(k) reduces the income-tax base; FICA does not.",
      "Cross-border work into Massachusetts or Connecticut is common. This page taxes Rhode Island when you open it; it does not allocate days or file the other state.",
    ],
    faqs: [
      [
        "What Rhode Island rates are modeled?",
        "3.75%, 4.75%, and 5.99% after the standard deduction and personal exemption.",
      ],
      [
        "Is Rhode Island TDI included?",
        "Not yet. Temporary Disability Insurance is listed as not modeled so it is not mistaken for zero.",
      ],
      [
        "Why might high earners owe more than this shows?",
        "Standard-deduction and exemption phaseouts near the mid–$200,000s are not computed.",
      ],
    ],
  },
  SC: {
    description:
      "Estimate a 2026 South Carolina paycheck with rates to 6%; temporary top rate and deduction conformity are estimated.",
    paragraphs: [
      "South Carolina is modeled at 0%, then 3%, then 6%, after a smaller pre-OBBBA standard deduction ($8,350 single / $16,700 joint) and a $4,930 dependent deduction when entered. The 6% top rate was a temporary cut through a FY2026 budget window and was scheduled to drift back toward 6.2% — treat the top rate as an estimate for the whole calendar year.",
      "If South Carolina conforms to the higher federal standard deduction, this state line runs high. Charleston and Columbia do not add a city wage tax here. A traditional 401(k) reduces the South Carolina base; FICA does not.",
      "Coastal relocation pitches that compare South Carolina only with North Carolina should run both calculators: North Carolina’s flat 3.99% after a larger deduction is a different shape than this graduated temporary-top schedule.",
    ],
    faqs: [
      [
        "What South Carolina rates does this page use?",
        "0%, then 3%, then 6% after the modeled deduction — with the 6% top treated as a temporary FY2026 figure.",
      ],
      [
        "Why is South Carolina marked estimated?",
        "The temporary top-rate window and federal-conformity deduction amount can both differ from a full-year return.",
      ],
      [
        "Should I add a Charleston local percent by default?",
        "No. South Carolina cities are not modeled as wage-tax jurisdictions here. Leave local off unless your stub shows a real local percent.",
      ],
    ],
  },
  SD: {
    description:
      "Estimate a 2026 South Dakota paycheck. No state wage tax. Federal brackets and FICA still apply.",
    paragraphs: [
      "South Dakota does not tax wages. There is no state income-tax line to withhold, and this file does not invent one. Federal income tax after the 2026 standard deduction, plus Social Security and Medicare, still reduce the deposit. Sioux Falls and Rapid City do not add a city wage tax in the model.",
      "Tourism and healthcare schedules often mean irregular hours. Use the hourly path on the main calculator with South Dakota selected when the year is not a neat salary. Tips and overtime you enter become gross and face federal tax and FICA only on the state side of the story.",
      "Compare South Dakota with Minnesota or Iowa at the same salary when a border offer appears. The federal math is shared; the gap is the other state’s income tax — not a South Dakota surprise hiding on the stub.",
    ],
    faqs: [
      [
        "Does South Dakota tax paychecks?",
        "Not with a state income tax. Federal tax and FICA still withhold.",
      ],
      [
        "Are tips taxed in South Dakota here?",
        "Tips increase gross and are taxed for federal and FICA purposes. They do not create a state income-tax line.",
      ],
      [
        "Is there a Sioux Falls city wage tax in this file?",
        "No. The statewide estimate does not invent a municipal rate.",
      ],
    ],
  },
  TN: {
    description:
      "Estimate a 2026 Tennessee paycheck. No wage tax; the Hall tax on interest and dividends is gone and was never a wage tax.",
    paragraphs: [
      "Tennessee does not tax wages. The Hall tax on interest and dividends is gone, and it was never a wage tax. Federal brackets and FICA still apply to every paycheck. Nashville and Memphis do not add a city income tax on wages in this model.",
      "Entertainment and healthcare employers often pay bonuses. The bonus tool annualizes a spike against the same federal brackets; Tennessee still contributes $0 on the state line. A traditional 401(k) reduces federal tax only on the income-tax side — FICA stays put, and there is no state wage base to shrink.",
      "Use Tennessee as a no-state-tax peer when comparing with Georgia’s flat 5.19% or Alabama’s brackets at the same salary. The federal lines match; the gap is the other state’s income tax.",
    ],
    faqs: [
      [
        "Does Tennessee withhold state income tax on wages?",
        "No. The Hall tax is repealed and never applied to wages. Federal tax and FICA remain.",
      ],
      [
        "Is the old Hall tax in this calculator?",
        "No. It is gone and would not belong on a wage stub anyway.",
      ],
      [
        "Do Nashville or Memphis tax wages here?",
        "Not as a city income tax. The state line stays at zero.",
      ],
    ],
  },
  UT: {
    description:
      "Estimate a 2026 Utah paycheck at 4.5% with a phaseout credit equal to 6% of the federal standard deduction.",
    paragraphs: [
      "Utah taxes income at 4.5% after House Bill 106, but the standard deduction is not a subtraction — it becomes a credit equal to 6% of the federal standard deduction ($966 single / $1,932 joint at 2026 federal amounts). That credit phases out as AGI rises, using 2025 phaseout thresholds from the source table ($18,213 single / $36,426 joint). The effective bite is not “4.5% of gross.”",
      "Because the credit fades, higher earners keep more of the flat rate and less of the credit. Confidence is estimated while those thresholds await a fuller 2026 update. Salt Lake City does not add a city income tax here.",
      "A traditional 401(k) reduces Utah taxable income in this model; FICA does not. Compare Utah with Colorado (flat 4.4% plus FAMLI) at the same salary when a mountain-west offer lands — the shapes look similar until you stack Colorado’s leave premium against Utah’s credit phaseout.",
    ],
    faqs: [
      [
        "Is Utah a simple flat 4.5% of salary?",
        "No. A credit equal to 6% of the federal standard deduction offsets part of the tax and phases out with AGI.",
      ],
      [
        "Why is Utah marked estimated?",
        "Credit phaseout thresholds in the source table were still the 2025 figures published with the 2026 rate.",
      ],
      [
        "Does Salt Lake City tax wages here?",
        "Not as a city income tax. The state flat rate and credit are the Utah income-tax model.",
      ],
    ],
  },
  VT: {
    description:
      "Estimate a 2026 Vermont paycheck with rates to 8.75%; the 3% federal-AGI minimum tax is not modeled.",
    paragraphs: [
      "Vermont’s brackets run from 3.35% to 8.75% after a $7,650 single / $15,300 joint standard deduction and a $5,300 / $10,600 personal exemption. Burlington does not add a city wage tax here. The schedule is progressive in the ordinary way — a middle salary is not taxed at 8.75% on every dollar.",
      "Some higher-income Vermonters owe the greater of regular tax or 3% of federal AGI. That minimum tax is not computed, so a high earner’s line can run low. A traditional 401(k) reduces the regular Vermont base; FICA does not.",
      "Cross-border work into New Hampshire or New York is common. Opening this page estimates Vermont; it does not allocate wage days to the other state or invent a credit.",
    ],
    faqs: [
      [
        "Where does Vermont’s 8.75% rate show up on a paycheck estimate?",
        "Only on the highest slice of taxable income after the $7,650 single standard deduction and personal exemption — not on every dollar.",
      ],
      [
        "Is Vermont’s 3% AGI minimum tax included?",
        "No. Higher-income filers who owe the greater of regular tax or 3% of federal AGI may owe more than this line.",
      ],
      [
        "Does Burlington add a local wage tax?",
        "Not in this model. The state brackets are the Vermont income tax applied.",
      ],
    ],
  },
  VA: {
    description:
      "Estimate a 2026 Virginia paycheck with rates to 5.75% reached at $17,000 of taxable income after deduction and exemption.",
    paragraphs: [
      "Virginia reaches its 5.75% top rate at only $17,000 of taxable income after an $8,750 single / $17,500 joint standard deduction and a $930 personal exemption. Brackets are not doubled for joint filers. That early top rate makes Virginia feel flatter than the four-bracket chart suggests. Northern Virginia localities do not add a general wage income tax in this model.",
      "A traditional 401(k) reduces the Virginia base; FICA does not. Reciprocity with D.C., Maryland, and other neighbors can change which jurisdiction withholds first when you mark a work state — this page still taxes Virginia and does not file the other return.",
      "Military and federal-civilian pay is common in the corridor. The estimate uses the same wage rules; special combat or state exemptions outside the published table are not invented.",
    ],
    faqs: [
      [
        "How quickly does Virginia hit 5.75%?",
        "At $17,000 of taxable income on the published schedule after the standard deduction and exemption — most full-time salaries sit in that top slice.",
      ],
      [
        "Are Virginia brackets doubled for joint filers?",
        "No. The 2026 table used here does not double thresholds for joint returns.",
      ],
      [
        "Does Northern Virginia add a county wage tax?",
        "Not as a general local wage tax in this file. Leave local off unless you have a real local percent.",
      ],
    ],
  },
  WV: {
    description:
      "Estimate a 2026 West Virginia paycheck with brackets from 2.22% to 4.82% after a personal exemption and no standard deduction.",
    paragraphs: [
      "West Virginia’s rates run from 2.22% to 4.82% after a $2,000 personal exemption ($4,000 joint) and no standard deduction in the table. Brackets are not doubled for joint filers. A few localities can tax; none are named in the launch local file, so use a custom percent when your stub shows one.",
      "The top rate is moderate, and the missing standard deduction means relief is mostly the exemption. A traditional 401(k) reduces the West Virginia base; Social Security and Medicare do not. Charleston does not get an automatic city line.",
      "Compare West Virginia with Pennsylvania or Ohio at the same salary when a border plant offer appears. Pennsylvania’s flat 3.07% with no deduction and Ohio’s 2.75% above $26,050 are different shapes once you include any local percent.",
    ],
    faqs: [
      [
        "How is West Virginia’s schedule shaped without a standard deduction?",
        "Graduated rates from 2.22% to 4.82% after a personal exemption only — the 2026 table has no standard deduction.",
      ],
      [
        "Is there a West Virginia standard deduction?",
        "Not in the 2026 table used here. Relief comes from the personal exemption.",
      ],
      [
        "Are local West Virginia taxes included?",
        "Not automatically. Enter a custom percent if your locality withholds one.",
      ],
    ],
  },
  WI: {
    description:
      "Estimate a 2026 Wisconsin paycheck with rates to 7.65%; sliding standard-deduction phaseout is not computed.",
    paragraphs: [
      "Wisconsin’s brackets run from 3.5% to 7.65% after a sliding standard deduction listed at $13,960 single / $25,840 joint and a small personal exemption ($700 / $1,400). The deduction is supposed to phase out starting near $20,000 single / $29,000 joint; that phaseout is not computed, so middle incomes can see a state line that is slightly low.",
      "Madison and Milwaukee do not add a city income tax on wages in this model. A traditional 401(k) reduces the Wisconsin base; FICA does not. Reciprocity with Illinois, Michigan, Kentucky, and Iowa can matter for cross-border workers — marking a work state surfaces a note, not a second return.",
      "Read the estimated confidence label as a warning about the missing phaseout, not as uncertainty about the published bracket rates themselves.",
    ],
    faqs: [
      [
        "What is Wisconsin’s top rate?",
        "7.65% on the highest slice after the modeled standard deduction and personal exemption.",
      ],
      [
        "Why might middle-income Wisconsin tax be low here?",
        "The sliding standard-deduction phaseout that begins near $20,000 / $29,000 of income is not computed; the full deduction is used.",
      ],
      [
        "Does Milwaukee tax wages on this page?",
        "Not as a city income tax. The state brackets are the Wisconsin income tax applied.",
      ],
    ],
  },
  WY: {
    description:
      "Estimate a 2026 Wyoming paycheck. No state wage tax. Federal brackets and FICA still apply.",
    paragraphs: [
      "Wyoming does not tax wages. There is no state income-tax withholding in this file, and none is invented. Federal income tax after the 2026 standard deduction, plus Social Security and Medicare, still reduce every deposit. Cheyenne and Casper do not add a city wage tax in the model.",
      "Energy-sector overtime and rotation schedules often mean lumpy gross. Annualize with the hourly or salary tools rather than reading one heavy month as your tax rate forever. Wyoming still contributes $0 on the state income-tax line either way.",
      "Compare Wyoming with Colorado or Utah at the same salary when a mountain offer appears. Those neighbors add flat state tax (and Colorado FAMLI); Wyoming’s gap is the missing state line, not missing federal tax.",
    ],
    faqs: [
      [
        "Does Wyoming tax wages?",
        "No. The state income-tax line is zero. Federal tax and FICA still apply.",
      ],
      [
        "Are mineral or severance taxes on my paycheck?",
        "Not as employee wage withholding in this estimate. Those are not modeled as paycheck lines.",
      ],
      [
        "Do Wyoming cities tax wages here?",
        "Not in this file. The statewide estimate does not invent a municipal rate.",
      ],
    ],
  },
};

function metaDescription(state) {
  const custom = UNIQUE[state.id]?.description;
  if (custom) return custom;
  if (!state.wageTax) {
    return `Estimate a 2026 ${state.name} paycheck. No state wage tax. Federal brackets and FICA still apply.`;
  }
  return `Estimate a 2026 ${state.name} paycheck with federal tax, FICA, and ${
    shapeLabel(state) === "flat"
      ? `a flat ${pct(flatRate(state) || topRate(state)) || "state"} income tax`
      : `${bracketSummary(state) || "state income tax"}`
  }.`;
}

export function generateStateLocations({ states, payroll, existingSlugs, coveredStateIds = [] }) {
  const taken = new Set(existingSlugs);
  const covered = new Set(coveredStateIds);
  const out = [];
  for (const state of states) {
    const slug = slugFor(state);
    if (covered.has(state.id) || taken.has(slug)) continue;
    const programs = payrollFor(state, payroll);
    const custom = UNIQUE[state.id];
    if (!custom) {
      throw new Error(
        `Missing UNIQUE location copy for generated state ${state.id}. Add paragraphs and faqs in generate-locations.mjs.`
      );
    }
    const paragraphs = [...custom.paragraphs];
    const faqs = custom.faqs.map(([q, a]) => [q, a]);
    out.push({
      slug,
      state: state.id,
      copyQuality: "generated",
      title: `${state.name} Paycheck Calculator (2026) | LocalTakehome`,
      description: metaDescription(state),
      h1: `${state.name} paycheck calculator`,
      paragraphs,
      faqs,
      // programs kept available for future stub notes; copy already names them when relevant
      _programs: programs.map((p) => p.name),
    });
    taken.add(slug);
  }
  return out;
}

export function statePageSlug(state) {
  return slugFor(state);
}
