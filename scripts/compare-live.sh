#!/usr/bin/env bash
# Compare build/out with what https://localtakehome.com serves, file by file (byte-exact).
# Run scripts/build.sh first. Prints MISMATCH lines; exit 1 if any.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$ROOT/build/out"; BASE=${1:-https://localtakehome.com}
test -d "$OUT" || { echo "run scripts/build.sh first"; exit 2; }
tmp=$(mktemp); ok=0; bad=0
while IFS= read -r f; do
  rel=${f#"$OUT"}; case "$rel" in /_headers) continue;; esac
  url="$BASE${rel%index.html}"; [ "${rel##*/}" = "404.html" ] && url="$BASE/404.html"
  code=$(curl -s -o "$tmp" -w '%{http_code}' "$url")
  if [ "$code" = 200 ] && cmp -s "$tmp" "$f"; then ok=$((ok+1)); else bad=$((bad+1)); echo "MISMATCH $code $url"; fi
done < <(find "$OUT" -type f | sort)
rm -f "$tmp"; echo "compare-live: $ok identical, $bad different"; [ $bad = 0 ]
