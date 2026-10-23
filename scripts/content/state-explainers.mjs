/**
 * "How this state taxes your paycheck": a short, hand-written explainer for
 * every state and D.C. The wording is written per state; every dollar amount
 * and rate is read from the rate files or worked out by the engine, so a data
 * change updates the copy.
 */
import { esc, pct, usd, usd0 } from "../lib/shared.mjs";

function helpers(ctx, state) {
  const T = ctx.tables;
  const run = (gross, extra = {}) => ctx.run({ grossAnnual: gross, state: state.id, ...extra });
  const tax = (gross, extra = {}) => run(gross, extra).annual.stateIncome;
  const eff = (gross, extra = {}) => pct(tax(gross, extra) / gross, 1);
  const brackets = state.brackets?.single || [];
  const rates = brackets.map((row) => row.rate).filter((rate) => rate > 0);
  const top = pct(rates.length ? rates[rates.length - 1] : 0);
  const low = pct(rates.length ? rates[0] : 0);
  const prog = (id) => T.payroll.programs.find((row) => row.id === id);
  const progRate = (id) => pct(prog(id).employeeRate, 3);
  const progCost = (id, gross) => {
    const p = prog(id);
    const base = p.wageBase ? Math.min(gross, p.wageBase) : gross;
    const raw = base * p.employeeRate;
    return usd0(p.annualMax ? Math.min(raw, p.annualMax) : raw);
  };
  const loc = (id) => T.local.jurisdictions.find((row) => row.id === id);
  const locTax = (id, gross, extra = {}) => usd0(run(gross, { localId: id, ...extra }).annual.local);
  const fedSD = T.federal.standardDeduction;
  const sd = state.sd && state.sd !== "federal" ? state.sd : null;
  const ex = state.exemption || {};
  const p = (value, digits = 2) => pct(value, digits);
  const $ = usd0;
  const name = esc(state.name);
  const local = ctx.locals.filter((row) => row.state === state.id);
  const localRange = (field = "residentRate") => {
    const vals = local.map((row) => row[field]).filter((v) => typeof v === "number");
    return [p(Math.min(...vals)), p(Math.max(...vals))];
  };
  const nth = (i) => brackets[i < 0 ? brackets.length + i : i];
  const margin = (gross) => {
    const taxable = run(gross).annual.stateTaxable;
    let rate = 0;
    for (const row of brackets) if (taxable > row.over) rate = row.rate;
    return pct(rate, 2);
  };
  return { nth, margin, usd, T, run, tax, eff, brackets, top, low, prog, progRate, progCost, loc, locTax, fedSD, sd, ex, p, $, name, local, localRange };
}

/* Each entry returns { paras: [html, ...], faq?: [question, answer] } */
const WRITERS = {
  AL: (h) => ({
    paras: [
      `Alabama is one of the few states that lets you subtract the federal income tax you pay before it works out its own tax. That deduction, plus a standard deduction that is largest for lower earners, keeps the state's effective rate well under its ${h.top} top rate: on ${h.$(60000)} of single pay, Alabama income tax comes to about ${h.$(h.tax(60000))}, or ${h.eff(60000)} of salary.`,
      `The top rate starts after only a few thousand dollars of taxable income, so nearly every full-time worker's extra dollars are taxed at ${h.top}. Employees file Form A-4 so the employer knows the filing status and dependents to use.`,
      `Some Alabama cities and counties, including Birmingham, add an occupational tax that is withheld on wages earned inside their limits. Those local taxes are not in the calculator's place list; if your pay stub shows one, enter its rate as a custom local percentage.`,
    ],
    faq: ["Does Alabama let me deduct federal income tax?", "Yes. Alabama is one of the few states that allows a deduction for federal income tax paid, which lowers the amount the state taxes. The calculator subtracts the federal income tax it estimates for the same pay."],
  }),
  AK: (h) => ({
    paras: [
      `Alaska has had no individual income tax since 1980, and it has no statewide sales tax either. What sets an Alaska paycheck apart is a small line most workers elsewhere never see: an employee contribution to unemployment insurance. In 2026 it is ${h.progRate("ak-ui")} of wages up to ${h.$(h.prog("ak-ui").wageBase)}, so it tops out at about ${h.progCost("ak-ui", 1e9)} a year.`,
      `Alaska is one of only three states, with New Jersey and Pennsylvania, where employees pay into unemployment insurance. Apart from that line and federal taxes, an Alaska paycheck has no state or local income tax withheld, whichever borough you live in.`,
    ],
  }),
  AZ: (h) => ({
    paras: [
      `Arizona charges one flat ${h.top} rate on income after its standard deduction (${h.$(h.sd.single)} single, ${h.$(h.sd.mfj)} joint), one of the lowest flat rates in the country. On ${h.$(75000)} of single pay the state tax is about ${h.$(h.tax(75000))} for the year.`,
      `Arizona withholding works differently from most states. On Form A-4 each employee picks a withholding percentage of gross pay from a short list, or chooses zero if they expect no Arizona tax, and employers use a default rate when no form is filed. The calculator shows the tax you actually owe for the year; your paycheck may withhold more or less depending on the percentage you chose, and the difference settles when you file.`,
      `Arizona cities do not levy a wage tax. The state follows the federal deductions for tips and overtime premium pay, so those also lower Arizona taxable income.`,
    ],
    faq: ["Why doesn't my Arizona withholding match the estimate?", "Arizona lets each employee choose a flat withholding percentage on Form A-4. The calculator estimates the tax you will owe for the year, so if the percentage you picked is higher or lower than your actual rate, the difference shows up as a refund or a balance due when you file."],
  }),
  AR: (h) => ({
    paras: [
      `Arkansas taxes the first ${h.$(h.brackets[1]?.over || 0)} of net taxable income at zero and then climbs through several small steps to ${h.top}. For higher earners the state's formula takes back the benefit of those low steps, so above ${h.$(h.T.states.states.find((s) => s.id === "AR").params.adjust.to)} of net taxable income the whole amount is effectively taxed close to the top rate.`,
      `At ${h.$(50000)} single, Arkansas income tax is about ${h.$(h.tax(50000))} a year (${h.eff(50000)} of pay); at ${h.$(100000)} it is about ${h.$(h.tax(100000))}. Employees use Form AR4EC to tell the employer how many exemptions to claim.`,
      `Married couples in Arkansas often file separately on the same return, each using their own income, which can cost less than combining. The calculator's joint estimate applies one schedule to combined pay and can run high for two-earner couples.`,
    ],
  }),
  CA: (h) => ({
    paras: [
      `California has the most rate steps of any state, nine brackets from ${h.low} to ${h.top}, plus an extra ${h.p(h.T.states.states.find((s) => s.id === "CA").params.surtax.rate)} on taxable income over ${h.$(h.T.states.states.find((s) => s.id === "CA").params.surtax.over)}. The brackets are narrow at the bottom and very wide in the middle, so a worker on ${h.$(80000)} lands in the ${h.margin(80000)} bracket even though their average rate is much lower: about ${h.eff(80000)} at ${h.$(80000)} and ${h.eff(150000)} at ${h.$(150000)}.`,
      `Every California paycheck also carries State Disability Insurance. Since 2024 SDI has no wage cap, so the ${h.progRate("ca-sdi")} rate applies to all pay: about ${h.progCost("ca-sdi", 80000)} a year on ${h.$(80000)}. California does not exclude HSA contributions from state wages, so they still count for state tax even though they come off federal wages.`,
      `No California city levies a personal income tax on wages, so two people with the same pay in Los Angeles and Fresno see the same state withholding. Employees can set California withholding separately from federal on Form DE 4.`,
    ],
    faq: ["Is California SDI capped?", `No. Since 2024 California SDI applies to all wages with no maximum. In 2026 the employee rate is ${h.progRate("ca-sdi")}, and it appears as a separate line from state income tax.`],
  }),
  CO: (h) => ({
    paras: [
      `Colorado's tax is about as simple as a state income tax gets: a flat ${h.top} on federal taxable income. Because it starts from the federal figure, the federal standard deduction (${h.$(h.fedSD.single)} single) and any traditional 401(k) or HSA savings lower your Colorado tax too. At ${h.$(70000)} single, the state line is about ${h.$(h.tax(70000))} a year.`,
      `Colorado's paid family and medical leave program, FAMLI, takes ${h.progRate("co-famli")} of wages from employees. Colorado adds the federal overtime deduction back, so overtime premium pay is taxed in full at the state level.`,
      `A handful of Colorado cities charge a flat monthly occupational privilege tax rather than a percentage. Denver's employee share is ${h.usd(h.loc("denver-co").monthly)} a month for anyone who works in the city and earns at least ${h.$(h.loc("denver-co").minMonthlyWages)} that month. Aurora, Greenwood Village, Glendale and Sheridan have similar flat charges of a few dollars a month; those are not in the calculator.`,
    ],
  }),
  CT: (h) => ({
    paras: [
      `Connecticut has no standard deduction. Instead it gives a personal exemption that shrinks as income rises, a tax credit for lower earners, and two add-backs that gradually take away the benefit of the lower brackets at higher incomes. The result is that the effective rate climbs faster than the bracket table alone suggests: about ${h.eff(60000)} at ${h.$(60000)} single and ${h.eff(150000)} at ${h.$(150000)}.`,
      `Employees fill out Form CT-W4 and choose a withholding code that matches their filing status. Connecticut Paid Leave adds ${h.progRate("ct-pfml")} of wages up to the Social Security wage base as a separate line.`,
      `There is no city or town income tax in Connecticut. Many residents commute to New York; they pay New York tax on New York wages and claim a Connecticut credit for it, so the two states do not double-tax the same dollars.`,
    ],
  }),
  DE: (h) => ({
    paras: [
      `Delaware's brackets run from zero on the first ${h.$(h.brackets[1]?.over || 0)} of taxable income to ${h.top} above ${h.$(h.brackets[h.brackets.length - 1]?.over || 0)}, after a ${h.$(h.sd.single)} standard deduction and a ${h.$(h.ex.single)} personal credit. Because the top rate starts so low, most full-time workers pay ${h.top} on their last dollars. On ${h.$(65000)} single, Delaware tax is about ${h.$(h.tax(65000))}.`,
      `The City of Wilmington adds a ${h.p(h.loc("wilmington-de").residentRate)} wage tax on residents and on anyone who works in the city, charged on gross pay. On ${h.$(65000)} that is about ${h.locTax("wilmington-de", 65000)} a year. Delaware's paid leave program started employee deductions in 2025, and employers may pass along up to ${h.progRate("de-pfml")} of wages.`,
      `Married couples can usually lower their tax by filing separately on the combined Delaware return; the joint estimate here runs one schedule on combined income and can be high for two earners.`,
    ],
  }),
  FL: (h) => ({
    paras: [
      `Florida's constitution prohibits a personal income tax, and no city or county in the state taxes wages either. A Florida paycheck therefore shows only federal income tax, Social Security and Medicare, plus whatever benefits and retirement savings you choose.`,
      `Employers pay Florida's reemployment (unemployment) tax themselves; it is never withheld from workers. On ${h.$(60000)} of single pay, take-home in Florida is about ${h.$(h.run(60000).annual.net)} a year, which makes it a useful baseline when comparing an offer in another state.`,
    ],
  }),
  GA: (h) => ({
    paras: [
      `Georgia moved to a single flat rate in 2024 and has been cutting it since. For 2026 the rate is ${h.top} after a ${h.$(h.sd.single)} standard deduction (${h.$(h.sd.mfj)} joint) and ${h.$(h.ex.dependent)} for each dependent. That makes the first ${h.$(h.sd.single)} of a single worker's pay free of Georgia tax; on ${h.$(60000)} the state line is about ${h.$(h.tax(60000))}.`,
      `The 2026 rate cut was passed partway through the year and made retroactive to January 1, so paychecks withheld at the older rate earlier in the year ran slightly high; the difference comes back when you file. Georgia also excludes a capped amount of tips and overtime premium pay for 2026 through 2028.`,
      `Employees use Form G-4 to set Georgia withholding. Georgia has no city or county income taxes.`,
    ],
  }),
  HI: (h) => ({
    paras: [
      `Hawaii has twelve brackets, more than any other state, and they start high: the rate reaches ${h.p(h.nth(3).rate, 1)} on taxable income above ${h.$(h.nth(3).over)}. Larger standard deductions that took effect for 2026 soften that a little. On ${h.$(70000)} single, Hawaii income tax is about ${h.$(h.tax(70000))} a year, or ${h.eff(70000)} of pay.`,
      `Hawaii also requires temporary disability insurance. Employers may take up to ${h.progRate("hi-tdi")} of wages from employees, with a weekly maximum, and many employers cover the whole cost themselves; check your pay stub to see which applies.`,
      `Employees file Form HW-4 for state withholding. No county in Hawaii taxes wages.`,
    ],
  }),
  ID: (h) => ({
    paras: [
      `Idaho starts from federal taxable income, so the federal standard deduction applies, then exempts a small first slice of income and taxes the rest at a flat ${h.top}. On ${h.$(60000)} single, that works out to about ${h.$(h.tax(60000))} a year.`,
      `Because Idaho follows the federal starting point, traditional 401(k) and HSA contributions, and since 2026 the federal deductions for tips and overtime premium pay, lower Idaho tax as well. Employees use Form ID W-4. Idaho has no local income taxes.`,
    ],
  }),
  IL: (h) => ({
    paras: [
      `Illinois' constitution requires a flat income tax, and the rate is ${h.top}. There is no standard deduction; each person gets a ${h.$(h.ex.single)} exemption instead, which is lost entirely above ${h.$(h.T.states.states.find((s) => s.id === "IL").params.exemptionCliff.single)} of federal income (${h.$(h.T.states.states.find((s) => s.id === "IL").params.exemptionCliff.mfj)} joint). On ${h.$(60000)} single, Illinois tax is about ${h.$(h.tax(60000))}.`,
      `Chicago and other Illinois cities do not tax wages, so the state line is the same anywhere in Illinois. Employees use Form IL-W-4.`,
      `A resident of one of Illinois' reciprocal states who works in Illinois can file Form IL-W-5-NR so the employer withholds for the home state instead.`,
    ],
  }),
  IN: (h) => ({
    paras: [
      `Indiana is one of the clearest examples of why a local calculator matters. The state rate is a flat ${h.top}, but every one of Indiana's ${h.local.length} counties adds its own income tax on the same taxable income, from ${h.localRange()[0]} to ${h.localRange()[1]}. On ${h.$(60000)} of single pay, county tax ranges from about ${h.locTax(h.local.reduce((a, b) => (a.residentRate <= b.residentRate ? a : b)).id, 60000)} to ${h.locTax(h.local.reduce((a, b) => (a.residentRate >= b.residentRate ? a : b)).id, 60000)} a year depending on the county.`,
      `The county that counts is the one you lived in on January 1. If you live outside Indiana and work there, the county where you worked on January 1 applies instead. Employees report their county on Form WH-4.`,
      `Indiana gives a small exemption per person and an extra amount per dependent child rather than a standard deduction. For 2026 only, it also follows the federal deductions for tips and overtime premium pay for both state and county tax.`,
    ],
    faq: ["Which Indiana county tax do I pay?", "The county where you lived on January 1 of the tax year. If you lived outside Indiana on January 1 but worked in Indiana, you pay the rate of the county where you worked. Choose that county in the calculator."],
  }),
  IA: (h) => ({
    paras: [
      `Iowa replaced its graduated brackets with a flat rate in 2025, now ${h.top} of federal taxable income. Starting from the federal figure means the federal standard deduction comes off first, and there is a small credit per person. On ${h.$(60000)} single, Iowa tax is about ${h.$(h.tax(60000))}.`,
      `Many Iowa school districts add a school district surtax, charged as a percentage of your Iowa income tax and paid with your return. It is not included in the calculator. Iowa also follows the federal tips and overtime deductions, but its withholding formula ignores them, so the saving arrives as part of your refund.`,
      `Employees file Form IA W-4.`,
    ],
  }),
  KS: (h) => ({
    paras: [
      `Since 2024 Kansas has had just two brackets, ${h.low} and ${h.top}, with the higher rate starting at ${h.$(h.brackets[1].over)} of taxable income for single filers. A large personal exemption (${h.$(h.ex.single)} single) and a standard deduction come off first, so on ${h.$(60000)} single Kansas tax is about ${h.$(h.tax(60000))}.`,
      `Kansas cities do not withhold a wage tax. Many people in the Kansas City area live in Kansas and work in Kansas City, Missouri, though; Kansas City's earnings tax then applies to the Missouri wages, and Kansas gives credit for the Missouri state tax. Employees file Form K-4.`,
    ],
  }),
  KY: (h) => ({
    paras: [
      `Kentucky's state tax is a flat ${h.top} for 2026 after a ${h.$(h.sd.single)} standard deduction; the rate has been cut step by step since 2023. On ${h.$(60000)} single, the state line is about ${h.$(h.tax(60000))}.`,
      `Local taxes are where Kentucky gets complicated. Many cities and counties, and some school districts, charge an occupational license tax on wages earned within their borders, usually on gross pay before a 401(k). Louisville Metro charges residents ${h.p(h.loc("louisville-ky").residentRate)} and commuters ${h.p(h.loc("louisville-ky").nonresidentRate)}; Lexington-Fayette charges ${h.p(h.loc("lexington-ky").residentRate)}. On ${h.$(60000)} those cost about ${h.locTax("louisville-ky", 60000)} and ${h.locTax("lexington-ky", 60000)} a year.`,
      `Kentucky has reciprocal agreements with more neighbors than any other state. Employees file Form K-4 for state withholding.`,
    ],
  }),
  LA: (h) => ({
    paras: [
      `Louisiana replaced its three brackets with a flat ${h.top} rate in 2025 and raised its standard deduction to ${h.$(h.sd.single)} (${h.$(h.sd.mfj)} joint or head of household). On ${h.$(60000)} single, Louisiana income tax comes to about ${h.$(h.tax(60000))}, or ${h.eff(60000)} of pay.`,
      `Louisiana parishes and cities rely on sales and property taxes rather than income taxes, so there is no local wage tax. Employees file Form L-4.`,
    ],
  }),
  ME: (h) => ({
    paras: [
      `Maine taxes income in three main bands, ${h.low}, ${h.p(h.nth(1).rate)} and ${h.p(h.nth(2).rate)}, after a standard deduction and personal exemption, with a surcharge on very high incomes from 2026. The standard deduction phases out for higher earners, so the effective rate rises from about ${h.eff(60000)} at ${h.$(60000)} single to ${h.eff(150000)} at ${h.$(150000)}.`,
      `Maine's paid family and medical leave program began collecting contributions in 2025; employers may take up to ${h.progRate("me-pfml")} of wages from employees. Employees use Form W-4ME. Maine has no local income tax.`,
    ],
  }),
  MD: (h) => ({
    paras: [
      `Maryland has two income taxes on every paycheck: the state's graduated tax, from ${h.low} to ${h.top}, and a county tax that every county and Baltimore City charges on the same taxable income. County rates run from ${h.localRange()[0]} to ${h.localRange()[1]}, so moving between counties changes take-home pay even with the same job. On ${h.$(85000)} single, county tax is about ${h.locTax("worcester-md", 85000)} in Worcester County and ${h.locTax("montgomery-md", 85000)} in Montgomery County.`,
      `County tax follows where you live, not where you work. People who work in Maryland but live in a state without a reciprocal agreement pay a special nonresident rate instead. Maryland's exemption shrinks as income passes ${h.$(h.T.states.states.find((s) => s.id === "MD").params.exemptionSteps.single[0][0])} single, so higher earners lose part of it.`,
      `Employees file Form MW507 and name their county of residence so the right local rate is withheld.`,
    ],
    faq: ["Do I pay Maryland county tax where I live or where I work?", "Where you live. Maryland's local income tax is set by your county of residence (or Baltimore City) on the same taxable income as the state tax. Nonresidents who work in Maryland pay a special nonresident rate instead."],
  }),
  MA: (h) => ({
    paras: [
      `Massachusetts charges a flat ${h.low} on wages, with no standard deduction, after a personal exemption of ${h.$(h.ex.single)} single. Voters added a ${h.p(h.nth(1).rate - h.nth(0).rate)} surtax in 2022 on income above an indexed threshold (${h.$(h.brackets[1].over)} for 2026), which only affects very high earners. On ${h.$(80000)} single, Massachusetts tax is about ${h.$(h.tax(80000))}.`,
      `Paid family and medical leave takes up to ${h.progRate("ma-pfml")} of wages from employees. Massachusetts also lets workers deduct part of the Social Security and Medicare tax they pay; that deduction is not included here, so the state line can run slightly high.`,
      `Employees file Form M-4. Massachusetts cities and towns do not tax income.`,
    ],
  }),
  MI: (h) => ({
    paras: [
      `Michigan's state tax is a flat ${h.top} after a ${h.$(h.ex.single)} exemption per person; there is no standard deduction. On ${h.$(60000)} single, that is about ${h.$(h.tax(60000))} a year.`,
      `About two dozen Michigan cities add a city income tax under a uniform state law that taxes nonresidents who work in the city at half the resident rate. Detroit is the largest: ${h.p(h.loc("detroit").residentRate)} for residents and ${h.p(h.loc("detroit").nonresidentRate)} for commuters, or about ${h.locTax("detroit", 60000)} a year for a resident earning ${h.$(60000)}. Grand Rapids, Lansing, Flint, Saginaw and others are also in the calculator.`,
      `Michigan follows the federal deductions for tips and overtime premium pay for 2026 through 2028, but its city income taxes do not. Employees file Form MI-W4.`,
    ],
    faq: ["Do I pay Detroit income tax if I only work there?", `Yes. Detroit taxes people who work in the city but live elsewhere at ${h.p(h.loc("detroit").nonresidentRate)}, half the resident rate. Residents pay ${h.p(h.loc("detroit").residentRate)} on all their wages, wherever they work.`],
  }),
  MN: (h) => ({
    paras: [
      `Minnesota has four brackets, from ${h.low} to ${h.top}, after a ${h.$(h.sd.single)} standard deduction. The lowest rate is higher than many states' top rates, so the effective tax is noticeable even at moderate pay: about ${h.eff(60000)} at ${h.$(60000)} single and ${h.eff(120000)} at ${h.$(120000)}.`,
      `Minnesota Paid Leave began on January 1, 2026, adding a new deduction of up to ${h.progRate("mn-pl")} of wages for employees. The standard deduction and dependent exemption shrink at high incomes; that reduction is not computed here.`,
      `Employees file Form W-4MN. Minnesota has no local income taxes.`,
    ],
  }),
  MS: (h) => ({
    paras: [
      `Mississippi exempts the first ${h.$(h.brackets[1].over)} of taxable income and taxes the rest at a flat ${h.top} for 2026; the rate is scheduled to keep falling in later years. A standard deduction and an exemption of ${h.$(h.ex.single)} single come off first. On ${h.$(50000)} single, Mississippi tax is about ${h.$(h.tax(50000))}.`,
      `Employees file Form 89-350 to claim exemptions. No Mississippi city or county taxes wages.`,
    ],
  }),
  MO: (h) => ({
    paras: [
      `Missouri's brackets are narrow and stack up quickly, reaching the ${h.top} top rate at ${h.$(h.nth(-1).over)} of taxable income, so most full-time workers pay ${h.top} on their last dollars. Missouri uses the federal standard deduction and lets lower and middle earners deduct part of their federal income tax. On ${h.$(60000)} single, state tax is about ${h.$(h.tax(60000))}.`,
      `Kansas City and St. Louis each charge a ${h.p(h.loc("kansas-city-mo").residentRate)} earnings tax on residents and on anyone who works in the city, about ${h.locTax("kansas-city-mo", 60000)} a year on ${h.$(60000)}. State law requires voters in each city to renew the tax every five years.`,
      `Employees file Form MO W-4. Outside those two cities, Missouri has no local wage tax.`,
    ],
  }),
  MT: (h) => ({
    paras: [
      `Montana now has two rates, ${h.low} and ${h.top}, after a 2026 law lowered the top rate and widened the lower bracket to ${h.$(h.brackets[1].over)} for single filers. Montana starts from federal taxable income, so the federal standard deduction and the federal tips and overtime deductions all apply. On ${h.$(60000)} single, Montana tax is about ${h.$(h.tax(60000))}.`,
      `Employees file Form MW-4. Montana has no local income taxes.`,
    ],
  }),
  NE: (h) => ({
    paras: [
      `Nebraska is in the middle of a multi-year rate cut; the top rate is ${h.top} for 2026, applied above ${h.$(h.brackets[2].over)} of taxable income for single filers. A standard deduction of ${h.$(h.sd.single)} and a small personal credit come first. On ${h.$(60000)} single, Nebraska tax is about ${h.$(h.tax(60000))}.`,
      `Some 2026 figures for Nebraska are estimates because the Department of Revenue had not published every 2026 schedule when the rates were checked; the state page marks them. Employees file Form W-4N. Nebraska cities do not tax wages.`,
    ],
  }),
  NV: (h) => ({
    paras: [
      `Nevada has no personal income tax, and its constitution bars one. The state collects a payroll tax called the Modified Business Tax, but employers pay it on their total wages; nothing is withheld from workers for it.`,
      `With no state or local income tax and no state payroll programs on the employee side, a Nevada paycheck is federal tax, Social Security and Medicare. On ${h.$(60000)} single that leaves about ${h.$(h.run(60000).annual.net)} a year before benefits and retirement savings.`,
    ],
  }),
  NH: (h) => ({
    paras: [
      `New Hampshire has never taxed wages. It used to tax interest and dividend income, but that tax was repealed starting in 2025, so the state now has no personal income tax of any kind.`,
      `Many New Hampshire residents work in Massachusetts. Massachusetts taxes wages earned there, and because New Hampshire has no income tax there is no home-state credit to offset it. Choose Massachusetts in the calculator for that situation. On ${h.$(60000)} single, a New Hampshire-only paycheck keeps about ${h.$(h.run(60000).annual.net)} a year.`,
    ],
  }),
  NJ: (h) => ({
    paras: [
      `New Jersey's brackets run from ${h.low} to ${h.top}, with large jumps in the middle: the rate goes from ${h.p(h.nth(2).rate)} to ${h.p(h.nth(3).rate, 3)} at ${h.$(h.nth(3).over)} of taxable income for single filers. There is no standard deduction, only a ${h.$(h.ex.single)} exemption. On ${h.$(80000)} single, New Jersey tax is about ${h.$(h.tax(80000))}.`,
      `Three state insurance programs come out of New Jersey pay: unemployment and workforce development at ${h.progRate("nj-ui")} up to ${h.$(h.prog("nj-ui").wageBase)}, temporary disability at ${h.progRate("nj-tdi")} and family leave at ${h.progRate("nj-fli")}, both up to ${h.$(h.prog("nj-tdi").wageBase)}. New Jersey also keeps health premiums, FSA and HSA contributions in state wages, unlike federal tax.`,
      `Newark and Jersey City charge a payroll tax, but employers pay it; it is not withheld from workers. New Jersey residents who work in Pennsylvania can file Form NJ-165 under the two states' reciprocal agreement. Employees use Form NJ-W4.`,
    ],
  }),
  NM: (h) => ({
    paras: [
      `New Mexico uses the federal standard deduction and six brackets from ${h.low} to ${h.top}, with the top rate reserved for taxable income over ${h.$(h.brackets[h.brackets.length - 1].over)}. A worker on ${h.$(60000)} pays ${h.margin(60000)} on their last dollars. On ${h.$(60000)} single, New Mexico tax is about ${h.$(h.tax(60000))}.`,
      `New Mexico gives a ${h.$(h.ex.dependent)} deduction for each dependent after the first. Employers use the federal Form W-4 for state withholding, and there are no local income taxes.`,
    ],
  }),
  NY: (h) => ({
    paras: [
      `New York State tax runs from ${h.low} to ${h.top} after an ${h.$(h.sd.single)} standard deduction; a worker on ${h.$(85000)} pays ${h.margin(85000)} on their last dollars. On ${h.$(85000)} single, state tax is about ${h.$(h.tax(85000))}.`,
      `Where you live inside New York matters. Residents of the five boroughs pay New York City income tax on top, from ${h.p(h.loc("nyc").brackets.single[0].rate, 3)} to ${h.p(h.loc("nyc").brackets.single[h.loc("nyc").brackets.single.length - 1].rate, 3)}, about ${h.locTax("nyc", 85000)} a year on ${h.$(85000)}. Commuters into the city do not pay it. Yonkers residents pay a surcharge equal to a share of their state tax, and people who work in Yonkers but live elsewhere pay ${h.p(h.loc("yonkers").nonresidentRate)} of wages.`,
      `Two state programs also come out of pay: disability benefits (DBL) at ${h.progRate("ny-dbl")} with a small weekly cap, and Paid Family Leave at ${h.progRate("ny-pfl")} up to ${h.$(h.prog("ny-pfl").wageBase)}. Commuters from New Jersey and Connecticut pay New York tax on New York wages and claim a credit at home. Employees file Form IT-2104.`,
    ],
    faq: ["Do I pay NYC income tax if I work in Manhattan but live in New Jersey?", "No. New York City income tax applies only to residents of the five boroughs. You do pay New York State tax on the wages you earn in New York, and New Jersey gives you a credit for it."],
  }),
  NC: (h) => ({
    paras: [
      `North Carolina has had a single flat rate since 2014 and has cut it most years since; for 2026 it is ${h.top} after a ${h.$(h.sd.single)} standard deduction (${h.$(h.sd.mfj)} joint). On ${h.$(60000)} single, North Carolina tax is about ${h.$(h.tax(60000))}.`,
      `North Carolina offers a child deduction that depends on income. It is not included in the calculator, so families with children may see a slightly higher state line here than on their return. Employees file Form NC-4. No city or county in North Carolina taxes wages.`,
    ],
  }),
  ND: (h) => ({
    paras: [
      `North Dakota has the gentlest income tax of the states that have one. It starts from federal taxable income, taxes nothing on the first ${h.$(h.brackets[1].over)} of that (single), then charges ${h.low} and ${h.top}. A single worker earning ${h.$(60000)} owes no North Dakota income tax at all, and on ${h.$(100000)} the state line is only about ${h.$(h.tax(100000))} a year.`,
      `Employers use the federal Form W-4 for North Dakota withholding. Residents of Minnesota and Montana who work in North Dakota can file Form NDW-R so they are taxed only at home. There are no local income taxes.`,
    ],
  }),
  OH: (h) => ({
    paras: [
      `Ohio has two layers that matter on a paycheck. The state tax is light: nothing on the first ${h.$(h.brackets[1].over)} of income, then ${h.top} above it for 2026, the first year of a single rate. On ${h.$(60000)} single, it is about ${h.$(h.tax(60000))}.`,
      `The bigger line is often the city. Most Ohio cities and villages charge a municipal income tax, usually on Medicare wages (so a 401(k) does not lower it) and mostly where you work. Columbus, Cleveland, Toledo, Akron and Dayton charge ${h.p(h.loc("columbus-oh").residentRate)} and Cincinnati ${h.p(h.loc("cincinnati-oh").residentRate)}; on ${h.$(60000)} the Columbus tax is about ${h.locTax("columbus-oh", 60000)} a year, more than the state tax. If you live in one city and work in another, your home city may charge the difference after a credit.`,
      `About a third of Ohio school districts also levy a school district income tax on residents, which is not included in the calculator. Employees file Form IT 4 and name their school district so the employer can withhold it.`,
    ],
    faq: ["Why is my Ohio city tax bigger than my state tax?", `Ohio's state tax exempts the first part of income and taxes the rest at a low rate, while Ohio cities tax all wages, often at ${h.localRange()[0]} to ${h.localRange()[1]} in the largest cities. For many workers that makes the city line larger than the state line.`],
  }),
  OK: (h) => ({
    paras: [
      `From 2026 Oklahoma removed tax on the first ${h.$(h.brackets[1].over)} of taxable income and lowered its top rate to ${h.top}, which applies above ${h.$(h.brackets[h.brackets.length - 1].over)} for single filers, so nearly every worker's extra dollars are taxed at the top rate. A ${h.$(h.sd.single)} standard deduction and ${h.$(h.ex.single)} exemption come off first. On ${h.$(60000)} single, Oklahoma tax is about ${h.$(h.tax(60000))}.`,
      `Employees file Form OK-W-4. Oklahoma cities do not tax wages.`,
    ],
  }),
  OR: (h) => ({
    paras: [
      `Oregon has no sales tax and leans on income tax instead. Rates run from ${h.low} to ${h.top}, and the ${h.p(h.nth(2).rate)} rate starts at only ${h.$(h.nth(2).over)} of taxable income, so most workers pay ${h.p(h.nth(2).rate)} on their last dollars. Oregon softens this by letting you subtract part of your federal income tax. On ${h.$(70000)} single, Oregon tax is about ${h.$(h.tax(70000))}, or ${h.eff(70000)} of pay.`,
      `Every Oregon paycheck also has a ${h.progRate("or-transit")} statewide transit tax and Paid Leave Oregon at ${h.progRate("or-pfml")} of wages. In the Portland area, residents with higher incomes also owe the Metro supportive housing tax and Multnomah County's preschool tax, which start only above high income thresholds; choose Portland / Multnomah in the calculator to include them.`,
      `TriMet and Lane Transit payroll taxes are paid by employers, not withheld. Employees file Form OR-W-4.`,
    ],
  }),
  PA: (h) => ({
    paras: [
      `Pennsylvania's state tax is a flat ${h.top} on wages with no standard deduction or exemption, and, unusually, it does not exclude traditional 401(k) contributions. On ${h.$(60000)}, the state line is about ${h.$(h.tax(60000))}. Employees also pay ${h.progRate("pa-uc")} of wages into unemployment compensation.`,
      `Almost every Pennsylvania municipality and school district charges a local earned income tax (EIT), and many also charge a small flat local services tax. Employers withhold the higher of your home EIT rate or your work location's nonresident rate. Philadelphia has its own wage tax: ${h.p(h.loc("philadelphia").residentRate, 3)} for residents and ${h.p(h.loc("philadelphia").nonresidentRate, 3)} for commuters, about ${h.locTax("philadelphia", 60000)} a year for a resident on ${h.$(60000)}. Pittsburgh residents pay ${h.p(h.loc("pittsburgh").residentRate)} combined.`,
      `Residents of the reciprocal states listed below who work in Pennsylvania file Form REV-419 so their employer withholds only for their home state. Pennsylvania does not use a state withholding certificate; the flat rate applies to everyone.`,
    ],
    faq: ["What is the Pennsylvania local earned income tax?", "Most Pennsylvania municipalities and school districts charge an earned income tax on wages. Your employer withholds the higher of the rate where you live or the nonresident rate where you work. Philadelphia and Pittsburgh are built into the calculator; for other places, enter your combined EIT rate as a custom local percentage."],
  }),
  RI: (h) => ({
    paras: [
      `Rhode Island has three brackets, ${h.low}, ${h.p(h.nth(1).rate)} and ${h.top}, after an ${h.$(h.sd.single)} standard deduction and a ${h.$(h.ex.single)} exemption per person. Most workers stay in the bottom bracket, which runs to ${h.$(h.brackets[1].over)} of taxable income. On ${h.$(70000)} single, Rhode Island tax is about ${h.$(h.tax(70000))}.`,
      `Rhode Island's temporary disability insurance is one of the larger state payroll programs: ${h.progRate("ri-tdi")} of wages up to ${h.$(h.prog("ri-tdi").wageBase)}, or about ${h.progCost("ri-tdi", 70000)} a year on ${h.$(70000)}. Employees file Form RI W-4. There is no local income tax.`,
    ],
  }),
  SC: (h) => ({
    paras: [
      `South Carolina rewrote its income tax for 2026. It now starts from federal adjusted gross income, not federal taxable income, and replaces the federal standard deduction with its own deduction that shrinks as income rises. The rates are ${h.low} on the first ${h.$(h.brackets[1].over)} and ${h.top} above. On ${h.$(60000)} single, South Carolina tax is about ${h.$(h.tax(60000))}.`,
      `The Department of Revenue had not updated its withholding tables for the new law when these rates were checked, so 2026 paychecks may still be withheld under the old formula and differ from the tax shown here; the difference settles on the return. Employees file Form SC W-4. South Carolina has no local income tax.`,
    ],
  }),
  SD: (h) => ({
    paras: [
      `South Dakota has no personal income tax and no state payroll programs on the employee side. Cities and counties rely on sales and property tax, so nothing is withheld for local tax either.`,
      `A South Dakota paycheck shows federal income tax, Social Security and Medicare only. On ${h.$(60000)} single, take-home is about ${h.$(h.run(60000).annual.net)} a year before benefits and retirement savings.`,
    ],
  }),
  TN: (h) => ({
    paras: [
      `Tennessee has never taxed wages. Its old Hall tax on interest and dividends was phased out and ended in 2021, so there is now no personal income tax of any kind.`,
      `Tennessee makes up for it with some of the highest combined sales taxes in the country, which a paycheck calculator does not show. On ${h.$(60000)} single, a Tennessee paycheck keeps about ${h.$(h.run(60000).annual.net)} a year after federal tax, Social Security and Medicare.`,
    ],
  }),
  TX: (h) => ({
    paras: [
      `Texas has no personal income tax, and a 2019 constitutional amendment requires voter approval before one could ever be created. No Texas city or county taxes wages.`,
      `Texas employers pay state unemployment tax themselves, so a Texas paycheck shows only federal income tax, Social Security and Medicare. On ${h.$(60000)} single, take-home is about ${h.$(h.run(60000).annual.net)} a year. Texas does rely on property and sales taxes, which do not appear on a pay stub.`,
    ],
  }),
  UT: (h) => ({
    paras: [
      `Utah charges a flat ${h.top} for 2026 and then subtracts a taxpayer credit based on the federal standard deduction and dependents. The credit fades out as income rises, so lower earners pay much less than ${h.top} of income while higher earners pay close to it: about ${h.eff(40000)} at ${h.$(40000)} single and ${h.eff(120000)} at ${h.$(120000)}.`,
      `One 2026 figure for Utah, the dependent exemption, had not been published when the rates were checked, so the state page marks the estimate. Utah uses the federal Form W-4 for withholding and has no local income taxes.`,
    ],
  }),
  VT: (h) => ({
    paras: [
      `Vermont has four brackets, from ${h.low} to ${h.top}, and the jump from the first to the second is steep: ${h.low} to ${h.p(h.nth(1).rate)} at ${h.$(h.brackets[1].over)} of taxable income for single filers. On ${h.$(70000)} single, Vermont tax is about ${h.$(h.tax(70000))}, or ${h.eff(70000)} of pay.`,
      `Since July 2025 Vermont employers may withhold a small share of the state's child care contribution from wages. That line is not included in the calculator. Some 2026 Vermont figures are estimates; the state page marks them. Employees file Form W-4VT. Vermont towns do not tax income.`,
    ],
  }),
  VA: (h) => ({
    paras: [
      `Virginia's brackets have barely changed in decades, so the top rate of ${h.top} now starts at just ${h.$(h.brackets[h.brackets.length - 1].over)} of taxable income and applies to almost every worker's extra dollars. An ${h.$(h.sd.single)} standard deduction and ${h.$(h.ex.single)} exemption come off first. On ${h.$(70000)} single, Virginia tax is about ${h.$(h.tax(70000))}.`,
      `Virginia cities and counties do not tax wages. Some of Virginia's reciprocal agreements apply only to people who commute daily. Employees file Form VA-4.`,
    ],
  }),
  WA: (h) => ({
    paras: [
      `Washington has no tax on wages, but its paychecks carry two state lines that most others do not. Paid Family and Medical Leave takes about ${h.progRate("wa-pfml")} of wages up to the Social Security wage base, and the WA Cares long-term care program takes ${h.progRate("wa-cares")} of all wages. On ${h.$(80000)} those come to about ${h.progCost("wa-pfml", 80000)} and ${h.progCost("wa-cares", 80000)} a year.`,
      `Some workers have an approved exemption from WA Cares; if yours appears on your pay stub as zero, your actual take-home will be a little higher than shown. Washington's capital gains tax applies to large investment gains, not to wages, and Seattle's payroll expense tax is paid by employers.`,
    ],
    faq: ["What is WA Cares on my Washington paycheck?", `WA Cares is Washington's long-term care insurance program. In 2026 employees pay ${h.progRate("wa-cares")} of all wages, with no cap, unless they have an approved exemption.`],
  }),
  WV: (h) => ({
    paras: [
      `West Virginia cut every rate for 2026, retroactive to January 1, leaving five brackets from ${h.low} to ${h.top}. There is no standard deduction, just a ${h.$(h.ex.single)} exemption per person, and couples use the same brackets as single filers. On ${h.$(60000)} single, West Virginia tax is about ${h.$(h.tax(60000))}.`,
      `A few West Virginia cities, including Charleston and Huntington, charge a small flat weekly service or user fee on people who work there. It is a few dollars a week and is not in the calculator. Employees file Form WV/IT-104.`,
    ],
  }),
  WI: (h) => ({
    paras: [
      `Wisconsin's standard deduction is generous at low incomes and disappears entirely for single filers at ${h.$(h.T.states.states.find((s) => s.id === "WI").params.sd.single[1][0])} of income, so the effective rate climbs faster than the four brackets (${h.low} to ${h.top}) suggest: about ${h.eff(40000)} at ${h.$(40000)} single and ${h.eff(120000)} at ${h.$(120000)}.`,
      `Residents of the states listed below who work in Wisconsin file Form W-220 so only their home state withholds. Wisconsin employees file Form WT-4. There are no local income taxes.`,
    ],
  }),
  WY: (h) => ({
    paras: [
      `Wyoming has no personal or corporate income tax and funds much of its budget from mineral revenue. No city or county taxes wages, and there are no state payroll deductions on the employee side.`,
      `On ${h.$(60000)} single, a Wyoming paycheck keeps about ${h.$(h.run(60000).annual.net)} a year after federal income tax, Social Security and Medicare.`,
    ],
  }),
  DC: (h) => ({
    paras: [
      `The District of Columbia taxes residents on seven brackets, from ${h.low} to ${h.top}, after the federal standard deduction. Rates are relatively high in the middle: ${h.p(h.nth(3).rate)} starts at ${h.$(h.nth(3).over)} of taxable income. On ${h.$(85000)} single, D.C. income tax is about ${h.$(h.tax(85000))}, or ${h.eff(85000)} of pay.`,
      `D.C.'s income tax is the only local layer; there is no separate city tax. Federal law bars D.C. from taxing people who work there but live elsewhere, so commuters from Maryland and Virginia pay their home state instead, and D.C. residents working in those states are taxed only by D.C. D.C. paid family leave is funded by employers. Residents file Form D-4.`,
    ],
  }),
};

function reciprocitySentence(ctx, state) {
  const list = ctx.tables.states.reciprocity?.[state.id] || [];
  if (!state.wageTax) return "";
  if (!list.length) return `<p><strong>Reciprocity:</strong> ${esc(state.name)} has no reciprocal agreements with other states. If you live in one state and work in another, you generally pay tax where you work and claim a credit for it at home; this calculator taxes only the state you select. See <a href="/guides/working-in-another-state/">working in one state and living in another</a>.</p>`;
  const names = list.map((id) => (id === "DC" ? "the District of Columbia" : ctx.byId[id]?.name || id));
  const subject = state.id === "DC" ? "The District of Columbia" : esc(state.name);
  const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `<p><strong>Reciprocity:</strong> ${subject} has agreements with ${esc(joined)}. Under them, a resident of one state who works in the other can ask the employer to withhold only for the home state, using that state's exemption form. See <a href="/guides/working-in-another-state/">working in one state and living in another</a>.</p>`;
}

export function stateExplainer(ctx, state) {
  const write = WRITERS[state.id];
  if (!write) throw new Error(`state-explainers: no explainer for ${state.id}`);
  const h = helpers(ctx, state);
  const out = write(h);
  const html = `${out.paras.map((para) => `<p>${para}</p>`).join("")}${reciprocitySentence(ctx, state)}`;
  return { html, faq: out.faq || null };
}

export const EXPLAINER_IDS = Object.keys(WRITERS);
