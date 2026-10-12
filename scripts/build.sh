#!/usr/bin/env bash
# Build the site into build/out (and stage functions/ beside it for wrangler).
# The real work is in scripts/build.mjs; this wrapper keeps the old command working.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/scripts/build.mjs"
