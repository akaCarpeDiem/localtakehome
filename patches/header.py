# -*- coding: utf-8 -*-
"""Restore the LocalTakehome glass header + logo-matching tagline (+ background orbs).
Regression: the Oct 4 deploy 9698ae13 was rebuilt from localtakehome-src, whose css/site.css and
js/site.mjs never received the Oct 2 deploy-only header work (glass card, Fraunces tagline, orbs).
Base CSS = Oct 2 live CSS (deployment 7edbedb4/996bc6bb, saved in lt-review/css-history/oct2c-site.css),
which differs from the regressed CSS only in header/orb rules (rate-block rules are in both).
Idempotent: marker /* lth-header-v2 */.
Oct 7: display serif switched Fraunces -> Source Serif 4 (the owner disliked Fraunces' ball-terminal "f");
marker /* lth-font-ss4 */, files from lt-review/fonts-ss4 (OFL), 600 weight preloaded on every page."""
import os, re, sys
ROOT = sys.argv[1]
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'oct2c-site.css')
CSS_VER = '20261007f2'  # bump on every CSS change; never reuse an old value (t1 got edge-cached with stale CSS)
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

css = rd('css/site.css')
if 'lth-header-v2' not in css:
    cur = css
    css = open(BASE, encoding='utf-8').read()
    # keep fixes made after Oct 2
    css = css.replace('  top: -40px;\n  background: var(--ink);', '  top: -200px;\n  background: var(--ink);')
    assert '.rate-block {' in css and '.rate-block {' in cur
    # logo ~15% smaller than the Oct 2 lockup (116-154px -> 100-132px)
    css = css.replace('  width: clamp(116px, 13vw, 154px);', '  width: clamp(100px, 11vw, 132px);')
    old_tag = css[css.index('.tagline {'):css.index('.mast-privacy')]
    new_tag = '''.tagline {
  /* lth-header-v2: tagline matches the logo lockup (charcoal "Local", teal "Takehome") */
  display: block;
  font-family: var(--font-display);
  margin: 0;
  font-size: clamp(14px, 1.2vw, 17px);
  line-height: 1.2;
  color: var(--brand-ink);
  font-weight: 600;
  letter-spacing: -0.015em;
  flex: 0 0 auto;
  max-width: none;
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
}
.tagline-live {
  color: var(--brand-teal);
  font-weight: 700;
  font-size: 1.28em;
  letter-spacing: -0.025em;
  line-height: 1;
}
'''
    css = css.replace(old_tag, new_tag)
    css = css.replace('  --ink: #14110e;\n', '  --ink: #14110e;\n  --brand-ink: #1f272c;   /* lockup charcoal */\n  --brand-teal: #0c9784;  /* lockup teal */\n', 1)
    # tablet / phone
    css = css.replace('''  .tagline { max-width: none; flex: 0 0 auto; font-size: 13px; }
  .brand-lockup { width: 116px; }''', '''  .tagline { max-width: none; flex: 0 1 auto; font-size: 14px; }
  .brand-lockup { width: 100px; }''')
    old600 = css[css.index('@media (max-width: 600px) {\n  .header-inner { flex-wrap: wrap;'):css.index('@media (max-width: 380px)')]
    new600 = '''@media (max-width: 600px) {
  .header-inner { gap: 10px; padding: 8px 12px; }
  .brand { gap: 10px; flex: 1 1 auto; min-width: 0; }
  .brand-lockup { width: 76px; }
  .tagline { white-space: normal; font-size: 13.5px; line-height: 1.18; flex: 1 1 auto; min-width: 0; max-width: 15em; }
}

'''
    css = css.replace(old600, new600)
    css = css.replace('''  .brand-lockup { width: 64px; }
  .tagline { font-size: 8.6px; }''', '''  .brand-lockup { width: 64px; }
  .tagline { font-size: 12px; }''')
    wr('css/site.css', css); print('css rebuilt from Oct 2 base with lth-header-v2')

css = rd('css/site.css')
if 'lth-header-v2-nav' not in css:
    css = css.replace('body.embed .site-header,', """/* lth-header-v2-nav: keep the desktop nav on one row beside the one-line tagline */
@media (min-width: 901px) and (max-width: 1180px) {
  .header-inner { gap: 14px; }
  .site-nav { gap: 4px 10px; }
  .site-nav a, .tools summary { font-size: 14px; }
}
@media (min-width: 901px) and (max-width: 1000px) {
  .tagline { font-size: 13px; }
  .brand { gap: 10px; }
  .brand-lockup { width: 90px; }
  .site-nav { gap: 4px 8px; }
  .site-nav a, .tools summary { font-size: 13.5px; }
}

body.embed .site-header,""", 1)
    assert 'lth-header-v2-nav' in css
    wr('css/site.css', css); print('nav fit rules added')

# display serif: Fraunces -> Source Serif 4 (plain lowercase f; near-identical width/x-height)
import shutil
FONT_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'fonts-ss4')
for f in os.listdir(FONT_SRC):
    shutil.copyfile(os.path.join(FONT_SRC, f), os.path.join(ROOT, 'fonts', f))
css = rd('css/site.css')
if 'lth-font-ss4' not in css:
    for w, style, suf in [('500','normal',''),('600','normal',''),('700','normal',''),('500','italic','-italic'),('600','italic','-italic')]:
        old = f'  font-family: "Fraunces";\n  src: url("/fonts/fraunces-{w}{suf}.woff2") format("woff2");'
        assert css.count(old) == 1, old
        css = css.replace(old, f'  font-family: "Source Serif 4";\n  src: url("/fonts/source-serif-4-{w}{suf}.woff2") format("woff2");')
    old = '  --font-display: "Fraunces", "Iowan Old Style", Palatino, Georgia, serif;'
    assert old in css
    css = css.replace('Fraunces tagline', 'display-serif tagline')
    css = css.replace(old, '  /* lth-font-ss4: Source Serif 4 display serif (plain lowercase f) */\n  --font-display: "Source Serif 4", "Iowan Old Style", Palatino, Georgia, serif;')
    assert 'Fraunces' not in css, css.count('Fraunces')
    wr('css/site.css', css); print('display font -> Source Serif 4')
css = rd('css/site.css')
if 'Fraunces' in css:  # Oct 7 sweep: served CSS must not mention the old font at all
    css = css.replace('/* lth-font-ss4: Source Serif 4 replaces Fraunces (plain lowercase f) */', '/* lth-font-ss4: Source Serif 4 display serif (plain lowercase f) */')
    assert 'Fraunces' not in css; wr('css/site.css', css); print('css comment cleaned')

# background orbs (site.mjs)
js = rd('js/site.mjs')
if 'initAtmosphere' not in js:
    fn = '''function initAtmosphere() {
  if (document.querySelector(".atmosphere")) return;
  const layer = document.createElement("div");
  layer.className = "atmosphere";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = '<span class="ball ball-a"></span><span class="ball ball-b"></span><span class="ball ball-c"></span><span class="ball ball-d"></span><span class="ball ball-e"></span>';
  document.body.prepend(layer);
}

'''
    js = js.replace('function boot() {\n', fn + 'function boot() {\n', 1)
    js = js.replace('  clearThemePreference();\n', '  clearThemePreference();\n  initAtmosphere();\n', 1)
    assert js.count('initAtmosphere') == 2, js.count('initAtmosphere')
    wr('js/site.mjs', js); print('initAtmosphere restored')

# HTML: tagline markup + cache-bust
TAG_OLD = '<span class="tagline">True take-home pay for where you actually live.</span>'
TAG_NEW = '<span class="tagline">True take-home pay for where you actually <span class="tagline-live">live.</span></span>'
PRELOAD = '<link rel="preload" href="/fonts/source-serif-4-600.woff2" as="font" type="font/woff2" crossorigin>'

# Oct 10 (owner): Google Analytics 4 tag, exactly once, immediately after <head> on every HTML page.
GA_ID = 'G-S9BK9NYDGC'
GA_TAG = ('''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S9BK9NYDGC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-S9BK9NYDGC', { page_location: location.origin + location.pathname, page_referrer: document.referrer.split('?')[0] });
</script>''')
# Oct 10 (option 2): config sends page_location without the query string, so calculator inputs kept in
# the URL (?pay=...) never reach GA. Any earlier version of the tag is removed and replaced.
GA_ANY = re.compile(r'\n?<!-- Google tag \(gtag\.js\) -->\n<script async src="https://www\.googletagmanager\.com/gtag/js\?id=' + GA_ID + r'"></script>\n<script>.*?</script>', re.S)
def ensure_ga(s):
    if s.count(GA_TAG) == 1 and s.split('<head>', 1)[1].startswith('\n' + GA_TAG) and len(GA_ANY.findall(s)) == 1: return s
    s = GA_ANY.sub('', s)
    assert 'googletagmanager.com/gtag/js?id=' + GA_ID not in s and s.count('<head>') == 1
    return s.replace('<head>', '<head>\n' + GA_TAG, 1)
n = 0
for dp, dn, fn in os.walk(ROOT):
    if '/.publish' in dp: continue
    for f in fn:
        if not f.endswith('.html'): continue
        p = os.path.relpath(os.path.join(dp, f), ROOT); s = rd(p); s2 = s.replace(TAG_OLD, TAG_NEW)
        s2 = re.sub(r'site\.css\?v=[0-9a-z]+', 'site.css?v=' + CSS_VER, s2)
        if PRELOAD not in s2:
            s2 = re.sub(r'(\n(\s*)<link rel="stylesheet" href="/css/site\.css)', lambda m: '\n' + m.group(2) + PRELOAD + m.group(1), s2, count=1)
        s2 = re.sub(r'/js/site\.mjs\?v=[0-9a-z]+', '/js/site.mjs?v=' + CSS_VER, s2)
        s2 = ensure_ga(s2)
        if s2 != s: wr(p, s2); n += 1
print('html updated', n)

# guard
def verify(root):
    c = open(os.path.join(root, 'css/site.css')).read()
    assert 'lth-header-v2' in c and '.tagline-live' in c and 'backdrop-filter: blur(18px)' in c, 'header CSS missing'
    assert 'lth-font-ss4' in c and 'Fraunces' not in c, 'display font is not Source Serif 4'
    for w in ('500', '600', '700', '500-italic', '600-italic'):
        assert os.path.getsize(os.path.join(root, 'fonts', f'source-serif-4-{w}.woff2')) > 10000, w
    bad = []
    for dp, dn, fn in os.walk(root):
        if '/.publish' in dp: continue
        for f in fn:
            if f.endswith('.html'):
                s = open(os.path.join(dp, f)).read()
                if 'class="tagline"' in s and 'tagline-live' not in s: bad.append(f'{dp}/{f}')
                if 'site.css' in s and 'source-serif-4-600.woff2' not in s: bad.append(f'{dp}/{f} (no font preload)')
                if s.count('googletagmanager.com/gtag/js?id=' + GA_ID) != 1 or not s.split('<head>',1)[1].startswith('\n' + GA_TAG): bad.append(f'{dp}/{f} (GA4 tag missing/duplicated/not first in head)')
    assert not bad, bad
    print('header verify OK')
verify(ROOT)
