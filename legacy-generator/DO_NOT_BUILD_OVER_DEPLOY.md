# Do not build/deploy from this folder

localtakehome-src is OUT OF DATE versus the live site (/workspace/localtakehome-deploy).
It lacks: the glass header + logo-matching tagline + background orbs, Add rate blocks / OT hours
changes, the AdSense content pass, the LocalTakehome About/Privacy/Terms wording, and /contact/.

Deploying a build from here (as happened Oct 4, deploy 9698ae13) silently reverts those.
Patch /workspace/localtakehome-deploy instead, then run:
  python3 /workspace/lt-review/patch/header.py /workspace/localtakehome-deploy
See /workspace/localtakehome-deploy/.publish/tagline-restore-status.json.

Oct 7 later: the live site also switched its display serif to Source Serif 4 (src still has Fraunces),
has a new homepage hero blurb, and has partner/ad placeholder JS stubbed out. Run patch/hero.py after header.py.
