# PROJECT BRIEF: TRUETAKEHOME
## Build the best U.S. take-home pay calculator on the web

You are my product designer, frontend engineer, tax-engine engineer, SEO strategist, and copywriter. Build a complete, production-ready website called **TrueTakehome**.

This is not a generic paycheck widget. This is a polished consumer finance product: a fast, private, visually stunning take-home pay engine that calculates **federal + FICA + state + city/county/local payroll taxes + pre-tax and selected post-tax deductions**, then explains the result like a beautiful digital pay stub.

Goal: a person should prefer this over SmartAsset, ADP, PaycheckCity, Calculator.net, and the recent clone sites because it is more accurate locally, clearer, faster, more private, and much better looking.

Do not build a thin landing page with a form. Build a real multi-page product with a shared calculation engine, a distinctive design system, state/city landing pages, supporting calculators, methodology, and tasteful monetization after the answer is shown.

If you must start with an MVP, still implement the full design system, the full national calculator, the result experience, and the page templates so state/city pages can be generated from the same engine. Then expand coverage rather than shipping an ugly prototype.

---

## 1. PRODUCT POSITIONING

**Name:** TrueTakehome  
**Working domain concept:** truetakehome.com  
**One-line promise:** See what you actually take home — including the local taxes most calculators skip.

**Category:** U.S. consumer payroll / personal finance utility

**Positioning statement:**  
TrueTakehome is the most honest paycheck calculator in America. It shows federal, FICA, state, and local withholding, plus the deductions that change your stub, with every line sourced and explained. No account. No data uploaded. No bait-and-switch lead form before the number.

**Primary user jobs:**
1. “I got an offer. What hits my bank account?”
2. “I am comparing two cities or two jobs.”
3. “My stub looks wrong. Where did the money go?”
4. “If I raise my 401(k) / change filing status / take a bonus, what changes?”
5. “I am hourly / tipped / getting overtime. What is this check?”

**Differentiators that must be obvious in the UI:**
- City/county/local tax layer, not state-only.
- Line-by-line stub with named taxes, not one mysterious “taxes” lump.
- Live recalculation as the user types.
- Browser-only privacy by default.
- Public methodology with sources and last-verified dates.
- Offer comparison and “what-if” controls on the result, not buried elsewhere.
- Visual design that feels like a premium fintech product, not a 2014 calculator page covered in ads.

**Tone:**
Calm, precise, adult, slightly warm. No bro-finance. No “crush your taxes!!!” No fake testimonials. No dark patterns. Confidence comes from clarity.

**Legal posture:**
Every results view and footer must say this is an educational estimate, not tax, payroll, or financial advice, and not a substitute for an employer payroll system, CPA, or the IRS Tax Withholding Estimator. Never claim “exact paycheck” or “IRS certified.”

---

## 2. WHAT SUCCESS LOOKS LIKE

A first-time visitor on mobile should:
1. Understand the product in 2 seconds.
2. Enter pay + location in under 20 seconds.
3. See a beautiful stub update live.
4. Understand federal vs state vs local vs FICA vs benefits.
5. Be able to compare another city or raise 401(k) without leaving the page.
6. Trust the number enough to bookmark the site.
7. Only then see relevant ads/affiliates below the result.

Desktop should feel like a trading terminal for your paycheck: inputs on the left, living stub + charts on the right.

---

## 3. TECH APPROACH

Build a modern static-or-hybrid site that can run the core calculator entirely in the browser.

**Preferred stack:**
- Semantic HTML + modern CSS + vanilla JS modules (static site suitable for Cloudflare Pages / any static host).
- No required backend for the core calculator.
- Tax rates, brackets, local jurisdictions, and content in structured JSON data files so 2027 updates do not require rewriting logic.
- One shared calculation engine imported by every page.
- URL query parameters so a result is shareable and bookmarkable.
- Print CSS and client-side PDF/stub export if feasible in-browser.
- Works with JavaScript enabled. If JS is off, show a clean no-JS explanation and the methodology, not a broken form.

**Performance targets:**
- First useful calculator paint as fast as possible.
- No layout jump when the result updates.
- No jank while typing salary.
- Mobile page should feel instant.
- Images only if they are truly useful. Prefer CSS, SVG, and system/self-hosted fonts.
- Respect prefers-reduced-motion.

**Privacy / analytics:**
- Core calc never sends income, filing status, or location to a server.
- No account.
- No forced cookies banner for the calculator itself.
- If analytics exist, use privacy-respecting, cookieless or minimal analytics and never attach it to calculation inputs.
- Do not use the calculator inputs to prefill lead-gen forms unless the user explicitly opts in after seeing results.

**Accessibility:**
- WCAG 2.2 AA.
- Full keyboard use.
- Visible focus states.
- Labels on every input.
- Error text associated with fields.
- Color not the only meaning.
- Contrast on both light and dark themes.
- Screen reader announcements when the net-pay result changes, without being noisy on every keystroke. Debounce live regions.

**Responsiveness:**
- 320px to 1440px+.
- Thumb-friendly controls.
- Sticky summary bar on mobile: net per paycheck always visible after first result.

---

## 4. VISUAL DESIGN SYSTEM

Do not make another blue-gradient fintech clone. Do not use purple SaaS sludge. Do not use Comic energy. This should feel like a precise instrument on warm paper.

### 4.1 Brand atmosphere
Think: editorial payroll studio + private bank research desk + modern map studio.

- Paper / parchment surfaces
- Deep ink
- A single sharp accent
- Hairline rules like a pay stub
- Big numerals
- Quiet motion

### 4.2 Color
Create CSS variables for light and dark themes.

**Light theme:**
- Page background: warm paper #F4EFE6
- Surface: #FFFBF5
- Ink: #14110E
- Muted ink: #5E574E
- Rule/border: rgba(20,17,14,0.10)
- Accent: mineral green #0F6B4C
- Local-tax accent: deep copper #B8612F
- Federal: ink
- FICA: slate
- State: forest
- Negative/withholding bars: warm charcoal
- Net pay: accent green
- Warning/estimate note: muted amber

**Dark theme:**
- Background: #12110F
- Surface: #1C1A17
- Ink: #F3EEE4
- Accent green slightly lighter for contrast
- No glowing gradients, no glassmorphism soup

Include a theme toggle in the header. Persist preference in localStorage. Follow system preference on first visit.

### 4.3 Typography
Use two fonts only:
- Display / numbers: Fraunces or Newsreader for headlines
- UI: IBM Plex Sans or Source Sans 3
- Tabular lining figures for all money.
- Headline style: mixed case, never all-caps walls.
- Net pay number should be the largest element on the result.

Type scale:
- Display net: 40–72px
- Section titles: 22–32px
- Body: 16–18px
- Meta/source: 12–13px

### 4.4 Layout
Max content width ~1120px. Generous whitespace. Hairline dividers. 8px spacing scale.

Homepage calculator is a two-pane product card:
- Left: inputs
- Right: living stub
- Below: explanation, chart, what-ifs, comparison, FAQs, monetization

State/city pages reuse the same product card with location preselected.

### 4.5 UI components
Design these once and reuse:
- Text/number fields with suffix ($ / % / hr)
- Segmented controls: Salary | Hourly ; W-2 | Contractor
- Pill select for pay frequency
- Combobox for state and city/county
- Switch for “I live in this city” vs “I work in this city”
- Deduction rows that add/remove
- Stub line items with colored ticks
- Donut or stacked bar for “where each $100 goes”
- Comparison table
- Source chips: “IRS Pub 15-T · 2026”
- Ghost buttons, one solid CTA only when needed
- Toast for “Link copied” / “Stub downloaded”

### 4.6 Motion
- Result numbers tween quickly (150–250ms) when inputs change, unless reduced motion.
- Stub lines can fade/slide 1px.
- No bounce. No parallax. No confetti.
- The feeling is: a mechanical register updating.

### 4.7 Pay-stub visual language
The result should look like a redesigned pay stub:
- Employer-style header: “Estimated stub · Tax year 2026”
- Period, location, filing status
- Gross
- Pre-tax deductions
- Taxable wages
- Withholdings, each named
- Net
- YTD-style annualization
- Tiny source footnotes

This is the hero of the product.

### 4.8 Imagery
No stock photos. Sparse custom SVG only if useful. Prefer type, rules, and data visualization.

### 4.9 Ads / affiliates visual rules
Ads may exist, but they cannot win the first screen.  
- No interstitials.
- No ads between the salary field and the net-pay number.
- No fake “your result is ready” buttons.
- Place ads and affiliate cards below the stub, charts, and explanation.
- Affiliate cards labeled “Sponsored” or “Partner.”

---

## 5. INFORMATION ARCHITECTURE

### Global nav
Logo wordmark: TrueTakehome  
Links: Calculator, Compare offers, Bonus, Hourly, States, How it works, Privacy

Tools dropdown if needed: Bonus tax, Overtime, Raise, 401(k) impact, Employer cost, W-4 helper, Contractor vs W-2

Footer: Methodology, Sources, Privacy, Terms, Disclaimer, Contact, “Rates last verified” date, Tax year selector default 2026.

### Core pages to build now
1. `/` Homepage national calculator
2. `/paycheck-calculator` (canonical tool; homepage can redirect or share canonical)
3. `/compare`
4. `/bonus-calculator`
5. `/hourly-paycheck-calculator`
6. `/overtime-calculator`
7. `/raise-calculator`
8. `/401k-calculator`
9. `/employer-cost-calculator`
10. `/w4-calculator`
11. `/contractor-vs-w2`
12. `/states` directory of all states + DC
13. `/methodology`
14. `/privacy`
15. `/terms`
16. `/about`
17. Launch location pages (unique intro copy each):
    - `/california-paycheck-calculator`
    - `/texas-paycheck-calculator`
    - `/florida-paycheck-calculator`
    - `/new-york-paycheck-calculator`
    - `/new-york-city-paycheck-calculator`
    - `/illinois-paycheck-calculator`
    - `/pennsylvania-paycheck-calculator`
    - `/philadelphia-paycheck-calculator`
    - `/ohio-paycheck-calculator`
    - `/maryland-paycheck-calculator`
    - `/washington-paycheck-calculator`
    - `/oregon-paycheck-calculator`
    - `/massachusetts-paycheck-calculator`
    - `/georgia-paycheck-calculator`
    - `/north-carolina-paycheck-calculator`
    - `/arizona-paycheck-calculator`
    - `/colorado-paycheck-calculator`
    - `/michigan-paycheck-calculator`
    - `/detroit-paycheck-calculator`
    - `/district-of-columbia-paycheck-calculator`
18. `/local-taxes`
19. `/map` take-home map (nice to have)
20. 404 with mini calculator

Create a reusable template so adding a city is data + one page.

---

## 6. CALCULATOR UX

### Always visible inputs:
1. Pay type: Salary / Hourly
2. Gross amount (salary annual OR hourly rate + hours/week + paid weeks, default 40/52)
3. Pay frequency: Weekly / Biweekly / Semimonthly / Monthly
4. State
5. City or county (combobox). If no local tax in state, show “No local wage tax in this state” and disable.
6. Filing status: Single / MFJ / MFS / HoH
7. Tax year: 2026 default

### Secondary (progressive disclosure “Deductions & W-4” / “Local details”):
- W-4: multiple jobs, dependents $, other income, other deductions, extra withholding
- Pre-tax: Traditional 401(k)/403(b)/TSP % or $, HSA, FSA, health/dental/vision, commuter, custom
- Post-tax: Roth 401(k), union dues, custom
- Hourly extras: OT hours + multiplier (1.5x), tips/bonus this period
- Work vs reside switch; reciprocity note if different
- Custom local % fallback: “My city charges X%”

### Smart defaults:
- Biweekly, Single, 0 extras, 40 hours
- CA → include CA SDI and explain
- NYC → resident tax only when they live in NYC
- TX/FL → state income tax $0, explain

### Live result (debounce 80–120ms):
- Net per paycheck (huge), month, year, effective rate, “You keep $X of every $100”
- Stub lines: Gross → pre-tax → taxable → Federal → SS → Medicare → Addl Medicare → State → State payroll (SDI/FLI/etc) → Local by name → post-tax → Net
- Each tax line tiny “why” with one sentence + source
- Stacked bar/donut: Keep / Federal / FICA / State / Local / Benefits
- What-if chips: +1% 401(k), +$50 extra withholding, Bonus $5k, Compare another city, Raise 10%; apply scenario with reset

### Share/export:
- Copy link with query params
- Print / download stub
- Copy summary text
- No social spam

---

## 7. TAX ENGINE

Pure function: `calculateTakeHome(input) -> result`. No DOM in engine.

Data files:
- `/data/federal-2026.json`
- `/data/fica-2026.json`
- `/data/states-2026.json`
- `/data/local-2026.json`
- `/data/state-payroll-2026.json`

Each record: jurisdiction id, name, type, rates/brackets, caps, effective date, source URL, notes, lastVerified.

### Federal (verify against IRS Rev. Proc. 2025-32 / Pub 15-T):
Known 2026 figures to use (cite sources in data files):
- Standard deduction: Single/MFS $16,100; MFJ $32,200; HoH $24,150
- Brackets (Single): 10% 0–12400; 12% 12400–50400; 22% 50400–105700; 24% 105700–201775; 32% 201775–256225; 35% 256225–640600; 37% 640600+
- MFJ brackets double the lower ones approximately per IRS announcement
- Method: transparent annualized-bracket withholding estimate labeled clearly; prefer Pub 15-T percentage method if implemented correctly
- W-4 multiple jobs / dependents / extra withholding

### FICA (SSA / Pub 15 2026):
- SS 6.2% up to wage base $184,500
- Medicare 1.45% all wages
- Additional Medicare 0.9% above $200k single / $250k MFJ / $125k MFS
- Pre-tax 401(k) does NOT reduce FICA wages; HSA/health premiums often DO. Model correctly.

### State: all 50 + DC
- No wage income tax: AK, FL, NV, SD, TN, TX, WY, WA (handle WA paid leave if in data), NH nuances
- Flat and progressive
- CA SDI, NY vs NYC vs Yonkers, PA flat + local EIT, MD state+county, IN state+county, OH city where data, OR + Portland/Multnomah if included, reciprocity notes

### Local launch set (must work):
- NYC resident brackets
- Yonkers if data available
- Philadelphia resident vs nonresident EIT (cite real modeled rate, e.g. resident historically ~3.75% — verify)
- Detroit resident vs nonresident
- Representative Ohio city (Columbus or Cleveland)
- Representative Maryland county
- Representative Indiana county
- DC as jurisdiction
- Portland/Multnomah if OR page
- Custom local % fallback

Never apply NYC tax to all of NY State. Never CA tax to Texas.

### Contractor mode:
- No employee FICA withholding
- SE tax on 92.35% of net earnings
- Optional expense field, quarterly set-aside note
- Disclaimer: not Schedule C

### Pay frequency: Weekly=52, Biweekly=26, Semimonthly=24, Monthly=12. Round to cents. Document annualize-then-split vs per-period.

### Test fixtures (examples strip + methodology#tests):
1. $60k single TX biweekly no deductions
2. $85k single CA biweekly + SDI
3. $85k single NYC resident biweekly
4. $75k single Philadelphia resident
5. $20/hr 40h Florida
6. $120k single no-state-tax 10% traditional 401(k)
7. $200k single CA (Addl Medicare)
8. $5k bonus on $70k NY salary

---

## 8. ADDITIONAL TOOLS
Compare, Hourly+OT, Bonus (aggregate + optional 22% supplemental note), Raise, 401(k)/HSA impact, Employer cost, W-4 helper, Contractor vs W-2, Map table, Pay period calendar (delight), localStorage saved scenarios, Embed snippet section.

---

## 9–15. CONTENT / SEO / MONETIZATION / LEGAL
Unique titles, meta, FAQ, JSON-LD WebApplication+FAQPage+BreadcrumbList+Organization.
Methodology is trust weapon. Unique location copy 150–250 words each + example tables $40k–$150k.
Ads/affiliates ONLY below stub/charts/explanation. Placeholders labeled Sponsored/Partner.
Privacy: no account, inputs not transmitted, localStorage for theme/scenarios.
Disclaimer on every results view.

---

## 16. IMPLEMENTATION ORDER
1. Design tokens, layout, header/footer, themes
2. Data schema + federal/FICA engine + tests
3. State tax data + national UI
4. Living stub + charts + share URLs
5. Local tax data + city combobox
6. Deductions / W-4 extras
7. Homepage + examples
8. Compare, bonus, hourly, raise, 401(k), employer cost
9. State/city templates + launch location pages
10. Methodology, privacy, terms, about
11. SEO meta + JSON-LD
12. Ad/affiliate placeholders
13. Polish motion, empty states, print, 404, favicon

## 17. EXTRA POLISH
Kept/taken medal, count-up on first result only, copy stub as text, ? keyboard legend, 404 mini calc, favicon monogram T, human empty state sample, calm local-tax sentences for high-tax cities and no-state-tax states, correction CTA, changelog on methodology.

## 18. WHAT NOT TO BUILD
Email gate, fake chat, crypto/payday ads, autoplay video, blog spam, fake reviews, one local rate for whole state, unlabeled mixing of annual liability vs withholding math.

## VERIFIED 2026 FIGURES (build-time; cite in JSON comments/sources)
- SS wage base: $184,500 (SSA oact/cola/cbb)
- SS rate 6.2%, Medicare 1.45% (IRS Pub 15 2026)
- Standard deduction TY2026: Single/MFS $16,100; MFJ $32,200; HoH $24,150 (IRS newsroom Rev Proc 2025-32)
- Bracket thresholds per IRS 2026 inflation adjustments
- Supplemental withholding often 22% federal — label as method option on bonus tool

## DELIVERABLES
1. Full multi-page static site with design system
2. Working engine: federal + FICA + all states + launch locals
3. Flagship homepage
4. Supporting tools + location templates + launch pages
5. Methodology + legal
6. Original copy
7. Source comments in tax data files
8. README: modeled vs estimated, which locals are live

Ship a site someone would bookmark and send with a job offer.
