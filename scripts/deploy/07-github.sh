#!/usr/bin/env bash
# Стъпка 7 (еднократно): автоматичен деплой при merge в main. Създава GitHub environment `production`
# (деплой само от main) и му задава тайните и променливите за .github/workflows/deploy.yml от локалните
# файлове. Нищо не се отпечатва. Нужни: gh (логнат), local/deploy/{cf.token,database.url}, apps/server/.dev.vars.
# Употреба: bash scripts/deploy/07-github.sh [публичен-адрес]   (по подразбиране APP_ORIGIN от wrangler.toml)
source "$(dirname "$0")/common.sh"
R="Thenilko/bullsandcows"
need "$ROOT/local/deploy/cf.token"; need "$ROOT/local/deploy/database.url"
PUBLIC_URL="${1:-$(grep -m1 -E '^APP_ORIGIN' "$ROOT/apps/server/wrangler.toml" | cut -d'"' -f2)}"

gh api -X PUT "repos/$R/environments/production" --input - >/dev/null <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
gh api -X POST "repos/$R/environments/production/deployment-branch-policies" -f name=main -f type=branch >/dev/null 2>&1 || true

printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --env production -R "$R"
printf '%s' "359f0914857da45af35f6727f07e7ac1" | gh secret set CLOUDFLARE_ACCOUNT_ID --env production -R "$R"
tr -d '\n' < "$ROOT/local/deploy/database.url" | gh secret set DATABASE_URL --env production -R "$R"
devvar SUPABASE_ANON_KEY | tr -d '\n' | gh secret set VITE_SUPABASE_ANON_KEY --env production -R "$R"
gh variable set VITE_SUPABASE_URL --env production -R "$R" --body "$(devvar SUPABASE_URL)"
gh variable set VITE_PUBLIC_URL --env production -R "$R" --body "$PUBLIC_URL"

echo "Тайни в production:"; gh secret list --env production -R "$R" | cut -f1
echo "Променливи:"; gh variable list --env production -R "$R" | cut -f1,2
echo "Деплой само от: $(gh api "repos/$R/environments/production/deployment-branch-policies" -q '.branch_policies[].name')"
