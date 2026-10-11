# -*- coding: utf-8 -*-
EMAIL = '<!--email_off--><a href="mailto:support@localtakehome.com">support@localtakehome.com</a><!--/email_off-->'
UPDATED = 'October 7, 2026'

ABOUT = f'''<main id="main"><div class="wrap page prose">
    <header class="mast"><p class="kicker">About</p><h1>About LocalTakehome</h1>
    <p class="lede">True take-home pay for where you actually live.</p></header>
    <p>LocalTakehome is a free U.S. paycheck calculator for tax year 2026. You enter a salary or an hourly wage, and it shows what is withheld for federal income tax, Social Security, Medicare, state income tax, state payroll programs, and local wage taxes. Then it shows what lands in your account. The calculation runs in your browser, and nothing you type is uploaded.</p>
    <h2 id="why">Why it exists</h2>
    <p>Most paycheck calculators handle federal and state tax well, then skip the place you actually live. New York City is not the same as New York State, and Philadelphia is not the same as the rest of Pennsylvania. Detroit, Columbus, Cleveland, Baltimore, and Portland all add their own wage taxes. LocalTakehome was built around that local layer. It models a list of published city and county taxes. Anywhere else, it asks you for your local rate rather than guessing one.</p>
    <p>Beyond the main calculator, the site has guides and calculators for all 50 states and Washington, D.C., hourly pay, overtime, bonuses, raises, 401(k) contributions, Form W-4, contractor versus W-2 pay, comparing two job offers, and the total cost of an employee to an employer.</p>
    <h2 id="how">How the estimates are made</h2>
    <p>Federal figures come from IRS Rev. Proc. 2025-32 (the 2026 inflation adjustments) and IRS Publication 15-T. The Social Security wage base comes from the Social Security Administration. State brackets come from the Tax Foundation’s 2026 table of state income tax rates. City and county rates come from the tax agency for each place, and each location page links its sources. Every state and local entry carries a “last verified” date and a confidence label. An entry is marked “estimated” when a state rule is only partly modeled, and the state page explains what is missing.</p>
    <p>The figures are reviewed whenever the IRS, the SSA, a state, or a city publishes new rates, and the data is updated for each new tax year. Rates were last verified on September 27, 2026. The <a href="/methodology/">methodology page</a> explains the formulas, the test cases they are checked against, and the known limits.</p>
    <h2 id="who">Who runs it</h2>
    <p>LocalTakehome is an independent website. It is not affiliated with the IRS, the Social Security Administration, any state or local tax agency, or any payroll company, and it does not sell tax preparation or financial products. The site is free to use and is supported by advertising. Ads never change the numbers the calculator produces.</p>
    <p>The results are educational estimates, not tax, legal, or financial advice. For decisions about withholding or filing, use the IRS Tax Withholding Estimator or talk to a tax professional. The <a href="/terms/">terms of use</a> explain this in full.</p>
    <h2 id="corrections">Corrections</h2>
    <p>If a rate, bracket, or rule looks wrong, please email {EMAIL} with the page, the inputs you used, and a link to the official source if you have one. Confirmed corrections are fixed in the data and reflected in the “last verified” date. The <a href="/methodology/">methodology page</a> lists the current sources and known gaps.</p>
    <h2 id="contact">Contact</h2>
    <p>For questions, corrections, privacy requests, or advertising inquiries, email {EMAIL} or see the <a href="/contact/">contact page</a>. The <a href="/privacy/">privacy policy</a> explains what the site stores and how advertising works.</p>
    <h2 id="embed">Embed the calculator</h2>
    <p>You can show the calculator on another site without the LocalTakehome header and footer by adding <code>?embed=1</code> to any calculator URL. The math is the same, and it still runs in the visitor’s browser. Example:</p>
    <pre><code>&lt;iframe title="LocalTakehome calculator" src="https://localtakehome.com/paycheck-calculator/?state=TX&amp;embed=1" width="100%" height="900" style="border:0"&gt;&lt;/iframe&gt;</code></pre>
  </div></main>'''

CONTACT = f'''<main id="main"><div class="wrap page prose">
    <header class="mast"><p class="kicker">Contact</p><h1>Contact LocalTakehome</h1>
    <p class="lede">Questions, corrections, and privacy requests.</p></header>
    <p>The best way to reach LocalTakehome is by email at {EMAIL}.</p>
    <h2>Report a rate or calculation error</h2>
    <p>If a result looks wrong, please include:</p>
    <ul>
      <li>the page you used (for example, the Ohio calculator or the bonus calculator)</li>
      <li>the inputs, or the share link from the address bar (you can remove the salary if you prefer)</li>
      <li>what you expected, and a link to the official IRS, state, or city source if you have one</li>
    </ul>
    <p>Confirmed corrections are added to the tax data, and the page’s “last verified” date is updated. The <a href="/methodology/">methodology page</a> lists the sources and the known limits of the estimate.</p>
    <h2>Privacy requests</h2>
    <p>LocalTakehome has no accounts and does not store your paycheck inputs on a server. Saved scenarios stay in your own browser, and you can delete them by clearing this site’s data. For questions about cookies or advertising, see the <a href="/privacy/">privacy policy</a> or email the address above.</p>
    <h2>Advertising and partnerships</h2>
    <p>For advertising or partnership questions, use the same email address. Ads and partners never change the calculator’s results.</p>
    <h2>Please note</h2>
    <p>LocalTakehome cannot give personal tax advice or review your pay stub, tax return, or IRS notices. For those, contact your employer’s payroll department, the IRS, your state tax agency, or a tax professional.</p>
  </div></main>'''

PRIVACY = f'''<main id="main"><div class="wrap page prose">
    <header class="mast"><p class="kicker">Privacy</p><h1>Privacy policy</h1>
    <p class="lede">Your salary stays in your browser. Last updated October 10, 2026.</p></header>
    <p>This policy explains what information LocalTakehome (localtakehome.com) handles, what is stored on your device, and how advertising on the site works.</p>
    <h2>Paycheck inputs stay on your device</h2>
    <p>The calculator runs in your browser. Your income, filing status, deductions, and location are not sent to a LocalTakehome server to produce a result. The tax tables are static files that your browser downloads, and the arithmetic happens on your device. There are no accounts and no sign-up forms. LocalTakehome does not pass your calculation inputs to advertisers, analytics services, or anyone else.</p>
    <h2>What may be stored in your browser</h2>
    <ul>
      <li><code>lth-scenarios</code>: named scenarios you choose to save in the calculator. Nothing is saved unless you click Save. If an older visit stored <code>tth-scenarios</code>, the page may copy it once into the newer key.</li>
    </ul>
    <p>Clearing site data for localtakehome.com in your browser removes these. A share link puts your inputs in the web address. Only share that link with people and services you trust.</p>
    <h2>Hosting and server logs</h2>
    <p>The site is hosted on Cloudflare. Like most web hosts, Cloudflare processes technical information such as IP addresses, browser type, and the pages requested, so that it can deliver pages and protect the site from abuse. If you open a share link, the address you request can include the inputs in that link. Fonts are self-hosted.</p>
    <h2>Analytics (Google Analytics 4)</h2>
    <p>LocalTakehome uses Google Analytics 4 to understand how visitors use the site, such as which pages are viewed, roughly where visits come from, and what kind of device and browser are used. Google Analytics sets first-party cookies (for example <code>_ga</code> and <code>_ga_&lt;ID&gt;</code>, which can last up to about two years) and collects usage data such as the page address, the referring page, approximate location, and device information. We use this data only in aggregate to measure traffic and improve the site, not to identify you. The calculator keeps your inputs in the page address so results can be shared, but the site sends Google Analytics only the page path (for example <code>/ohio-paycheck-calculator/</code>), never the part of the address that holds your inputs. Your salary, deductions, and other calculator inputs are not sent to Google Analytics.</p>
    <p>Google processes this data under its own policies. See <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use our services</a> and the <a href="https://policies.google.com/privacy" rel="noopener">Google Privacy Policy</a>. You can opt out by blocking cookies in your browser or by installing the <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics Opt-out Browser Add-on</a>.</p>
    <h2>Advertising and cookies</h2>
    <p>LocalTakehome uses Google AdSense to show ads. These ads help keep the site free.</p>
    <ul>
      <li>Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to this website or other websites.</li>
      <li>Google’s use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.</li>
      <li>You may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" rel="noopener">Google Ads Settings</a>. You can also opt out of some third-party vendors’ use of cookies for personalized advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info/choices</a>, or, in the European Union, at <a href="https://www.youronlinechoices.eu/" rel="noopener">www.youronlinechoices.eu</a>.</li>
      <li>Google explains how it uses information from sites that show its ads at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">How Google uses information from sites or apps that use our services</a>.</li>
    </ul>
    <p>Where the law requires consent before advertising cookies are used, such as in the European Economic Area, the United Kingdom, and Switzerland, you may see a consent message. You can choose non-personalized ads there. Non-personalized ads still use cookies or similar technology for frequency capping, aggregated reporting, and fraud prevention. You can also block or delete cookies in your browser settings.</p>
    <p>Ads are labeled and are kept separate from the calculator results. Advertising does not change any estimate. Authorized sellers of ads on this site are listed in <a href="/ads.txt">ads.txt</a>.</p>
    <h2>Your choices and rights</h2>
    <p>Because LocalTakehome does not have accounts and does not keep your paycheck inputs, it usually holds no personal information that it could look up or delete for you. Data collected by Google for advertising is controlled by Google and can be managed with the tools above. Depending on where you live, privacy laws may give you rights over personal information, including a right to opt out of targeted advertising. To ask a question or make a request, email {EMAIL}.</p>
    <h2>Children</h2>
    <p>LocalTakehome is meant for adults working in the United States. It is not directed to children under 13 and does not knowingly collect personal information from them.</p>
    <h2>Links to other sites</h2>
    <p>Pages link to the IRS, state tax agencies, and other sources. Those sites have their own privacy policies.</p>
    <h2>Changes to this policy</h2>
    <p>If this policy changes, the new version will be posted here with a new “last updated” date.</p>
    <h2>Contact</h2>
    <p>Questions about privacy: {EMAIL}. See also the <a href="/terms/">terms of use</a> and the <a href="/contact/">contact page</a>.</p>
  </div></main>'''

TERMS = f'''<main id="main"><div class="wrap page prose">
    <header class="mast"><p class="kicker">Terms</p><h1>Terms of use</h1>
    <p class="lede">Last updated {UPDATED}.</p></header>
    <p>By using localtakehome.com you agree to these terms. If you do not agree, please do not use the site.</p>
    <h2>Educational estimates, not advice</h2>
    <p>LocalTakehome provides educational estimates of U.S. take-home pay for tax year 2026. It is not tax, legal, payroll, or financial advice. It does not replace your employer’s payroll system, a CPA, an enrolled agent, or the <a href="https://www.irs.gov/individuals/tax-withholding-estimator" rel="noopener">IRS Tax Withholding Estimator</a>. Actual paychecks depend on your W-4, your benefits, your employer’s payroll system, and local rules.</p>
    <h2>Accuracy</h2>
    <p>Care is taken to use published 2026 figures and to cite them. Even so, results can be wrong or out of date. Tax rates change, localities reset their rates, and the model leaves out tax credits, itemized deductions, credits for tax paid to other states, property and sales tax, garnishments, and many local taxes. Federal income tax is an annualized bracket estimate based on Rev. Proc. 2025-32, not an exact Publication 15-T table lookup. Known gaps are listed on the <a href="/methodology/">methodology page</a> and on each state page.</p>
    <p>You are responsible for how you use any number from this site, including decisions about job offers, withholding, or tax filings. Please do not present a LocalTakehome result as your exact paycheck or as an official IRS or state figure.</p>
    <h2>No warranty and limitation of liability</h2>
    <p>The site is provided “as is,” without warranties of any kind, including accuracy or fitness for a particular purpose. To the fullest extent the law allows, LocalTakehome is not liable for any loss or damage arising from use of the site or reliance on its estimates.</p>
    <h2>Advertising and third-party links</h2>
    <p>The site is supported by advertising, including ads served by Google AdSense. Ads are labeled and are kept separate from results. They do not change the calculator’s math. Links to other websites are provided for reference. LocalTakehome does not control those sites and is not responsible for their content. See the <a href="/privacy/">privacy policy</a> for how advertising cookies work.</p>
    <h2>Use of the site and content</h2>
    <p>You may use the calculators for personal or business purposes and may link to any page. You may embed the calculator using the <code>?embed=1</code> option described on the <a href="/about/#embed">About page</a>. Please do not copy the site’s written guides in bulk, misrepresent results, or interfere with the site’s operation.</p>
    <h2>Changes</h2>
    <p>These terms may be updated from time to time. The date at the top shows the latest version.</p>
    <h2>Contact</h2>
    <p>Questions about these terms: {EMAIL}.</p>
  </div></main>'''
