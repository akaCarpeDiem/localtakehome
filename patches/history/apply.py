# -*- coding: utf-8 -*-
import os, re, json, html, sys
sys.path.insert(0, os.path.dirname(__file__))
import content as C, pages as P
ROOT = sys.argv[1]
DOMAIN = 'https://localtakehome.com'
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(os.path.join(ROOT, p)) or ROOT, exist_ok=True)
    open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)
log = []

def faq_html(items):
    return '<section class="faq" data-lth="faq"><h2>Questions</h2>' + ''.join(
        f'<details><summary>{html.escape(q, quote=False)}</summary><p>{html.escape(a, quote=False)}</p></details>' for q, a in items) + '</section>'
def faq_ld(items):
    d = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>'

def set_meta(s, title=None, desc=None):
    if title:
        s = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', s, count=1)
        s = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>' + title.replace('\\', ''), s, 1)
        s = re.sub(r'(<meta name="twitter:title" content=")[^"]*', r'\g<1>' + title, s, 1)
    if desc:
        for pat in [r'(<meta name="description" content=")[^"]*', r'(<meta property="og:description" content=")[^"]*', r'(<meta name="twitter:description" content=")[^"]*']:
            s = re.sub(pat, lambda m: m.group(1) + html.escape(desc), s, 1)
    return s

# ---------- 1. remove placeholder partner cards and empty ad boxes from static HTML
pages = []
for dp, dn, fn in os.walk(ROOT):
    for f in fn:
        if f.endswith('.html'): pages.append(os.path.relpath(os.path.join(dp, f), ROOT))
pages.sort()
PARTNER_RE = re.compile(r'<section class="partner-row no-print" aria-label="Partner placements">.*?</section>', re.S)
AD_RE = re.compile(r'<aside class="ad-slot no-print" data-ad-slot aria-label="Advertisement">.*?</aside>', re.S)
n = 0
for p in pages:
    s = rd(p); s2 = AD_RE.sub('', PARTNER_RE.sub('', s))
    if s2 != s: wr(p, s2); n += 1
log.append(f'removed placeholder partner/ad markup from {n} pages')

# ---------- 2. partners.mjs: no placeholder cards or empty ad boxes rendered by JS
pj = 'js/partners.mjs'; s = rd(pj)
if 'PLACEMENTS_LIVE' not in s:
    s = s.replace('/** Catalog of labeled partner placements. href is always a placeholder. */',
        '/** Partner cards and the reserved ad box stay off until real partner URLs / ad units exist.\n *  (AdSense review: placeholder "See partner" links and empty "Advertisement" boxes read as unfinished.) */\nexport const PLACEMENTS_LIVE = false;\n\n/** Catalog of labeled partner placements. href is always a placeholder. */')
    s = s.replace('export function partnerRow(keysOrCards) {\n', 'export function partnerRow(keysOrCards) {\n  if (!PLACEMENTS_LIVE) return "";\n')
    s = s.replace('export function adSlot() {\n', 'export function adSlot() {\n  if (!PLACEMENTS_LIVE) return "";\n')
    s = s.replace('  if (sample) {\n    host.innerHTML = "";', '  if (sample || !PLACEMENTS_LIVE) {\n    host.innerHTML = "";')
    wr(pj, s); log.append('partners.mjs gated with PLACEMENTS_LIVE=false')

# ---------- 3. content: home + tool pages
def insert_before_end_of_wrap(s, block):
    i = s.rfind('</main>'); j = s.rfind('</div>', 0, i)
    return s[:j] + '<div class="below">' + block + '</div>\n  ' + s[j:]

def add_guide(path, guide, faq=None, extra_desc=None, title=None):
    s = rd(path)
    if 'data-lth="guide"' in s: return
    block = guide + ('\n      ' + faq_html(faq) if faq else '')
    s = insert_before_end_of_wrap(s, block)
    if faq: s = s.replace('</head>', '  ' + faq_ld(faq) + '\n</head>', 1)
    s = set_meta(s, title, extra_desc)
    wr(path, s); log.append(f'guide added: {path}')

# home: insert guide before the FAQ
s = rd('index.html')
if 'data-lth="guide"' not in s:
    s = s.replace('\n      <section class="faq">', C.HOME_GUIDE + '\n      <section class="faq">', 1)
    s = set_meta(s, None, 'Free 2026 paycheck calculator for all 50 states and D.C. Estimate take-home pay after federal income tax, Social Security, Medicare, state tax, and local taxes such as NYC, Philadelphia, and Detroit.')
    wr('index.html', s); log.append('home guide added')

add_guide('paycheck-calculator/index.html', C.PAYCHECK_GUIDE)
s = rd('hourly-paycheck-calculator/index.html')
add_guide('hourly-paycheck-calculator/index.html', C.HOURLY_GUIDE, C.HOURLY_FAQ,
          'Free 2026 hourly paycheck calculator. Turn an hourly wage, hours, overtime, and shift differentials into take-home pay after federal, FICA, state, and local taxes.')
add_guide('overtime-calculator/index.html', C.OVERTIME_GUIDE, C.OVERTIME_FAQ,
          'See how much overtime adds to your take-home pay in 2026 after federal tax, FICA, and state tax, plus how the 2025-2028 federal overtime deduction works.')
add_guide('401k-calculator/index.html', C.K401_GUIDE, C.K401_FAQ,
          'See how a traditional 401(k) contribution changes your 2026 paycheck. Income tax falls, FICA does not. Includes the $24,500 limit and catch-up rules.')
add_guide('employer-cost-calculator/index.html', C.EMPLOYER_GUIDE, C.EMPLOYER_FAQ,
          'Estimate the full 2026 cost of an employee: salary plus employer Social Security, Medicare, FUTA, state programs, and benefits.')
add_guide('raise-calculator/index.html', C.RAISE_GUIDE, C.RAISE_FAQ,
          'See how much of a raise you keep after federal, FICA, and state taxes in 2026, and why a raise never lowers take-home pay.')
add_guide('compare/index.html', C.COMPARE_GUIDE, C.COMPARE_FAQ,
          'Compare two job offers or two locations side by side. 2026 take-home pay after federal, FICA, state, and city taxes.')
add_guide('contractor-vs-w2/index.html', C.CONTRACTOR_GUIDE, C.CONTRACTOR_FAQ,
          'Compare 1099 contractor and W-2 take-home pay for 2026: self-employment tax, expenses, income tax, and quarterly estimated payments.')
add_guide('bonus-calculator/index.html', C.BONUS_EXTRA)
add_guide('w4-calculator/index.html', C.W4_GUIDE, C.W4_FAQ,
          'See how each step of the 2026 Form W-4 changes your paycheck withholding: multiple jobs, credits, other income, deductions, and extra withholding.')
add_guide('map/index.html', C.MAP_GUIDE, C.MAP_FAQ)

# ---------- 4. state pages: data-driven 2026 rate section (same data the calculator uses)
st = json.load(open(os.path.join(ROOT, 'data/states-2026.json')))
def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower().replace('.', '')).strip('-')
def clean(t):
    if not t: return t
    for a, b in [('in state-payroll-2026.json, not in this rate', 'a separate payroll line, not part of this rate'),
                 ('live in local-2026.json', 'are separate local options in the calculator'),
                 ('in the local file', 'in the calculator’s local-tax list'), ('in the payroll file yet', 'in the calculator yet'),
                 ('in the payroll file', 'in the calculator’s state payroll lines'), ('in the launch file', 'in the calculator yet'),
                 ('local-2026.json', 'the local-tax list')]:
        t = t.replace(a, b)
    return t
def money(x): return '${:,.0f}'.format(x)
def pct(r):
    s = ('%.3f' % (r * 100)).rstrip('0').rstrip('.'); return s + '%'
FS = {'single': 'single', 'mfj': 'married filing jointly', 'mfs': 'married filing separately', 'hoh': 'head of household'}
def bracket_rows(br):
    rows = []
    for i, b in enumerate(br):
        hi = br[i + 1]['over'] if i + 1 < len(br) else None
        rng = (f'{money(b["over"])} to {money(hi)}' if hi is not None else f'Over {money(b["over"])}')
        rows.append([rng, pct(b['rate'])])
    return rows
nstate = 0
for sd in st['states']:
    slug = slugify(sd['name']) + '-paycheck-calculator'
    path = f'{slug}/index.html'
    if not os.path.exists(os.path.join(ROOT, path)): log.append('MISSING state page ' + path); continue
    s = rd(path)
    if 'data-lth="state-rates"' in s: continue
    name = sd['name']; typ = sd['type']
    parts = [f'<section class="prose" data-lth="state-rates"><h2>{name} income tax rules used for 2026</h2>']
    if typ in ('none', 'capital-gains-only'):
        parts.append(f'<p>{html.escape(clean(sd.get("why") or ""))}</p>')
        if typ == 'capital-gains-only' or (sd.get('notes') and sd.get('notes') != sd.get('why')):
            parts.append(f'<p>{html.escape(clean(sd["notes"]))}</p>')
        parts.append(f'<p>Because there is no state wage tax, the difference between a {name} paycheck and one in a taxed state is the state income-tax line, plus any state payroll premiums and local taxes. Use the <a href="/compare/">compare tool</a> to see the two side by side.</p>')
    else:
        parts.append(f'<p>{html.escape(clean(sd.get("why") or ""))}</p>')
        brs = sd.get('brackets') or {}
        if typ == 'flat':
            rate = pct(sd.get("rate") or brs["single"][0]["rate"])
            first = (brs.get("single") or [{"over": 0}])[0]["over"]
            if first:
                jt = (brs.get("mfj") or [{"over": first}])[0]["over"]
                parts.append(f'<p><strong>Rate:</strong> a flat {rate} on taxable income above {money(first)} for single filers' + (f' ({money(jt)} for joint filers)' if jt != first else '') + '. Income below that threshold is taxed at 0%.</p>')
            else:
                parts.append(f'<p><strong>Rate:</strong> a flat {rate} on taxable income for every filing status.</p>')
        else:
            head = ['Taxable income (single)', 'Rate']
            parts.append(C.table(head, bracket_rows(brs['single']), f'{name} brackets for single filers as used by this calculator, tax year 2026.'))
            if brs.get('mfj') and brs['mfj'] != brs['single']:
                parts.append('<p></p>' + C.table(['Taxable income (married filing jointly)', 'Rate'], bracket_rows(brs['mfj']), f'{name} brackets for joint filers as used by this calculator, tax year 2026.'))
        facts = []
        sdd = sd.get('standardDeduction')
        if sdd: facts.append(f'Standard deduction: {money(sdd["single"])} single, {money(sdd["mfj"])} married filing jointly' + (f', {money(sdd["hoh"])} head of household' if sdd.get('hoh') and sdd['hoh'] not in (sdd['single'], sdd['mfj']) else '') + '.')
        else: facts.append(f'{name} does not subtract a standard deduction from income in this calculation.')
        pe = sd.get('personalExemption')
        if pe and (pe.get('single') or pe.get('dependent')):
            kind = 'credit' if pe.get('kind') == 'credit' else 'exemption'
            bits = []
            if pe.get('single'): bits.append(f'{money(pe["single"])} single, {money(pe["mfj"])} joint')
            if pe.get('dependent'): bits.append(f'{money(pe["dependent"])} per dependent')
            facts.append(f'Personal {kind}: ' + '; '.join(bits) + ('.' if kind == 'exemption' else ' (subtracted from tax).'))
        facts.append('Traditional 401(k) contributions ' + ('reduce' if sd.get('retirementDeferralDeductible', True) else 'do <strong>not</strong> reduce') + f' {name} taxable wages in this model.')
        parts.append('<ul>' + ''.join(f'<li>{f}</li>' for f in facts) + '</ul>')
        if sd.get('notes'): parts.append(f'<p><strong>Details and simplifications:</strong> {html.escape(clean(sd["notes"]))}</p>')
        if sd.get('stubNote'): parts.append(f'<p><strong>Why this line is an estimate:</strong> {html.escape(clean(sd["stubNote"]))}</p>')
    conf = 'published figures' if sd.get('confidence') == 'published' else 'an estimate (part of the state rule is simplified, as noted above)'
    src = sd.get('source') or {}
    parts.append(f'<p class="meta">Confidence: {conf}. Source: <a href="{html.escape(src.get("url",""))}" rel="noopener">{html.escape(src.get("name",""))}</a>. Last verified {html.escape(st.get("lastVerified","September 27, 2026")) if isinstance(st.get("lastVerified"), str) and not st.get("lastVerified","").startswith("20") else "September 27, 2026"}.</p></section>')
    block = '\n        ' + ''.join(parts)
    marker = '<section class="prose"><h2>What this page includes</h2>'
    i = s.find(marker)
    if i < 0: log.append('no marker on ' + path); continue
    j = s.find('</section>', i) + len('</section>')
    s = s[:j] + block + s[j:]
    wr(path, s); nstate += 1
log.append(f'state rate sections added: {nstate}')

# ---------- 5. about / privacy / terms rewrite + new contact page
MAIN_RE = re.compile(r'<main id="main">.*?</main>', re.S)
def replace_main(path, newmain, title=None, desc=None):
    s = rd(path); s = MAIN_RE.sub(lambda m: newmain, s, 1); s = set_meta(s, title, desc); wr(path, s)
replace_main('about/index.html', P.ABOUT, 'About LocalTakehome | LocalTakehome',
             'What LocalTakehome is, how its 2026 paycheck estimates are built and sourced, who runs it, and how to report a correction.')
replace_main('privacy/index.html', P.PRIVACY, 'Privacy Policy | LocalTakehome',
             'LocalTakehome privacy policy: paycheck inputs stay in your browser. How Google AdSense advertising cookies work and how to opt out.')
replace_main('terms/index.html', P.TERMS, 'Terms of Use | LocalTakehome',
             'Terms of use for LocalTakehome: educational 2026 paycheck estimates, not tax advice; accuracy, advertising, and contact.')
if not os.path.exists(os.path.join(ROOT, 'contact/index.html')):
    s = rd('about/index.html'); s = MAIN_RE.sub(lambda m: P.CONTACT, s, 1)
    s = set_meta(s, 'Contact | LocalTakehome', 'Contact LocalTakehome at support@localtakehome.com for questions, rate corrections, privacy requests, and advertising inquiries.')
    s = s.replace('https://localtakehome.com/about"', 'https://localtakehome.com/contact"').replace('https://localtakehome.com/about/"', 'https://localtakehome.com/contact/"')
    wr('contact/index.html', s); log.append('contact page created')

# ---------- 6. footer: add Contact link everywhere
nf = 0
for p in pages + ['contact/index.html']:
    s = rd(p)
    if 'class="footer-grid"' in s and 'href="/contact' not in s.split('class="footer-grid"', 1)[1].split('</div>', 1)[0]:
        s2 = re.sub(r'(<div class="footer-grid">.*?<a href="/about/?">About</a>)', r'\1<a href="/contact">Contact</a>', s, 1, re.S)
        if s2 != s: wr(p, s2); nf += 1
log.append(f'footer Contact link added: {nf}')

# ---------- 7. trailing-slash canonical/og/sitemap/internal links (Pages 308-redirects /slug -> /slug/)
dirs = sorted(d for d in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, d, 'index.html')))
alt = '|'.join(re.escape(d) for d in sorted(dirs, key=len, reverse=True))
LINK_RE = re.compile(r'((?:href="|src="|"url":"|content="|https://localtakehome\.com)/)(' + alt + r')(?=["#?])')
allp = sorted(set(pages + ['contact/index.html']))
ns = 0
for p in allp:
    s = rd(p); s2 = LINK_RE.sub(r'\1\2/', s)
    s2 = re.sub(r'href="https://localtakehome\.com/(' + alt + r')"', r'href="https://localtakehome.com/\1/"', s2)
    if s2 != s: wr(p, s2); ns += 1
for js in ['js/view.mjs', 'js/calculator.mjs', 'js/tools.mjs', 'js/site.mjs']:
    s = rd(js); s2 = re.sub(r'(href="/)(' + alt + r')(?=["#?])', r'\1\2/', s)
    if s2 != s: wr(js, s2); log.append('slash links in ' + js)
log.append(f'trailing-slash rewrite touched {ns} html files')

# ---------- 8. email obfuscation off for the support address (Cloudflare rewrites it to [email protected])
for p in allp:
    s = rd(p)
    s2 = re.sub(r'(?<!<!--email_off-->)(<a href="mailto:support@localtakehome\.com">support@localtakehome\.com</a>)(?!<!--/email_off-->)', r'<!--email_off-->\1<!--/email_off-->', s)
    if s2 != s: wr(p, s2)

# ---------- 9. sitemap
import datetime
urls = ['/'] + [f'/{d}/' for d in dirs]
lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u in urls:
    lines.append(f'  <url><loc>{DOMAIN}{u}</loc><lastmod>2026-10-07</lastmod></url>')
lines.append('</urlset>')
wr('sitemap.xml', '\n'.join(lines) + '\n'); log.append(f'sitemap: {len(urls)} urls')
print('\n'.join(log))

# ---------- 10. replace dead official source URLs (404 as of Oct 7, 2026)
DEAD = {
    'https://www.tax.ny.gov/pit/file/nyc_rates.htm': 'https://www.tax.ny.gov/pit/file/tax-tables/',
    'https://www.tax.ny.gov/pit/file/yonkers_rates.htm': 'https://www.tax.ny.gov/pit/file/tax-tables/',
    'https://www.wcb.ny.gov/content/main/DisabilityBenefits/Employer/empBenefits.jsp': 'https://www.wcb.ny.gov/content/main/DisabilityBenefits/employer-disability-benefits.jsp',
}
nd = 0
for p in allp + ['data/local-2026.json', 'data/state-payroll-2026.json']:
    s = rd(p); s2 = s
    for a, b in DEAD.items(): s2 = s2.replace(a, b)
    if s2 != s: wr(p, s2); nd += 1
print(f'dead source links replaced in {nd} files')
