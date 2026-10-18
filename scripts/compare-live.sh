#!/usr/bin/env bash
# Compare build/out with what https://localtakehome.com serves, file by file (byte-exact).
# Known edge transforms are normalized: <!--email_off--> markers stripped, /404.html checked via a missing path.
# Run scripts/build.sh first. Prints MISMATCH lines; exit 1 if any.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$ROOT/build/out"; BASE=${1:-https://localtakehome.com}
test -d "$OUT" || { echo "run scripts/build.sh first"; exit 2; }
tmp=$(mktemp); ok=0; bad=0
while IFS= read -r f; do
  rel=${f#"$OUT"}; case "$rel" in /_headers|/_routes.json) continue;; esac
  url="$BASE${rel%index.html}"; want=200
  # Pages 308s /404.html; the 404 page is what a missing path serves
  [ "$rel" = "/404.html" ] && { url="$BASE/__compare-live-missing-page__"; want=404; }
  code=$(curl -s -o "$tmp" -w '%{http_code}' "$url")
  # Cloudflare's edge strips the <!--email_off--> markers it uses to skip email obfuscation
  if [ "$code" = "$want" ] && sed 's#<!--email_off-->##g; s#<!--/email_off-->##g' "$f" | cmp -s "$tmp" -; then ok=$((ok+1)); else bad=$((bad+1)); echo "MISMATCH $code $url"; fi
done < <(find "$OUT" -type f | sort)
rm -f "$tmp"; echo "compare-live: $ok identical, $bad different"; [ $bad = 0 ]
