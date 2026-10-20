#!/usr/bin/env bash
# Стъпка 0 (еднократно): регистрира workers.dev поддомейн за акаунта. Употреба: bash scripts/deploy/00-subdomain.sh <име>
source "$(dirname "$0")/common.sh"
NAME="${1:?Подай име на поддомейна, напр. nilko}"
ACCOUNT="359f0914857da45af35f6727f07e7ac1"
echo "--- текущ поддомейн:"
curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/subdomain" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result') or d.get('errors'))"
echo "--- регистрирам '$NAME':"
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/subdomain" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" --data "{\"subdomain\":\"$NAME\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK', d['result']) if d.get('success') else print('ГРЕШКА', d.get('errors'))"
