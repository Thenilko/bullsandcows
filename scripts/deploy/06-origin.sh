#!/usr/bin/env bash
# Стъпка 6: задава окончателния APP_ORIGIN (аргумент, напр. https://pasishte.xxx.workers.dev) в wrangler.toml и в Supabase Auth, после редеплой.
source "$(dirname "$0")/common.sh"
ORIGIN="${1:?Подай origin, напр. https://pasishte.xxx.workers.dev}"
cd "$ROOT"
python3 - "$ORIGIN" <<'PY'
import re,sys
o=sys.argv[1]
p='apps/server/wrangler.toml'; s=open(p).read()
s=re.sub(r'APP_ORIGIN\s*=\s*"[^"]*"', 'APP_ORIGIN = "%s"'%o, s, count=1); open(p,'w').write(s)
p='supabase/config.toml'; s=open(p).read()
s=re.sub(r'^site_url\s*=.*$', 'site_url = "%s"'%o, s, count=1, flags=re.M)
s=re.sub(r'^additional_redirect_urls\s*=.*$', 'additional_redirect_urls = ["%s/**", "http://localhost:5173/**", "http://127.0.0.1:5173/**"]'%o, s, count=1, flags=re.M)
s=re.sub(r'^enable_anonymous_sign_ins\s*=.*$', 'enable_anonymous_sign_ins = true', s, count=1, flags=re.M)
s=re.sub(r'(\[auth\.email\][\s\S]*?^enable_confirmations\s*=\s*)true', r'\1false', s, count=1, flags=re.M)
open(p,'w').write(s); print('wrangler.toml и supabase/config.toml обновени')
PY
supabase config push --yes 2>&1 | grep -viE "token|key" | tail -3
cd "$ROOT/apps/server" && pnpm exec wrangler deploy 2>&1 | grep -viE "token" | tail -4
