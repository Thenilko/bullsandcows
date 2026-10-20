#!/usr/bin/env bash
# Стъпка 3: създава Hyperdrive конфигурация към Session pooler-а и записва id-то в wrangler.toml.
source "$(dirname "$0")/common.sh"
need "$ROOT/local/deploy/database.url"
URL="$(cat "$ROOT/local/deploy/database.url")"
cd "$ROOT/apps/server"
OUT="$(pnpm exec wrangler hyperdrive create pasishte-db --connection-string="$URL" 2>&1 | sed "s#${URL}#***#g")"
echo "$OUT" | grep -viE "password|connection" || true
ID="$(echo "$OUT" | grep -oE '[0-9a-f]{32}' | head -1)"
test -n "$ID" || { echo "Не намерих Hyperdrive id в изхода"; exit 1; }
python3 - "$ID" <<'PY'
import re,sys
p='wrangler.toml'; s=open(p).read()
s2=re.sub(r'(\[\[hyperdrive\]\]\s*\nbinding\s*=\s*"HYPERDRIVE"\s*\nid\s*=\s*")REPLACE_ME(")', r'\g<1>'+sys.argv[1]+r'\2', s, count=1)
assert s2!=s, 'placeholder not found (already replaced?)'
open(p,'w').write(s2); print('wrangler.toml: hyperdrive id записан')
PY
