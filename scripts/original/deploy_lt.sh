#!/usr/bin/env bash
# LocalTakehome deploy (Oct 10, 2026). Source of truth: /workspace/localtakehome-deploy (static, patched by
# header.py then hero.py) + /workspace/localtakehome-functions (www->apex 301 + /.publish 404 middleware).
# Stages both side by side in /tmp/lt-stage (wrangler bundles ./functions from the CWD), excluding .publish.
#   usage: deploy_lt.sh [branch]   (default main = production)
set -euo pipefail
SRC=/workspace/localtakehome-deploy; FN=/workspace/localtakehome-functions; RUN=/tmp/lt-stage; BRANCH=${1:-main}
python3 /workspace/lt-review/patch/header.py "$SRC"
python3 /workspace/lt-review/patch/hero.py "$SRC"
rm -rf "$RUN"; mkdir -p "$RUN"
cp -a "$SRC" "$RUN/out"; rm -rf "$RUN/out/.publish"; cp -a "$FN" "$RUN/functions"
test -f "$RUN/functions/_middleware.ts"
echo '{"name":"lt-stage","private":true}' > "$RUN/package.json"; mkdir -p "$RUN/node_modules"
cd "$RUN"; export WRANGLER_CACHE_DIR=/tmp/wr-cache
/workspace/ns-redesign-preview/node_modules/.bin/wrangler pages deploy out --project-name localtakehome --branch "$BRANCH" --commit-dirty=true
