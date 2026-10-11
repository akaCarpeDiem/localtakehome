#!/usr/bin/env bash
# Build = copy site/ to build/out, apply patches/header.py THEN patches/hero.py (order matters),
# and stage functions/ beside it (wrangler bundles ./functions from the directory it runs in).
# The patches are idempotent; on an unmodified site/ they change nothing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$ROOT/build"
rm -rf "$OUT"; mkdir -p "$OUT"
cp -a "$ROOT/site" "$OUT/out"; rm -rf "$OUT/out/.publish"
python3 "$ROOT/patches/header.py" "$OUT/out"
python3 "$ROOT/patches/hero.py" "$OUT/out"
cp -a "$ROOT/functions" "$OUT/functions"
test -f "$OUT/functions/_middleware.ts"
echo '{"name":"lt-stage","private":true}' > "$OUT/package.json"
if diff -rq "$ROOT/site" "$OUT/out" >/dev/null; then echo "build: build/out is identical to site/"; else
  echo "build: the patches changed files (copy them back into site/ and commit):"; diff -rq "$ROOT/site" "$OUT/out" || true; fi
echo "build ok: $(find "$OUT/out" -name '*.html' | wc -l) html pages in build/out"
