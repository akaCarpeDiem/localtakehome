/**
 * Authoring source for data/states-2026.json.
 * The JSON file is what the site and the engine load. Re-run:
 *   node scripts/compile-states.mjs
 *
 * Figures follow Tax Foundation, "State Individual Income Tax Rates and
 * Brackets, 2026" (as of January 1, 2026; published February 2026),
 * which compiles state statutes, forms, and instructions.
 * https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
 *
 * Head of household uses the single standard deduction and single brackets
 * unless a separate figure is set below. Married filing separately uses the
 * single brackets and, unless noted, the single deduction.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const b = (over, rate) => ({ over, rate });
const std = (single, mfj, hoh = single, mfs = single) => ({ single, mfs, mfj, hoh });
const ded = (single, mfj, dependent = 0, hoh = single, mfs = single) => ({
  kind: "deduction",
  single,
  mfs,
  mfj,
  hoh,
  dependent,
});
const cred = (single, mfj, dependent = 0, hoh = single, mfs = single) => ({
  kind: "credit",
  single,
  mfs,
  mfj,
  hoh,
  dependent,
});

function base(row) {
  return {
    wageTax: true,
    localPossible: false,
    retirementDeferralDeductible: true,
    confidence: "published",
    special: null,
    standardDeduction: null,
    personalExemption: null,
    ...row,
  };
}

const none = (id, name, why, extra = {}) =>
  base({
    id,
    name,
    type: "none",
    wageTax: false,
    why,
    notes: extra.notes || why,
    ...extra,
  });

const states = [
  base({
    id: "AL",
    name: "Alabama",
    type: "graduated",
    localPossible: true,
    confidence: "estimated",
    brackets: {
      single: [b(0, 0.02), b(500, 0.04), b(3000, 0.05)],
      mfj: [b(0, 0.02), b(1000, 0.04), b(6000, 0.05)],
    },
    standardDeduction: std(3000, 8500),
    personalExemption: ded(1500, 3000, 1000),
    why: "Alabama's top rate is 5% after a small standard deduction and personal exemption. Federal income tax is partly deductible on the Alabama return; this estimate does not take that deduction, so the state line runs high.",
    stubNote:
      "Alabama allows a deduction for federal income tax. Leaving it out overstates Alabama withholding in this estimate.",
    notes:
      "Brackets, $3,000/$8,500 standard deduction, and personal exemptions follow the Tax Foundation 2026 table. The standard deduction phases down as AGI rises, and federal income tax is deductible. Neither adjustment is computed.",
  }),
  none("AK", "Alaska", "Alaska does not tax wages. There is no state income-tax line on this stub."),
  base({
    id: "AZ",
    name: "Arizona",
    type: "flat",
    flat: true,
    rate: 0.025,
    confidence: "estimated",
    brackets: { single: [b(0, 0.025)] },
    standardDeduction: std(8350, 16700),
    personalExemption: cred(0, 0, 100),
    why: "Arizona taxes wages at a flat 2.5%. The deduction used here is $8,350 single / $16,700 joint, the pre-OBBBA federal standard deduction some conformity states still point at.",
    stubNote:
      "If Arizona updates conformity to the higher federal standard deduction, this state line is too high.",
    notes:
      "Tax Foundation marks Arizona as conforming to a pre-OBBBA federal standard deduction ($8,350 / $16,700 for 2026). A post-OBBBA conformity bill would raise that deduction. Dependent relief is a small credit, modeled at $100 per dependent.",
  }),
  base({
    id: "AR",
    name: "Arkansas",
    type: "graduated",
    confidence: "estimated",
    brackets: { single: [b(0, 0.02), b(4600, 0.039)] },
    standardDeduction: std(2470, 4940),
    personalExemption: cred(29, 58, 29),
    why: "Arkansas is modeled at 2% then 3.9% after a small standard deduction. Lower-income filers use a separate official table that this estimate does not switch to.",
    stubNote: "Arkansas publishes a different rate table under about $92,000 of income. This estimate uses the regular 2% / 3.9% schedule.",
    notes:
      "Top rate 3.9% over $4,600 for both single and joint filers in the Tax Foundation 2026 table. The low-income table and bracket-adjustment credit are not modeled.",
  }),
  base({
    id: "CA",
    name: "California",
    type: "graduated",
    brackets: {
      single: [
        b(0, 0.01),
        b(11079, 0.02),
        b(26264, 0.04),
        b(41452, 0.06),
        b(57542, 0.08),
        b(72724, 0.093),
        b(371479, 0.103),
        b(445771, 0.113),
        b(742953, 0.123),
        b(1000000, 0.133),
      ],
      mfj: [
        b(0, 0.01),
        b(22158, 0.02),
        b(52528, 0.04),
        b(82904, 0.06),
        b(115084, 0.08),
        b(145448, 0.093),
        b(742958, 0.103),
        b(891542, 0.113),
        b(1000000, 0.123),
        b(1485906, 0.133),
      ],
    },
    standardDeduction: std(5540, 11080, 11080),
    personalExemption: cred(153, 306, 153),
    creditPhaseoutNoteAbove: { single: 252203, mfs: 252203, hoh: 252203, mfj: 504411 },
    why: "California graduated rates after the state standard deduction, minus the personal exemption credit. The 13.3% top rate includes the 1% mental health tax. SDI is a separate payroll line.",
    notes:
      "Bracket widths are the Tax Foundation 2026 table. That source still reflects 2025 inflation-adjusted widths because 2026 FTB widths were not available when the table was compiled. Head of household uses the joint standard deduction, which is the usual FTB pattern. Exemption-credit phaseout above roughly $252,000 single / $504,000 joint is not computed. Disability insurance is in state-payroll-2026.json, not in this rate.",
  }),
  base({
    id: "CO",
    name: "Colorado",
    type: "flat",
    flat: true,
    rate: 0.044,
    brackets: { single: [b(0, 0.044)] },
    standardDeduction: std(16100, 32200),
    why: "Colorado taxes wages at a flat 4.4% after a standard deduction tied to the federal amounts, $16,100 single and $32,200 joint.",
    notes: "Federal standard deduction conformity. No state personal exemption in the 2026 table.",
  }),
  base({
    id: "CT",
    name: "Connecticut",
    type: "graduated",
    special: "connecticut",
    confidence: "estimated",
    brackets: {
      single: [b(0, 0.02), b(10000, 0.045), b(50000, 0.055), b(100000, 0.06), b(200000, 0.065), b(250000, 0.069), b(500000, 0.0699)],
      mfj: [b(0, 0.02), b(20000, 0.045), b(100000, 0.055), b(200000, 0.06), b(400000, 0.065), b(500000, 0.069), b(1000000, 0.0699)],
    },
    personalExemption: ded(15000, 24000, 0),
    why: "Connecticut graduated rates after a personal exemption that phases out as income rises. The extra recapture and benefit phaseouts above middle incomes are not fully modeled, so higher earners should treat this line as low.",
    stubNote:
      "Connecticut's 2% bracket recapture and the tax-benefit phaseout are not computed. Above roughly $56,500 single / $100,500 joint, the official tax is often higher than this line.",
    notes:
      "Exemption phaseout is modeled: $15,000 single (phaseout from $30,000) and $24,000 joint (phaseout from $48,000), reduced by $1,000 per $1,000 of AGI over the threshold. Personal-tax-credit percentages and benefit recapture described in the Tax Foundation footnotes are not modeled.",
  }),
  base({
    id: "DE",
    name: "Delaware",
    type: "graduated",
    localPossible: true,
    brackets: {
      single: [b(2000, 0.022), b(5000, 0.039), b(10000, 0.048), b(20000, 0.052), b(25000, 0.0555), b(60000, 0.066)],
    },
    standardDeduction: std(3250, 6500),
    personalExemption: cred(110, 220, 110),
    why: "Delaware graduated rates, topping out at 6.6% over $60,000, after a modest standard deduction and a small exemption credit.",
    notes: "The first $2,000 of taxable income is not taxed. Brackets are not doubled for joint filers in the 2026 table. Wilmington city wage tax (1.25%) is in the local file.",
  }),
  none("FL", "Florida", "Florida does not tax wages. The state line on this stub is $0. FICA still applies."),
  base({
    id: "GA",
    name: "Georgia",
    type: "flat",
    flat: true,
    rate: 0.0519,
    brackets: { single: [b(0, 0.0519)] },
    standardDeduction: std(12000, 24000),
    personalExemption: ded(0, 0, 4000),
    why: "Georgia taxes wages at a flat 5.19% after a $12,000 single or $24,000 joint standard deduction.",
    notes:
      "Rate reduced to 5.19% under the accelerated schedule in effect for 2026. Dependent exemption is $4,000. There is no personal exemption for the taxpayer in the table.",
  }),
  base({
    id: "HI",
    name: "Hawaii",
    type: "graduated",
    brackets: {
      single: [
        b(0, 0.014),
        b(9600, 0.032),
        b(14400, 0.055),
        b(19200, 0.064),
        b(24000, 0.068),
        b(36000, 0.072),
        b(48000, 0.076),
        b(125000, 0.079),
        b(175000, 0.0825),
        b(225000, 0.09),
        b(275000, 0.1),
        b(325000, 0.11),
      ],
      mfj: [
        b(0, 0.014),
        b(19200, 0.032),
        b(28800, 0.055),
        b(38400, 0.064),
        b(48000, 0.068),
        b(72000, 0.072),
        b(96000, 0.076),
        b(250000, 0.079),
        b(350000, 0.0825),
        b(450000, 0.09),
        b(550000, 0.1),
        b(650000, 0.11),
      ],
    },
    standardDeduction: std(4400, 8800),
    personalExemption: ded(1144, 2288, 1144),
    why: "Hawaii has twelve brackets, from 1.4% to 11%, after its own standard deduction and personal exemption.",
    notes: "Joint brackets are double the single thresholds. 2026 inflation adjustments for the deduction follow the Tax Foundation table ($4,400 / $8,800).",
  }),
  base({
    id: "ID",
    name: "Idaho",
    type: "flat",
    rate: 0.053,
    confidence: "estimated",
    brackets: {
      single: [b(4811, 0.053)],
      mfj: [b(9622, 0.053)],
    },
    standardDeduction: std(16100, 32200),
    why: "Idaho is modeled at 5.3% after the federal standard deduction, with the table's zero-rate threshold ($4,811 single / $9,622 joint) also applied. If that threshold is already inside the starting point, this line is slightly low.",
    notes:
      "Rate is 5.3% after House Bill 40. Tax Foundation footnote (j) says 2026 inflation-adjusted bracket widths were not available, so the threshold is the 2025 indexed figure. Standard deduction matches the 2026 federal amounts.",
  }),
  base({
    id: "IL",
    name: "Illinois",
    type: "flat",
    flat: true,
    rate: 0.0495,
    brackets: { single: [b(0, 0.0495)] },
    personalExemption: ded(2925, 5850, 2925),
    exemptionCliff: { single: 250000, mfs: 250000, hoh: 250000, mfj: 500000 },
    why: "Illinois taxes wages at a flat 4.95% after a personal exemption of $2,925 (single) or $5,850 (joint). The exemption drops to $0 above $250,000 single or $500,000 joint.",
    notes: "No standard deduction. Exemption cliff follows the Tax Foundation note on the Illinois personal exemption.",
  }),
  base({
    id: "IN",
    name: "Indiana",
    type: "flat",
    flat: true,
    rate: 0.0295,
    localPossible: true,
    brackets: { single: [b(0, 0.0295)] },
    personalExemption: ded(1000, 2000, 1000),
    why: "Indiana's state rate is a flat 2.95% after a $1,000 personal exemption. Counties add their own local income tax on top — Marion County and other large counties are in the local list.",
    notes:
      "Rate fell from 3% to 2.95% on January 1, 2026. A further cut to 2.9% is scheduled for 2027 and is not used here. The extra dependent exemption some families can claim is not modeled; the base $1,000 per dependent is.",
  }),
  base({
    id: "IA",
    name: "Iowa",
    type: "flat",
    flat: true,
    rate: 0.038,
    localPossible: true,
    brackets: { single: [b(0, 0.038)] },
    standardDeduction: std(16100, 32200),
    personalExemption: cred(40, 80, 40),
    why: "Iowa taxes wages at a flat 3.8% after a standard deduction tied to the federal amounts.",
    notes: "Flat tax conversion is in effect. A small exemption credit ($40 / $80) is subtracted.",
  }),
  base({
    id: "KS",
    name: "Kansas",
    type: "graduated",
    localPossible: true,
    brackets: {
      single: [b(0, 0.052), b(23000, 0.0558)],
      mfj: [b(0, 0.052), b(46000, 0.0558)],
    },
    standardDeduction: std(3605, 8240),
    personalExemption: ded(9160, 18320, 2320),
    why: "Kansas taxes wages at 5.2% and 5.58% after a large personal exemption ($9,160 single / $18,320 joint) and a smaller standard deduction.",
    notes: "Personal exemption amounts are deductions, from the Tax Foundation 2026 table. Local wage taxes exist in a few Kansas jurisdictions and are not named in the local file; use a custom percent if you know the rate.",
  }),
  base({
    id: "KY",
    name: "Kentucky",
    type: "flat",
    flat: true,
    rate: 0.035,
    localPossible: true,
    brackets: { single: [b(0, 0.035)] },
    standardDeduction: { single: 3360, mfs: 6720, mfj: 3360, hoh: 3360 },
    why: "Kentucky taxes wages at a flat 3.5% after a $3,360 standard deduction. The deduction is not doubled for a joint return.",
    notes:
      "Rate decreased from 4% to 3.5% on January 1, 2026. Louisville / Jefferson and Lexington / Fayette occupational taxes are in the local file; other KY localities use the custom percent. Married filing separately is modeled with a $6,720 deduction, following the Tax Foundation note that the deduction doubles for separate filers rather than joint filers.",
  }),
  base({
    id: "LA",
    name: "Louisiana",
    type: "flat",
    flat: true,
    rate: 0.03,
    brackets: { single: [b(0, 0.03)] },
    standardDeduction: std(12875, 25750),
    why: "Louisiana taxes wages at a flat 3% after a $12,875 single or $25,750 joint standard deduction.",
    notes: "No personal exemption in the 2026 table.",
  }),
  base({
    id: "ME",
    name: "Maine",
    type: "graduated",
    confidence: "estimated",
    brackets: {
      single: [b(0, 0.058), b(27399, 0.0675), b(64849, 0.0715)],
      mfj: [b(0, 0.058), b(54849, 0.0675), b(129749, 0.0715)],
    },
    standardDeduction: std(8350, 16700),
    personalExemption: ded(5300, 10600, 0),
    why: "Maine's rates are 5.8%, 6.75%, and 7.15%. The deduction used here is the smaller pre-OBBBA federal amount some conformity states still reference, plus a personal exemption.",
    stubNote:
      "Maine's standard deduction in this estimate is $8,350 / $16,700 because of a conformity footnote. If the state has adopted the higher federal deduction, this line is too high. Dependent credits are not modeled.",
    notes:
      "Tax Foundation footnote (vv) places Maine on the pre-OBBBA standard deduction. Dependent relief is a credit ($305 / $610) and is not modeled. Exemption and deduction phaseouts are not modeled.",
  }),
  base({
    id: "MD",
    name: "Maryland",
    type: "graduated",
    localPossible: true,
    brackets: {
      single: [
        b(0, 0.02),
        b(1000, 0.03),
        b(2000, 0.04),
        b(3000, 0.0475),
        b(100000, 0.05),
        b(125000, 0.0525),
        b(150000, 0.055),
        b(250000, 0.0575),
        b(500000, 0.0625),
        b(1000000, 0.065),
      ],
      mfj: [
        b(0, 0.02),
        b(1000, 0.03),
        b(2000, 0.04),
        b(3000, 0.0475),
        b(150000, 0.05),
        b(175000, 0.0525),
        b(225000, 0.055),
        b(300000, 0.0575),
        b(600000, 0.0625),
        b(1200000, 0.065),
      ],
    },
    standardDeduction: std(3350, 6700),
    personalExemption: ded(3200, 6400, 3200),
    exemptionPhaseout: {
      single: [100000, 150000],
      mfs: [100000, 150000],
      hoh: [100000, 150000],
      mfj: [150000, 200000],
    },
    why: "Maryland state rates run from 2% to 6.5% after a small standard deduction and a $3,200 exemption. Every county adds a local rate on the same taxable income. Most counties plus Baltimore City are named in the local file (Anne Arundel tiered; Frederick County cliff schedule uses the custom percent).",
    notes:
      "Top brackets of 6.25% and 6.5% were added for high incomes beginning in 2025 and remain in the 2026 table. The personal exemption phases out between $100,000 and $150,000 (single) and $150,000 and $200,000 (joint); that phaseout is modeled as a straight line. The 2% capital-gains surtax is not applied to wages.",
  }),
  base({
    id: "MA",
    name: "Massachusetts",
    type: "graduated",
    brackets: {
      single: [b(0, 0.05), b(1083150, 0.09)],
    },
    personalExemption: ded(4400, 8800, 1000),
    why: "Massachusetts taxes wages at 5% after a personal exemption, plus the 4% surtax (9% on the slice) above $1,083,150. Paid family leave is not in this income-tax line.",
    notes:
      "The 9% bracket is the 5% rate plus the 4% millionaire surtax. The surtax threshold is not doubled for joint filers. Massachusetts PFML withholding is not in the payroll file yet.",
  }),
  base({
    id: "MI",
    name: "Michigan",
    type: "flat",
    flat: true,
    rate: 0.0425,
    localPossible: true,
    brackets: { single: [b(0, 0.0425)] },
    personalExemption: ded(5900, 11800, 5900),
    why: "Michigan taxes wages at a flat 4.25% after a $5,900 personal exemption ($11,800 joint). Detroit, Grand Rapids, Lansing, Flint, Pontiac, Saginaw, and other major MI cities add a city income tax named in the local file.",
    notes: "No standard deduction. City income tax is separate. Detroit is 2.4%/1.2%; Grand Rapids and Saginaw are 1.5%/0.75%; most other named MI cities are 1%/0.5%.",
  }),
  base({
    id: "MN",
    name: "Minnesota",
    type: "graduated",
    confidence: "estimated",
    brackets: {
      single: [b(0, 0.0535), b(33310, 0.068), b(109430, 0.0785), b(203150, 0.0985)],
      mfj: [b(0, 0.0535), b(48700, 0.068), b(193480, 0.0785), b(337930, 0.0985)],
    },
    standardDeduction: std(15300, 30600),
    personalExemption: ded(0, 0, 5300),
    why: "Minnesota graduated rates from 5.35% to 9.85% after a standard deduction of $15,300 single / $30,600 joint.",
    stubNote:
      "Minnesota phases out the standard deduction at higher incomes and adds a 1% investment-income surtax above $1 million. Neither is computed, so a high earner's line can run low.",
    notes:
      "No personal exemption; dependent deduction is $5,300. Standard-deduction phaseout and the net investment income surtax are not modeled.",
  }),
  base({
    id: "MS",
    name: "Mississippi",
    type: "flat",
    rate: 0.04,
    confidence: "estimated",
    brackets: { single: [b(10000, 0.04)] },
    standardDeduction: std(2300, 4600),
    personalExemption: ded(6000, 12000, 1500),
    why: "Mississippi is modeled at 4% after a $10,000 zero-rate threshold, a standard deduction, and a personal exemption. If the official form overlaps those reliefs, this line runs low.",
    notes:
      "The rate fell from 4.4% to 4% on January 1, 2026. The Tax Foundation table shows both the $10,000 rate threshold and a personal exemption. This estimate applies both.",
  }),
  base({
    id: "MO",
    name: "Missouri",
    type: "graduated",
    localPossible: true,
    confidence: "estimated",
    brackets: {
      single: [b(1348, 0.02), b(2696, 0.025), b(4044, 0.03), b(5392, 0.035), b(6740, 0.04), b(8088, 0.045), b(9436, 0.047)],
    },
    standardDeduction: std(16100, 32200),
    why: "Missouri reaches a 4.7% top rate at a low bracket, after a standard deduction tied to the federal amounts. A deduction for federal income tax is not modeled, so this line runs high.",
    stubNote: "Missouri allows some or all federal income tax as a deduction. This estimate leaves that out. Kansas City and St. Louis earnings taxes (1%) are in the local file.",
    notes:
      "Brackets are not doubled for joint filers in the 2026 table. Standard deduction matches the 2026 federal amounts. Federal-income-tax deduction (footnote b) is not computed. A few cities levy an earnings tax; use a custom percent.",
  }),
  base({
    id: "MT",
    name: "Montana",
    type: "graduated",
    brackets: {
      single: [b(0, 0.047), b(47500, 0.0565)],
      mfj: [b(0, 0.047), b(95000, 0.0565)],
    },
    standardDeduction: std(16100, 32200),
    why: "Montana taxes wages at 4.7%, then 5.65% above $47,500 single or $95,000 joint, after the federal standard deduction.",
    notes: "Top rate reduced from 5.9% to 5.65% for 2026, with a wider bottom bracket. A further cut to 5.4% is scheduled for 2027 and is not used.",
  }),
  base({
    id: "NE",
    name: "Nebraska",
    type: "graduated",
    brackets: {
      single: [b(0, 0.0246), b(4130, 0.0351), b(24760, 0.0455)],
      mfj: [b(0, 0.0246), b(8250, 0.0351), b(49530, 0.0455)],
    },
    standardDeduction: std(8850, 17700),
    personalExemption: cred(176, 352, 176),
    why: "Nebraska graduated rates, topping at 4.55%, after an $8,850 single / $17,700 joint standard deduction and a small exemption credit.",
    notes: "Top rate reduced from 5.2% to 4.55% for 2026. A scheduled move toward 3.99% is not applied early.",
  }),
  none("NV", "Nevada", "Nevada does not tax wages. The state line on this stub is $0. FICA still applies."),
  none(
    "NH",
    "New Hampshire",
    "New Hampshire does not tax wages. The interest and dividends tax was repealed and is not part of a paycheck.",
    {
      notes:
        "New Hampshire repealed its interest and dividends tax effective 2025. Wage income was already untaxed. This estimate does not invent a wage tax.",
    },
  ),
  base({
    id: "NJ",
    name: "New Jersey",
    type: "graduated",
    retirementDeferralDeductible: false,
    brackets: {
      single: [b(0, 0.014), b(20000, 0.0175), b(35000, 0.035), b(40000, 0.0553), b(75000, 0.0637), b(500000, 0.0897), b(1000000, 0.1075)],
      mfj: [b(0, 0.014), b(20000, 0.0175), b(50000, 0.0245), b(70000, 0.035), b(80000, 0.0553), b(150000, 0.0637), b(500000, 0.0897), b(1000000, 0.1075)],
    },
    personalExemption: ded(1000, 2000, 1500),
    why: "New Jersey graduated rates after a small personal exemption. Traditional 401(k) deferrals are not removed from New Jersey wages in this model.",
    notes:
      "New Jersey does not exclude employee 401(k) contributions from gross income the way the federal return does. Joint brackets differ from single brackets and are stored separately. Employer payroll taxes in some New Jersey cities are not employee withholding and are not modeled.",
  }),
  base({
    id: "NM",
    name: "New Mexico",
    type: "graduated",
    brackets: {
      single: [b(0, 0.015), b(5500, 0.032), b(16500, 0.043), b(33500, 0.047), b(66500, 0.049), b(210000, 0.059)],
      mfj: [b(0, 0.015), b(8000, 0.032), b(25000, 0.043), b(50000, 0.047), b(100000, 0.049), b(315000, 0.059)],
    },
    standardDeduction: std(16100, 32200),
    personalExemption: ded(0, 0, 4000),
    why: "New Mexico graduated rates, topping at 5.9%, after a standard deduction tied to the federal amounts.",
    notes:
      "Dependent deduction is modeled at $4,000 each. The official rule is a deduction for all but one dependent; with a typical count the difference is one exemption.",
  }),
  base({
    id: "NY",
    name: "New York",
    type: "graduated",
    localPossible: true,
    brackets: {
      single: [b(0, 0.039), b(8500, 0.044), b(11700, 0.0515), b(13900, 0.054), b(80650, 0.059), b(215400, 0.0685), b(1077550, 0.0965), b(5000000, 0.103), b(25000000, 0.109)],
      mfj: [b(0, 0.039), b(17150, 0.044), b(23600, 0.0515), b(27900, 0.054), b(161550, 0.059), b(323200, 0.0685), b(2155350, 0.0965), b(5000000, 0.103), b(25000000, 0.109)],
    },
    standardDeduction: std(8000, 16050, 11200),
    personalExemption: ded(0, 0, 1000),
    recaptureWarningAbove: { single: 215400, mfs: 215400, hoh: 215400, mfj: 323200 },
    why: "New York State graduated rates after an $8,000 single or $16,050 joint standard deduction. New York City and Yonkers are separate selections. They are not added for the rest of the state.",
    notes:
      "Rates reflect the 0.1 point reduction on the lower brackets reported for 2026. Head of household standard deduction is modeled at $11,200 from recent IT-201 instructions, not from the Tax Foundation single/joint columns. New York tax-benefit recapture, which can push high earners toward the top rate on all income, is not computed. A warning is attached once wages pass the 6.85% threshold. Dependent exemption is $1,000. NYC resident tax and the Yonkers surcharge live in local-2026.json.",
  }),
  base({
    id: "NC",
    name: "North Carolina",
    type: "flat",
    flat: true,
    rate: 0.0399,
    brackets: { single: [b(0, 0.0399)] },
    standardDeduction: std(12750, 25500),
    why: "North Carolina taxes wages at a flat 3.99% after a $12,750 single or $25,500 joint standard deduction.",
    notes: "The rate reached 3.99% on January 1, 2026, the last step of the enacted phasedown.",
  }),
  base({
    id: "ND",
    name: "North Dakota",
    type: "graduated",
    brackets: {
      single: [b(48475, 0.0195), b(244825, 0.025)],
      mfj: [b(80975, 0.0195), b(298075, 0.025)],
    },
    standardDeduction: std(16100, 32200),
    why: "North Dakota does not tax the first $48,475 of single taxable income ($80,975 joint). Above that the rates are 1.95% and 2.5%, after the federal standard deduction.",
    notes: "A large zero bracket is why many middle incomes show little or no North Dakota tax. Bracket widths follow the Tax Foundation 2026 table.",
  }),
  base({
    id: "OH",
    name: "Ohio",
    type: "flat",
    special: "ohio",
    rate: 0.0275,
    localPossible: true,
    brackets: { single: [b(26050, 0.0275)] },
    why: "Ohio's state rate is 2.75% on nonbusiness income above $26,050, after a personal exemption that shrinks as income rises. City tax is separate. Columbus, Cleveland, Cincinnati, Toledo, Akron, and Dayton are named; other cities can be entered as a custom percent.",
    notes:
      "Flat 2.75% structure began January 1, 2026. Personal exemption is $2,400 at AGI of $40,000 or less, $2,150 up to $80,000, $1,900 up to $500,000, and $0 above $500,000, per person (taxpayer and spouse, plus dependents at the same tier). The joint-filing credit is not modeled. Municipal tax credit between two Ohio cities is not modeled; only the city you select is applied.",
  }),
  base({
    id: "OK",
    name: "Oklahoma",
    type: "graduated",
    brackets: {
      single: [b(3750, 0.025), b(4900, 0.035), b(7200, 0.045)],
      mfj: [b(7500, 0.025), b(9800, 0.035), b(14400, 0.045)],
    },
    standardDeduction: std(6350, 12700),
    personalExemption: ded(1000, 2000, 1000),
    why: "Oklahoma's top rate is 4.5%, reached at a low bracket, after a standard deduction and a $1,000 personal exemption.",
    notes: "House Bill 2764 collapsed the schedule to three brackets and cut the top rate to 4.5% for 2026. Brackets are not inflation-indexed.",
  }),
  base({
    id: "OR",
    name: "Oregon",
    type: "graduated",
    localPossible: true,
    brackets: {
      single: [b(0, 0.0475), b(4550, 0.0675), b(11400, 0.0875), b(125000, 0.099)],
      mfj: [b(0, 0.0475), b(9100, 0.0675), b(22800, 0.0875), b(250000, 0.099)],
    },
    standardDeduction: std(2910, 5820),
    personalExemption: cred(256, 512, 256),
    creditPhaseoutAgi: { single: 100000, mfs: 100000, hoh: 100000, mfj: 200000 },
    why: "Oregon graduated rates from 4.75% to 9.9% after a small standard deduction. A statewide 0.1% transit tax is a separate payroll line. Portland and Multnomah add income taxes only if you select them, and only above their thresholds.",
    notes:
      "Personal exemption credit is $256 / $512 and is removed entirely once federal AGI exceeds $100,000 single or $200,000 joint, matching the Tax Foundation footnote. That is a cliff, which is how the footnote describes the disallowance. Federal tax is partly deductible in Oregon and is not modeled, so the state line can run high. Metro and Multnomah taxes are in the local file, not in this rate.",
  }),
  base({
    id: "PA",
    name: "Pennsylvania",
    type: "flat",
    flat: true,
    rate: 0.0307,
    localPossible: true,
    retirementDeferralDeductible: false,
    brackets: { single: [b(0, 0.0307)] },
    why: "Pennsylvania taxes compensation at a flat 3.07% with no standard deduction. Traditional 401(k) deferrals stay in the Pennsylvania base. Local earned-income tax is separate — Philadelphia is not applied to the rest of the state.",
    notes:
      "Employee retirement deferrals are taxable compensation for Pennsylvania personal income tax. Section 125 health premiums are still removed in this model, which is a simplification. Philadelphia wage tax and a modeled Pittsburgh earned-income tax live in the local file. Most of the other 2,000+ Pennsylvania localities are a custom percent.",
  }),
  base({
    id: "RI",
    name: "Rhode Island",
    type: "graduated",
    brackets: {
      single: [b(0, 0.0375), b(82050, 0.0475), b(186450, 0.0599)],
    },
    standardDeduction: std(11200, 22400),
    personalExemption: ded(5250, 10500, 5250),
    why: "Rhode Island rates are 3.75%, 4.75%, and 5.99% after a standard deduction and personal exemption. Brackets are not doubled for joint filers.",
    notes:
      "The standard deduction and exemptions phase out between roughly $261,000 and $290,800 of modified AGI. That phaseout is not computed.",
  }),
  base({
    id: "SC",
    name: "South Carolina",
    type: "graduated",
    confidence: "estimated",
    brackets: { single: [b(0, 0), b(3640, 0.03), b(18230, 0.06)] },
    standardDeduction: std(8350, 16700),
    personalExemption: ded(0, 0, 4930),
    why: "South Carolina is modeled at 0%, then 3%, then 6%, after the smaller pre-OBBBA standard deduction. The 6% top rate was a temporary cut and may not cover the whole year.",
    stubNote:
      "South Carolina's top rate was cut to 6% through June 30, 2026 and was scheduled to revert toward 6.2%. The deduction amount also depends on federal conformity. Treat this line as an estimate.",
    notes:
      "Tax Foundation shows a temporary 6% top rate for the FY2026 budget window and a pre-OBBBA standard deduction under footnote (vv). Dependent deduction is $4,930.",
  }),
  none("SD", "South Dakota", "South Dakota does not tax wages. The state line on this stub is $0. FICA still applies."),
  none("TN", "Tennessee", "Tennessee does not tax wages. The Hall tax on interest and dividends is gone, and it was never a wage tax."),
  none("TX", "Texas", "Texas does not tax wages. The state line on this stub is $0. FICA still applies."),
  base({
    id: "UT",
    name: "Utah",
    type: "flat",
    special: "utah",
    rate: 0.045,
    confidence: "estimated",
    why: "Utah taxes income at 4.5%. The standard deduction becomes a credit — 6% of the federal standard deduction — that phases out as income rises. The phaseout thresholds used here are the 2025 figures published with the 2026 rate table.",
    notes:
      "Rate is 4.5% after House Bill 106. Tax Foundation footnote (gg): the credit is 6% of the federal standard or itemized deduction (excluding state and local income tax) and phases out at 1.3 cents per dollar of AGI above $18,213 single / $36,426 joint, as of 2025. Those thresholds were not updated in the source table. Initial credit is $966 single and $1,932 joint, which is 6% of the 2026 federal standard deduction.",
  }),
  base({
    id: "VT",
    name: "Vermont",
    type: "graduated",
    brackets: {
      single: [b(0, 0.0335), b(49400, 0.066), b(119700, 0.076), b(249700, 0.0875)],
      mfj: [b(0, 0.0335), b(82500, 0.066), b(199450, 0.076), b(304000, 0.0875)],
    },
    standardDeduction: std(7650, 15300),
    personalExemption: ded(5300, 10600, 5300),
    why: "Vermont graduated rates from 3.35% to 8.75% after a standard deduction and personal exemption.",
    stubNote:
      "Vermont requires some higher-income filers to pay the greater of regular tax or 3% of federal AGI. That minimum is not computed.",
    notes: "Standard deduction $7,650 / $15,300 and personal exemption $5,300 / $10,600 from the 2026 table. The 3% federal-AGI minimum tax is not modeled.",
  }),
  base({
    id: "VA",
    name: "Virginia",
    type: "graduated",
    localPossible: false,
    brackets: { single: [b(0, 0.02), b(3000, 0.03), b(5000, 0.05), b(17000, 0.0575)] },
    standardDeduction: std(8750, 17500),
    personalExemption: ded(930, 1860, 930),
    why: "Virginia reaches its 5.75% top rate at $17,000 of taxable income. The tax is that schedule after an $8,750 single or $17,500 joint standard deduction and a personal exemption.",
    notes: "Brackets are not doubled for joint filers. Local income tax is not a general Virginia wage tax.",
  }),
  none(
    "WA",
    "Washington",
    "Washington does not tax wages. A capital-gains excise tax can apply to investment gains, not to this paycheck. Paid leave and WA Cares show up as payroll lines when they apply.",
    {
      type: "capital-gains-only",
      notes:
        "Wage income is not subject to the Washington capital gains excise tax (7% / 9% above a large deduction). Those rates are intentionally not applied here. WA PFML and WA Cares are in the payroll file.",
    },
  ),
  base({
    id: "WV",
    name: "West Virginia",
    type: "graduated",
    localPossible: true,
    brackets: { single: [b(0, 0.0222), b(10000, 0.0296), b(25000, 0.0333), b(40000, 0.0444), b(60000, 0.0482)] },
    personalExemption: ded(2000, 4000, 2000),
    why: "West Virginia graduated rates from 2.22% to 4.82% after a personal exemption and no standard deduction.",
    notes: "Brackets are not doubled for joint filers. A few localities have taxes; none are named in the launch file.",
  }),
  base({
    id: "WI",
    name: "Wisconsin",
    type: "graduated",
    confidence: "estimated",
    brackets: {
      single: [b(0, 0.035), b(15110, 0.044), b(51950, 0.053), b(332720, 0.0765)],
      mfj: [b(0, 0.035), b(20150, 0.044), b(69260, 0.053), b(443630, 0.0765)],
    },
    standardDeduction: std(13960, 25840),
    personalExemption: ded(700, 1400, 700),
    why: "Wisconsin graduated rates from 3.5% to 7.65% after a sliding standard deduction. The deduction phaseout is not computed, so middle incomes can show a state line that is slightly low.",
    stubNote:
      "Wisconsin phases the standard deduction out as income rises. This estimate uses the full $13,960 / $25,840 amount.",
    notes:
      "Standard deduction phaseout begins near $20,000 single / $29,000 joint and is not modeled. Personal exemption is $700 / $1,400.",
  }),
  none("WY", "Wyoming", "Wyoming does not tax wages. The state line on this stub is $0. FICA still applies."),
  base({
    id: "DC",
    name: "District of Columbia",
    type: "graduated",
    brackets: {
      single: [b(0, 0.04), b(10000, 0.06), b(40000, 0.065), b(60000, 0.085), b(250000, 0.0925), b(500000, 0.0975), b(1000000, 0.1075)],
    },
    standardDeduction: std(16100, 32200),
    why: "The District taxes income from 4% to 10.75% after a standard deduction tied to the federal amounts. Brackets are not doubled for joint filers. There is no extra city layer on top of this tax.",
    notes:
      "DC is modeled as its own jurisdiction, not as a local add-on to a state. Standard deduction $16,100 / $32,200. Paid family leave in DC is an employer tax and is not withheld from the employee in this estimate.",
  }),
];

const file = {
  taxYear: 2026,
  lastVerified: "2026-09-27",
  jurisdictionType: "state-income",
  method:
    "State income tax is an annualized estimate of tax on wages, not a withholding-table lookup and not a full resident return. The engine subtracts the published standard deduction and personal exemption (or exemption credit), then applies the published brackets. Traditional 401(k) deferrals reduce the state wage base except in Pennsylvania and New Jersey. Section 125 premiums, HSA, FSA, and commuter benefits reduce it everywhere in this model, which is a simplification where a state decouples. Head of household uses single brackets and the single deduction unless a state record says otherwise (California uses the joint standard deduction; New York head of household uses $11,200). Married filing separately uses single brackets. Local taxes are never implied by the state code.",
  filingStatusRule:
    "single and mfs use single brackets unless a married-filing-separately schedule is published (none are stored separately). mfj uses joint brackets when the table differs. hoh uses single brackets.",
  sources: [
    {
      name: "Tax Foundation, State Individual Income Tax Rates and Brackets, 2026",
      url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/",
      asOf: "January 1, 2026 table, article updated February 19, 2026",
    },
    {
      name: "IRS, state government websites index",
      url: "https://www.irs.gov/businesses/small-businesses-self-employed/state-government-websites",
    },
  ],
  reciprocity: {
    DC: ["MD", "VA"],
    IL: ["IA", "KY", "MI", "WI"],
    IN: ["KY", "MI", "OH", "PA", "WI"],
    IA: ["IL"],
    KY: ["IL", "IN", "MI", "OH", "VA", "WV", "WI"],
    MD: ["DC", "PA", "VA", "WV"],
    MI: ["IL", "IN", "KY", "MN", "OH", "WI"],
    MN: ["MI", "ND"],
    MT: ["ND"],
    NJ: ["PA"],
    ND: ["MN", "MT"],
    OH: ["IN", "KY", "MI", "PA", "WV"],
    PA: ["IN", "MD", "NJ", "OH", "VA", "WV"],
    VA: ["DC", "KY", "MD", "PA", "WV"],
    WV: ["KY", "MD", "OH", "PA", "VA"],
    WI: ["IL", "IN", "KY", "MI"],
  },
  reciprocityNote:
    "Reciprocity agreements generally let a resident pay income tax to the home state instead of the work state, after filing the right certificate with the employer. This estimate does not compute two state returns or a credit for taxes paid to another state. It taxes the state you select.",
  states,
};

const defaultSource = {
  name: "Tax Foundation, State Individual Income Tax Rates and Brackets, 2026",
  url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/",
};
for (const st of states) {
  if (!st.source) {
    st.source = st.wageTax === false
      ? { name: `${st.name} — no wage income tax (Tax Foundation 2026)`, url: defaultSource.url }
      : { ...defaultSource };
  }
  if (!st.sourceLabel) {
    st.sourceLabel = st.wageTax === false
      ? "No wage income tax · 2026"
      : `${st.name} income tax · 2026 (Tax Foundation)`;
  }
}
file.lastVerified = "2026-09-28";

const ids = states.map((s) => s.id);
if (new Set(ids).size !== 51) {
  throw new Error(`Expected 51 jurisdictions, got ${ids.length}: ${ids.join(",")}`);
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "states-2026.json");
writeFileSync(out, JSON.stringify(file, null, 2) + "\n");
console.log(`Wrote ${states.length} jurisdictions to ${out}`);
