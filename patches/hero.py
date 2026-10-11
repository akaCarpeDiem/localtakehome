# -*- coding: utf-8 -*-
"""Oct 7 (owner): homepage hero blurb + strip partner/ad placeholder code. Idempotent.
Run AFTER header.py. Never apply to localtakehome-src builds; patch the deploy folder."""
import os, re, sys
ROOT = sys.argv[1]
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

BLURB = ('Many states let cities and counties add their own income tax, so take-home pay depends on where you live '
         'within the state. Set your city or county below, and add rate blocks for shift differentials if you’re paid hourly.')
OLD_LEDE = '<p class="lede">Federal, FICA, state, and local taxes — based on where you live.</p>'
NEW_LEDE = f'<p class="lede" data-lth="hero-blurb">{BLURB}</p>'
s = rd('index.html')
if 'data-lth="hero-blurb"' not in s:
    assert s.count(OLD_LEDE) == 1
    wr('index.html', s.replace(OLD_LEDE, NEW_LEDE)); print('hero blurb added')
s = rd('index.html')
if 'data-lth="hero-blurb">' + BLURB not in s:  # wording updated
    s = re.sub(r'<p class="lede" data-lth="hero-blurb">[^<]*</p>', NEW_LEDE, s, count=1)
    wr('index.html', s); print('hero blurb text refreshed')
css = rd('css/site.css')
if 'lth-hero-blurb' not in css:
    css = css.rstrip('\n') + '''

/* lth-hero-blurb: homepage blurb under the H1 stays ~2 lines on desktop so the calculator keeps its place */
.lede[data-lth="hero-blurb"] { max-width: 62rem; }
@media (max-width: 600px) { .lede[data-lth="hero-blurb"] { font-size: 16px; line-height: 1.45; } }
'''
    wr('css/site.css', css); print('hero blurb css added')

# partner cards / ad boxes: remove the injecting code, keep the module's exports so imports never break
STUB = '''/** Partner cards and "Advertisement" placeholder boxes were removed for good (Oct 7, 2026).
 *  These no-op exports only keep old imports working. Real ads come from the AdSense script in <head>. */
export const PLACEMENTS_LIVE = false;
export const PARTNERS = {};
export function partnerCard() { return ""; }
export function partnerRow() { return ""; }
export function adSlot() { return ""; }
export function monetize() { return ""; }
export function pickPartnerKeys() { return []; }
export function renderPartners(host) {
  if (!host) return;
  host.innerHTML = "";
  host.hidden = true;
}
'''
if rd('js/partners.mjs') != STUB:
    wr('js/partners.mjs', STUB); print('partners.mjs stubbed')
c = rd('js/calculator.mjs')
c2 = c.replace('      <div data-partners class="partner-row no-print" hidden></div>\n', '').replace('      ${adSlot()}\n', '')
if c2 != c: wr('js/calculator.mjs', c2); print('calculator.mjs partner host + ad slot removed')

def verify(root):
    bad = []
    for dp, dn, fn in os.walk(root):
        if '/.publish' in dp or '/node_modules' in dp: continue
        for f in fn:
            if not f.endswith(('.html', '.mjs', '.js')): continue
            t = open(os.path.join(dp, f), encoding='utf-8').read()
            for needle in ('partner-card', 'ad-slot', 'See partner', 'href="#partner"', '"Tax software"', '"Savings account"', '>Advertisement<', 'data-partners class'):
                if needle in t: bad.append((f'{dp}/{f}', needle))
    assert not bad, bad
    assert 'data-lth="hero-blurb">' + BLURB in open(os.path.join(root, 'index.html'), encoding='utf-8').read()
    assert 'lth-hero-blurb' in open(os.path.join(root, 'css/site.css'), encoding='utf-8').read()
    print('hero/partners verify OK')
verify(ROOT)
