# -*- coding: utf-8 -*-
# Content blocks for the AdSense content pass (Oct 7, 2026). All figures come from the
# site's own engine/data (computed with js/engine.mjs) or verified IRS/SSA sources.

IRS_RP = '<a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" rel="noopener">IRS Rev. Proc. 2025-32</a>'
SSA_CBB = '<a href="https://www.ssa.gov/oact/cola/cbb.html" rel="noopener">Social Security Administration</a>'
TF = '<a href="https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/" rel="noopener">Tax Foundation, State Individual Income Tax Rates and Brackets, 2026</a>'
TWE = '<a href="https://www.irs.gov/individuals/tax-withholding-estimator" rel="noopener">IRS Tax Withholding Estimator</a>'
P15T = '<a href="https://www.irs.gov/publications/p15t" rel="noopener">IRS Publication 15-T</a>'
OT_QA = '<a href="https://www.irs.gov/newsroom/questions-and-answers-about-the-new-deduction-for-qualified-overtime-compensation" rel="noopener">IRS questions and answers on the overtime deduction</a>'
N2567 = '<a href="https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500" rel="noopener">IRS, 2026 retirement plan limits (Notice 2025-67)</a>'
FLSA = '<a href="https://www.dol.gov/agencies/whd/overtime" rel="noopener">U.S. Department of Labor, overtime pay</a>'
W4 = '<a href="https://www.irs.gov/forms-pubs/about-form-w-4" rel="noopener">IRS, About Form W-4</a>'
SE = '<a href="https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes" rel="noopener">IRS, Self-employment tax</a>'
ESTPAY = '<a href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes" rel="noopener">IRS, Estimated taxes</a>'
FUTA = '<a href="https://www.irs.gov/individuals/international-taxpayers/federal-unemployment-tax" rel="noopener">IRS, Federal unemployment (FUTA) tax</a>'
P15 = '<a href="https://www.irs.gov/publications/p15" rel="noopener">IRS Publication 15 (Circular E)</a>'

def table(head, rows, caption=None):
    cap = f'<caption class="meta" style="caption-side:bottom;padding:8px 12px">{caption}</caption>' if caption else ''
    th = ''.join(f'<th{" class=\"num\"" if i else ""}>{h}</th>' for i, h in enumerate(head))
    body = ''.join('<tr><th>' + r[0] + '</th>' + ''.join(f'<td class="num">{c}</td>' for c in r[1:]) + '</tr>' for r in rows)
    return f'<div class="table-wrap"><table>{cap}<thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'

HOME_GUIDE = f'''
      <section class="prose" id="how-it-works" data-lth="guide">
        <h2>How take-home pay is calculated in 2026</h2>
        <p>Take-home pay, or net pay, is what is left of gross pay after taxes and deductions are withheld. Every paycheck goes through the same seven steps. Here they are with the 2026 figures this calculator uses.</p>
        <h3>1. Start with gross pay for the year</h3>
        <p>A salary is used as-is. Hourly pay is the rate times hours per week times paid weeks, plus overtime at the multiplier you enter (usually 1.5 times the rate for hours over 40 in a workweek). Tips and bonuses are added on top. The calculator works out a full year so the tax brackets see your real annual income, then divides the result by the number of paychecks: 52 weekly, 26 biweekly, 24 semimonthly, or 12 monthly.</p>
        <h3>2. Subtract pre-tax deductions</h3>
        <p>Pre-tax deductions come out before some taxes, but not all of them. A traditional 401(k), 403(b), or TSP contribution lowers the wages used for federal income tax and for most state income taxes. Social Security and Medicare are still figured on the full amount. HSA contributions and Section 125 health, dental, vision, and commuter benefits usually lower both. Roth contributions come out after tax and do not lower any tax line.</p>
        <h3>3. Federal income tax</h3>
        <p>For 2026 the standard deduction is $16,100 for single filers and married people filing separately, $32,200 for married couples filing jointly, and $24,150 for heads of household ({IRS_RP}). Income above that is taxed in brackets. For a single filer, the rates are 10% on the first $12,400, 12% up to $50,400, 22% up to $105,700, 24% up to $201,775, 32% up to $256,225, 35% up to $640,600, and 37% above that. Only the dollars inside each band are taxed at that band’s rate, so a raise never lowers your take-home pay.</p>
        <h3>4. Social Security and Medicare (FICA)</h3>
        <p>Social Security is 6.2% of wages up to the 2026 wage base of $184,500 ({SSA_CBB}), so the most an employee pays for the year is $11,439. Medicare is 1.45% of all wages, with no cap. An extra 0.9% Additional Medicare tax applies to wages above $200,000 for single and head-of-household filers, $250,000 for married couples filing jointly, and $125,000 for married filing separately. For most workers, FICA comes to 7.65% of pay.</p>
        <h3>5. State income tax and state payroll programs</h3>
        <p>Nine states do not tax wages: Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, and Wyoming. The rest use either one flat rate or a set of brackets, each with its own deductions and exemptions. The calculator uses each state’s 2026 rates from the {TF}, and every <a href="/states/">state page</a> lists the brackets, deductions, and known gaps for that state. Some states also withhold employee payroll premiums. California SDI takes 1.3% of wages with no cap in 2026. New York has disability and paid family leave. Washington has paid family and medical leave and WA Cares. Colorado has FAMLI.</p>
        <h3>6. Local income tax</h3>
        <p>Some cities and counties tax wages as well, including New York City and Yonkers, Philadelphia and Pittsburgh, Detroit, Columbus and Cleveland, Baltimore City and Montgomery County in Maryland, Marion County (Indianapolis), and the Portland-area Metro and Multnomah County taxes. A local tax is added only when you select one of these places or type your own local percentage. The calculator never guesses a local rate. The <a href="/local-taxes/">local taxes guide</a> explains each one.</p>
        <h3>7. What is left is net pay</h3>
        <p>For example, a single filer earning $85,000 in California, paid biweekly with no pre-tax deductions, owes about $9,870 in federal income tax, $6,502.50 in Social Security and Medicare, $3,675.42 in California income tax, and $1,105 in California SDI for the year. That leaves about $63,847 a year, or $2,455.66 per paycheck. The same salary in Texas, which has no state income tax and no SDI, keeps about $68,628 a year, or $2,639.52 per paycheck.</p>
        <h3>What this estimate leaves out</h3>
        <p>This is an estimate of a regular paycheck, not a tax return. It does not include itemized deductions, tax credits other than the W-4 credit amount you enter, credits for tax paid to another state, wage garnishments, or property and sales tax. It also does not subtract the new federal deductions for qualified tips and overtime, which you claim on your tax return. Employers withhold using {P15T} methods, which can differ from this annualized method by a few dollars per check. Before you change your withholding, check your plan with the {TWE} or a tax professional.</p>
        <h3>Sources and updates</h3>
        <p>Federal figures come from {IRS_RP} (tax year 2026 inflation adjustments) and IRS Publication 15-T. The Social Security wage base comes from the {SSA_CBB}. State rates come from the Tax Foundation’s 2026 table and the state and city sources listed on each location page. Rates were last verified on September 27, 2026, and are reviewed again when the IRS, the SSA, or a state publishes new figures. The <a href="/methodology/">methodology page</a> has the full details, and the <a href="/about/">About page</a> explains who runs the site and how to report a correction.</p>
      </section>'''

PAYCHECK_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How to use the paycheck calculator</h2>
        <ol>
          <li><strong>Choose salary or hourly pay.</strong> For hourly pay, enter your rate, hours per week, and paid weeks. Weekly overtime hours use the multiplier you set, usually 1.5. For mixed rates, such as night differential or overtime on a differential, use “Add rate blocks.”</li>
          <li><strong>Pick a pay frequency.</strong> Weekly gives 52 checks, biweekly 26, semimonthly 24, and monthly 12. The annual tax is the same either way. Only the size of each check changes.</li>
          <li><strong>Set filing status and state.</strong> Filing status changes the standard deduction and bracket widths. The state controls the state income tax and any state payroll programs.</li>
          <li><strong>Add a city only if it taxes wages.</strong> Choose a named city or county, or type your local percentage. Say whether you live there, because many local taxes charge residents and nonresidents different rates.</li>
          <li><strong>Enter pre-tax deductions.</strong> These include 401(k), HSA, health premiums, and similar benefits. The stub shows which taxes each one reduces.</li>
          <li><strong>Optional W-4 entries.</strong> These are the Step 2 multiple-jobs checkbox, the Step 3 credit amount, other income, other deductions, and extra withholding per check.</li>
        </ol>
        <p>The result is a paycheck stub with every withholding named, a monthly and yearly figure, and a share link that saves your inputs in the address bar. Nothing is uploaded. The calculation runs on your device.</p>
        <h3>Why your real paycheck may differ</h3>
        <p>Employers use IRS Publication 15-T withholding tables, their own benefit setup, and the W-4 you filed. Some take deductions that this page does not know about, such as life insurance, wage garnishments, union dues, or a local tax that is not on the named list. If your stub and this estimate differ by more than a few dollars, compare them line by line. The difference is usually one of those items.</p>
      </section>'''

HOURLY_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How hourly pay turns into take-home pay</h2>
        <p>An hourly paycheck starts as rate times hours. To estimate tax correctly, the calculator first turns that into a yearly figure: hourly rate × hours per week × paid weeks. At $25 an hour, 40 hours a week, and 52 weeks, that is $52,000 a year. Tax brackets, the standard deduction, and state brackets are all set for a full year. Working out the year first and then dividing it into paychecks gives a much better estimate than taxing one week by itself.</p>
        <h3>Example: $25 an hour</h3>
        <p>Single filer, 40 hours a week, 52 weeks, paid biweekly, no pre-tax deductions, tax year 2026:</p>
        {table(['', 'Texas', 'Pennsylvania'], [
            ['Gross pay', '$52,000.00', '$52,000.00'],
            ['Federal income tax', '$4,060.00', '$4,060.00'],
            ['Social Security', '$3,224.00', '$3,224.00'],
            ['Medicare', '$754.00', '$754.00'],
            ['State income tax', '$0.00', '$1,596.40'],
            ['Net per year', '$43,962.00', '$42,365.60'],
            ['Net per biweekly check', '$1,690.85', '$1,629.45'],
        ], 'Educational estimate from the LocalTakehome 2026 engine. No local tax selected.')}
        <p>The only difference is Pennsylvania’s flat 3.07% income tax. Many Pennsylvania municipalities also charge a local earned income tax. Select Philadelphia or Pittsburgh, or type your local rate, to include it.</p>
        <h3>Overtime, shift differentials, and mixed rates</h3>
        <p>Under the federal Fair Labor Standards Act, most non-exempt employees must be paid at least 1.5 times their regular rate for hours over 40 in a workweek ({FLSA}). Enter your weekly overtime hours and the multiplier, and the calculator adds them to the year. If one paycheck mixes several rates, such as base hours, a night or weekend differential, hazard pay, or overtime on top of a differential, choose <strong>Add rate blocks</strong> under the hourly fields. Each block is a label, a number of hours, and an hourly rate. You can estimate a single pay period (“This pay period”) or project a full year.</p>
        <h3>Part-time hours and unpaid weeks</h3>
        <p>If you are paid for fewer than 52 weeks because of seasonal work, unpaid leave, or a school-year schedule, lower the paid weeks. Less annual income can put part of your pay in a lower bracket, so the take-home pay per check can change by more than you expect.</p>
        <h3>Tips</h3>
        <p>Reported tips count as wages for income tax and for Social Security and Medicare. The calculator adds the yearly tips you enter to gross pay. For 2025 through 2028, federal law also lets eligible workers deduct up to $25,000 of qualified tips on their tax return. That deduction shrinks once modified adjusted gross income passes $150,000 ($300,000 for joint filers). You claim it on your return, or you can reflect it on Form W-4 Step 4(b). It is not subtracted from this paycheck estimate, and tips still owe Social Security and Medicare.</p>
      </section>'''
HOURLY_FAQ = [
    ("How do I convert an hourly wage to a yearly salary?", "Multiply the hourly rate by the hours you work each week, then by the weeks you are paid. At 40 hours and 52 weeks, that is 2,080 hours, so $20 an hour is $41,600 a year before tax."),
    ("How much is $20 an hour after taxes?", "For a single filer in Florida working 40 hours a week for 52 weeks, this estimate comes to about $35,606 a year after federal income tax, Social Security, and Medicare, or about $1,369.45 per biweekly paycheck. States with an income tax will be lower."),
    ("Are hourly workers taxed differently from salaried workers?", "No. Hourly and salaried pay are both wages and use the same federal brackets, FICA rates, and state rules. The only difference is how gross pay is figured."),
    ("Is overtime taxed at a higher rate?", "No. Overtime is regular wages. It is added to your other pay and taxed at your normal rates. A large overtime check can look heavily taxed because payroll treats that one check as if every check were that large."),
]

OVERTIME_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How overtime is paid and taxed</h2>
        <p>Under the federal Fair Labor Standards Act (FLSA), non-exempt employees must be paid at least one and a half times their regular rate for every hour over 40 in a workweek ({FLSA}). Some states require more. California, for example, also requires overtime after eight hours in a single workday. Salaried employees who meet the FLSA tests for exempt status are generally not owed overtime.</p>
        <p>There is no special tax rate for overtime on a paycheck. Overtime is regular wages. It is added to the rest of your pay and withheld at your normal federal and state rates, plus 6.2% Social Security and 1.45% Medicare. A big overtime week can look heavily taxed because payroll systems treat that one check as if every check that year were the same size. The extra withholding usually evens out when you file your return.</p>
        <h3>Example: $28 an hour with 5 overtime hours a week</h3>
        <p>Single filer in Texas, paid weekly, 40 regular hours plus 5 overtime hours at 1.5× every week. Overtime pays $42 an hour, so the 5 hours add $210 a week, or $10,920 over 52 weeks. Gross pay rises from $58,240 to $69,160. Federal income tax rises by about $1,576 and Social Security and Medicare by about $835. That leaves about $8,508 more take-home pay for the year, or $163.62 more per weekly check. That is roughly 78 cents of each overtime dollar.</p>
        <h3>The 2025–2028 federal overtime deduction</h3>
        <p>The 2025 federal tax law created a deduction for qualified overtime compensation for tax years 2025 through 2028. It covers only the “half” in time-and-a-half, meaning the premium above your regular rate that the FLSA requires, not your whole overtime pay. The deduction is up to $12,500 per return ($25,000 for married couples filing jointly). It shrinks once modified adjusted gross income passes $150,000 ($300,000 joint). Starting in 2026, employers report qualified overtime separately on Form W-2 in box 12 with code TT. In the example above, the premium is $14 × 5 hours × 52 weeks, or $3,640 for the year.</p>
        <p>The deduction lowers federal income tax on your return. It does not lower Social Security or Medicare. Employers keep withholding as usual unless you update your Form W-4 (Step 4(b), deductions). This calculator shows the paycheck as it is normally withheld, so it does not subtract the deduction. Your tax bill at filing time may be lower than your withholding suggests. Details are in the {OT_QA}.</p>
      </section>'''
OVERTIME_FAQ = [
    ("Is overtime taxed more than regular pay?", "No. It is taxed at the same rates as the rest of your wages. Extra withholding on a large overtime check is a payroll timing effect, and it is settled when you file your return."),
    ("Does “no tax on overtime” mean nothing is withheld from my overtime?", "No. For 2025 through 2028, eligible workers can deduct the overtime premium (up to $12,500, or $25,000 joint) on their federal return. Overtime is still subject to withholding, Social Security, and Medicare, and usually to state income tax."),
    ("Who is entitled to overtime pay?", "Under federal law, non-exempt employees covered by the FLSA must get at least 1.5 times their regular rate for hours over 40 in a workweek. Many salaried professional, executive, and administrative employees are exempt. State law can add daily overtime or other rules."),
    ("Why does the calculator spread my overtime over the whole year?", "Tax brackets apply to a full year. Treating your typical weekly overtime as part of annual pay gives a steadier estimate of what each check keeps. A single heavy week will have more withheld than this average."),
]

K401_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How a traditional 401(k) changes your paycheck</h2>
        <p>A traditional 401(k) contribution comes out of your pay before federal income tax, and before state income tax in most states. That lowers your taxable wages, so your income tax goes down. Social Security and Medicare are still figured on your full pay. As a result, your paycheck shrinks by less than the amount you contribute.</p>
        <h3>Example: $120,000 salary in Texas</h3>
        {table(['Contribution', 'Saved per year', 'Federal tax', 'FICA', 'Net per year', 'Net per check'], [
            ['0%', '$0.00', '$17,570.00', '$9,180.00', '$93,250.00', '$3,586.54'],
            ['6%', '$7,200.00', '$15,986.00', '$9,180.00', '$87,634.00', '$3,370.54'],
            ['10%', '$12,000.00', '$14,930.00', '$9,180.00', '$83,890.00', '$3,226.54'],
        ], 'Single filer, biweekly, tax year 2026. Educational estimate from the LocalTakehome engine.')}
        <p>Saving 10% puts $12,000 a year into the account but lowers take-home pay by only $9,360, because federal income tax drops by $2,640. At this salary your top dollars are taxed at 22%, so each $100 you contribute costs about $78 of take-home pay. In a state with an income tax, the cost is even lower.</p>
        <h3>2026 contribution limits</h3>
        <p>For 2026, employees can defer up to $24,500 into a 401(k), 403(b), governmental 457 plan, or the federal Thrift Savings Plan. Workers 50 and older can usually add an $8,000 catch-up contribution. Workers who are 60 to 63 in 2026 may be able to add up to $11,250 instead, if the plan allows it ({N2567}). This tool does not add catch-up contributions automatically. Enter them as a dollar amount on the main calculator.</p>
        <h3>Exceptions worth knowing</h3>
        <ul>
          <li><strong>Pennsylvania</strong> does not exclude employee 401(k) contributions from state taxable wages, so the state line does not fall. <strong>New Jersey</strong> also taxes them at the state level.</li>
          <li><strong>Philadelphia and Detroit</strong> local wage taxes are figured on gross wages, so a 401(k) does not lower them.</li>
          <li><strong>Roth 401(k)</strong> contributions are taken out after tax. They lower your paycheck dollar for dollar today, and qualified withdrawals later are tax-free.</li>
          <li><strong>Employer matching</strong> contributions are not part of your paycheck and do not change take-home pay.</li>
        </ul>
      </section>'''
K401_FAQ = [
    ("Does a 401(k) lower Social Security and Medicare taxes?", "No. Traditional 401(k) deferrals reduce wages for income tax only. Social Security and Medicare are still withheld on the full amount."),
    ("How much will my paycheck drop if I contribute 5%?", "Less than 5% of your gross pay, because your income tax also falls. The table on this page shows the change at 0%, 3%, 5%, 6%, 10%, and 15% for the salary and state you enter."),
    ("What is the 401(k) limit for 2026?", "$24,500 in employee deferrals. People 50 and older can usually add $8,000 more, and people 60 to 63 may be able to add up to $11,250 if their plan allows it."),
]

EMPLOYER_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>What employers pay on top of salary</h2>
        <p>A salary is not the whole cost of an employee. The employer also pays its own share of payroll taxes and whatever benefits it offers. This tool adds up the parts that can be stated with confidence.</p>
        <ul>
          <li><strong>Social Security (employer share):</strong> 6.2% of wages up to the 2026 wage base of $184,500. That is the same amount withheld from the employee.</li>
          <li><strong>Medicare (employer share):</strong> 1.45% of all wages. The 0.9% Additional Medicare tax on high earners is paid by the employee only. Employers do not match it.</li>
          <li><strong>FUTA:</strong> The federal unemployment tax is 6.0% of the first $7,000 of each employee’s wages. Employers that pay state unemployment tax on time usually get a credit of up to 5.4%, which brings the net rate to 0.6%, or $42 per employee per year. Employers in a “credit reduction” state pay more ({FUTA}).</li>
          <li><strong>State unemployment (SUTA):</strong> The state sets this rate for each employer, based on its history, and it applies only up to a state wage base. The tool leaves it at zero until you enter your rate.</li>
          <li><strong>State paid-leave programs:</strong> Some states charge employers part of a paid family or medical leave premium. One example is Colorado FAMLI, which is included when you choose Colorado.</li>
          <li><strong>Benefits:</strong> Employer retirement contributions and health insurance premiums are added as dollar amounts you enter.</li>
        </ul>
        <h3>Example: $75,000 employee in Colorado</h3>
        <p>With a $3,000 employer retirement contribution and $6,000 toward health insurance, the employer pays $4,650 in Social Security, $1,087.50 in Medicare, $42 in FUTA, and $330 for the employer share of Colorado FAMLI. Adding the benefits brings the total to about $90,109.50, which is roughly 20% above the salary, before any state unemployment tax.</p>
        <h3>What is not included</h3>
        <p>Workers’ compensation insurance, local employer taxes, payroll software or service fees, equipment, office space, training, and recruiting are not included. Paid time off is already part of the salary, so it is not counted twice. For employer filing rules, see {P15}.</p>
      </section>'''
EMPLOYER_FAQ = [
    ("How much does an employee cost on top of salary?", "At least 7.65% for the employer share of Social Security and Medicare, plus FUTA, state unemployment, and any benefits. In the Colorado example on this page, payroll taxes and $9,000 of benefits bring a $75,000 salary to about $90,110, roughly 20% more."),
    ("Does the employer pay the Additional Medicare tax?", "No. The 0.9% Additional Medicare tax on wages above $200,000 is withheld from the employee only. The employer does not match it."),
    ("Why is state unemployment blank?", "Each state sets an experience-based rate for each employer, often with a separate rate for new employers. A made-up rate would be misleading, so the tool waits for you to enter yours."),
]

RAISE_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How much of a raise you actually keep</h2>
        <p>A raise is taxed at your <em>marginal</em> rate, which is the rate on your last dollars of income. It is not taxed at your average rate. That is why a 10% raise does not mean a 10% bigger deposit. The new dollars land in your highest bracket and pay Social Security, Medicare, and any state and local tax on top.</p>
        <h3>Example: $80,000 to $88,000 in Illinois</h3>
        <p>A single filer paid biweekly gets an $8,000 raise. Federal income tax rises by $1,760 (22% of the raise). Social Security and Medicare rise by $612 (7.65%). Illinois income tax rises by $396 (4.95%). Take-home pay goes up by $5,232 a year, or $201.24 per biweekly check. That is about $65.40 of every $100 of the raise.</p>
        <h3>Myth: a raise can push you into a higher bracket and lower your pay</h3>
        <p>That does not happen with federal income tax brackets. Only the dollars above a bracket threshold are taxed at the higher rate. Everything below is taxed the same as before. A raise always increases net pay under the federal brackets. A few benefit programs and credits have income cliffs, but those are not part of a paycheck.</p>
        <h3>Things that change how much you keep</h3>
        <ul>
          <li><strong>The Social Security wage base.</strong> Once wages pass $184,500 in 2026, the 6.2% Social Security tax stops, so you keep more of each additional dollar for the rest of the year.</li>
          <li><strong>State brackets.</strong> In states with graduated brackets, a raise can also move your top dollars into a higher state rate. In states with no income tax, you keep more of the raise.</li>
          <li><strong>Pre-tax savings.</strong> If you contribute a percentage to a 401(k), part of the raise goes to savings automatically and lowers the income tax on the rest.</li>
        </ul>
      </section>'''
RAISE_FAQ = [
    ("Can a raise make me take home less money?", "Not because of federal income tax brackets. Only the income above each threshold is taxed at the higher rate, so net pay always rises when gross pay rises."),
    ("What is a marginal tax rate?", "It is the combined rate on your next dollar of income: your federal bracket, plus Social Security and Medicare, plus your state and local rates. The raise calculator shows the share of each new $100 you keep after all of them."),
    ("Why is my raise smaller on the paycheck than I expected?", "The raise is taxed at your highest rates. Percentage-based deductions, such as a 401(k) set as a percent of pay, also grow with your pay."),
]

COMPARE_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>Comparing two job offers or two places</h2>
        <p>Two offers with the same salary can lead to very different deposits. Federal income tax and FICA are the same everywhere in the U.S., so the gap comes from state income tax, state payroll programs, and local wage taxes. This tool runs both offers through the same 2026 engine with the same filing status and pay frequency, so the only differences are the ones you change.</p>
        <h3>Example: $85,000 in Texas or California</h3>
        <p>A single filer paid biweekly with no deductions keeps about $68,627.50 a year in Texas, or $2,639.52 per check. In California, the same salary keeps about $63,847.08, or $2,455.66 per check. The $4,780.42 yearly difference is California income tax ($3,675.42) plus California SDI ($1,105). The federal tax and FICA lines are identical.</p>
        <h3>What a fair comparison should also include</h3>
        <ul>
          <li><strong>Cost of living.</strong> Housing, commuting, insurance, and sales and property taxes often matter more than the tax difference. None of these appear on a paycheck.</li>
          <li><strong>Living in one state and working in another.</strong> Usually your home state taxes all your income and gives a credit for tax paid to the state where you work. Some neighboring states have reciprocity agreements, so only your home state withholds. This tool taxes each offer only in the state you pick for it.</li>
          <li><strong>Local taxes.</strong> A city wage tax, such as New York City, Philadelphia, or Detroit, can be the biggest single difference between two offers in the same state. Pick the city on the side where it applies.</li>
          <li><strong>Benefits.</strong> Employer health premiums, retirement matching, and paid leave differ between offers, and they can be worth thousands of dollars a year.</li>
        </ul>
      </section>'''
COMPARE_FAQ = [
    ("Why is federal tax the same in both columns?", "Federal income tax, Social Security, and Medicare do not depend on where you live. Only state, state payroll, and local lines change when you move."),
    ("Which states have no income tax on wages?", "Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, and Wyoming do not tax wages. Washington does have payroll premiums for paid leave and long-term care."),
    ("Does this include cost of living?", "No. It compares taxes withheld from pay. Rent, home prices, commuting, and sales and property taxes are outside the paycheck and are not included."),
]

CONTRACTOR_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How contractor (1099) income is taxed compared with W-2 pay</h2>
        <p>A W-2 employee splits Social Security and Medicare with the employer, and each side pays 7.65%. An independent contractor pays both halves as self-employment tax: 12.4% for Social Security up to the 2026 wage base of $184,500, plus 2.9% for Medicare on all net earnings, for 15.3% in total. Self-employment tax is figured on 92.35% of net profit, which is income minus business expenses. Half of it is then deducted before income tax ({SE}).</p>
        <h3>Example: $100,000 in Texas with $8,000 of expenses</h3>
        <p>As a W-2 employee, a single filer keeps about $79,180 a year after federal income tax and FICA. As a contractor with the same $100,000 in gross receipts and $8,000 of business expenses, self-employment tax is about $12,999. That is 15.3% of 92.35% of the $92,000 profit. Federal income tax is lower, about $9,980, because of the expenses and the half-of-SE-tax deduction. Net income after expenses and tax is about $69,021. That is roughly $10,000 less than the W-2 offer, and it comes before the contractor pays for health insurance or retirement savings on their own.</p>
        <h3>Quarterly estimated taxes</h3>
        <p>Nobody withholds tax from contractor pay, so the IRS expects quarterly estimated payments. For most people they are due around April 15, June 15, September 15, and January 15 of the next year ({ESTPAY}). The tool shows a rough quarterly set-aside, which is the estimated yearly tax divided by four. It is not a Form 1040-ES voucher.</p>
        <h3>What this comparison leaves out</h3>
        <p>The qualified business income deduction is not included, so a contractor’s income tax may be overstated. Health insurance, retirement contributions, state disability coverage, and business costs beyond the expense figure you enter are not included either. When you compare a contractor rate with a salary, remember that a W-2 job may also include paid time off, an employer retirement match, and part of your health premiums.</p>
      </section>'''
CONTRACTOR_FAQ = [
    ("What is the self-employment tax rate for 2026?", "15.3% of 92.35% of net self-employment earnings: 12.4% Social Security on earnings up to $184,500 and 2.9% Medicare on all of it. A 0.9% Additional Medicare tax applies above the filing-status threshold."),
    ("How much more should a contractor charge than a W-2 salary?", "It depends on benefits and expenses. The contractor pays the employer’s half of FICA, about 7.65%, plus their own insurance, retirement savings, unpaid time off, and business costs. This tool shows the tax difference only."),
    ("Do contractors have to pay quarterly taxes?", "Usually yes, if they expect to owe $1,000 or more for the year. Payments are generally due in April, June, September, and January."),
]

BONUS_EXTRA = f'''
      <section class="prose" data-lth="guide">
        <h2>Example: a $5,000 bonus on a $70,000 salary in New York</h2>
        <p>A single filer paid biweekly, with no city selected, gets a $5,000 bonus. Under the aggregate method, the bonus adds $1,100 of federal income tax (22%), $310 of Social Security, $72.50 of Medicare, $270 of New York State income tax, and $21.60 of New York payroll premiums. About $3,225.90 of the bonus is left. A flat 22% supplemental withholding would also withhold $1,100 of federal tax, so both methods match at this income.</p>
        <h3>When the two methods differ</h3>
        <p>If your salary puts your top dollars in the 10% or 12% bracket, a flat 22% withholds more federal tax than the bonus will actually cost you, and the difference comes back as a refund. If your top dollars are taxed at 24% or more, a flat 22% withholds too little, and you may owe the difference when you file. Supplemental wages over $1 million in a year must be withheld at 37% ({P15}). Social Security, Medicare, and state tax apply to a bonus the same way they apply to regular pay.</p>
      </section>'''

W4_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>How each step of Form W-4 changes your paycheck</h2>
        <ul>
          <li><strong>Step 1, filing status:</strong> sets the standard deduction and bracket widths used for withholding. In 2026 the standard deduction is $16,100 single, $32,200 married filing jointly, and $24,150 head of household.</li>
          <li><strong>Step 2, multiple jobs or a working spouse:</strong> when checked, each job withholds as if it gets only half the standard deduction and half-width brackets. This raises withholding so two incomes are not each taxed as if they were the only one.</li>
          <li><strong>Step 3, dependents and other credits:</strong> a dollar amount for the year, such as $2,200 for each qualifying child under 17. It lowers federal withholding by the same amount spread over the year’s paychecks.</li>
          <li><strong>Step 4(a), other income:</strong> income without withholding, such as interest or a side job, so tax on it is collected through your paycheck.</li>
          <li><strong>Step 4(b), deductions:</strong> expected deductions beyond the standard deduction. For 2025 through 2028, the IRS worksheet for this step also covers the new deductions for qualified tips, qualified overtime, car loan interest, and the additional deduction for people 65 and older.</li>
          <li><strong>Step 4(c), extra withholding:</strong> a flat dollar amount withheld from every check. It does not change the bracket calculation.</li>
        </ul>
        <h3>When to update your W-4</h3>
        <p>Review your W-4 when you start a new job, get married or divorced, have a child, add a second job, start earning overtime or tips, or get a large refund or tax bill. Your employer uses the newest W-4 you give them. A state may have its own withholding form, and changing your federal W-4 does not always change state withholding.</p>
        <p>The W-4 has not used allowances since 2020, so answers like “claim 0 or 1” no longer apply. For a full check of your year, including other income and credits, use the {TWE}. The form and its instructions are at {W4}.</p>
      </section>'''
W4_FAQ = [
    ("Should I claim 0 or 1 on my W-4?", "The current W-4 has no allowances. Instead, you check a box for multiple jobs, enter a dollar amount of credits, list other income or deductions, and can add extra withholding per check."),
    ("Why did checking Step 2 lower my paycheck?", "Step 2 tells payroll that you have another job or a working spouse. Each job then withholds as if it gets only half of the standard deduction and narrower brackets, which raises withholding."),
    ("Does the W-4 change my actual tax?", "No. It changes how much is withheld during the year. Your actual tax is figured on your return. Too little withholding means a balance due, and too much means a refund."),
]

MAP_GUIDE = f'''
      <section class="prose" data-lth="guide">
        <h2>Why take-home pay varies by state</h2>
        <p>At $80,000, a single filer pays the same federal income tax ($8,770) and the same Social Security and Medicare ($6,120) in every state. Every difference on this list comes from state income tax and state payroll programs. In states with no wage tax, such as Alaska, Florida, Nevada, and Texas, the estimate is about $65,110 a year. At the bottom of the list, Oregon, Hawaii, and California keep roughly $58,860 to $60,860. In those states, relatively high rates start at modest incomes, and California adds its 1.3% SDI payroll premium.</p>
        <h3>What this map does not show</h3>
        <ul>
          <li><strong>Local wage taxes.</strong> City and county taxes are left out so every state is compared the same way. In places like New York City, Philadelphia, or Detroit, a local tax can lower net pay by another 2% to 4% of wages. The <a href="/local-taxes/">local taxes guide</a> lists them.</li>
          <li><strong>Other filing statuses and incomes.</strong> The order can change at other incomes. Flat-tax states compare differently with graduated states as income rises.</li>
          <li><strong>Cost of living.</strong> A state with no income tax may have higher property or sales taxes, housing, or insurance costs. None of those are on a paycheck.</li>
        </ul>
        <p>Select a state to open its calculator, its 2026 brackets, and example take-home pay at several salaries.</p>
      </section>'''
MAP_FAQ = [
    ("Which state has the highest take-home pay?", "At the same salary, eight states without a wage income tax tie at the top: Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, and Wyoming. Washington also has no wage income tax, but at $80,000 it keeps about $1,110 less because of its paid leave and WA Cares premiums."),
    ("Why does a no-tax state still take 18% of my pay?", "Federal income tax and FICA apply everywhere. At $80,000, they come to about $14,890 for a single filer before any state tax."),
]
