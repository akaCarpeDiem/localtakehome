#!/usr/bin/env bash
# Deploy build/out + functions/ to Cloudflare Pages project "localtakehome".
#   usage: scripts/deploy.sh [branch]   (default main = PRODUCTION; any other name = preview)
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment. Only deploy with the owner's go-ahead.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; BRANCH=${1:-main}
bash "$ROOT/scripts/build.sh"
WR="$ROOT/node_modules/.bin/wrangler"; test -x "$WR" || { echo "run npm ci first"; exit 1; }
cd "$ROOT/build"
"$WR" pages deploy out --project-name localtakehome --branch "$BRANCH" --commit-dirty=true
