# Бикове и крави · Пасището

Уеб игра по класическата „Бикове и крави“: познаваш тайно число от 3, 4 или 5 цифри, а резултатът се разказва като сцена на пасище, което се разсъмва с всеки опит. Има соло игра, бот, число на деня, дуели с приятели и бърз мач с рейтинг. Тайното число и проверката на опитите са само на сървъра.

## Структура

```
apps/
  web/            React клиент (Vite)
  server/         Cloudflare Worker + Durable Objects (/api, /ws)
packages/
  game-core/      чиста игрова логика (споделена от клиента и сървъра)
  i18n/           преводи BG (референтен) и EN
  protocol/       споделени схеми и типове на съобщенията
design/pasishte/  референтни прототипи от Claude Design (не се шипват)
docs/superpowers/ спецификация и план
```

## Команди

```sh
pnpm install        # зависимости (Node 22, pnpm 10)
pnpm dev            # web (:5173) + server (:8787, фалшива автентикация)
pnpm test           # vitest (всички проекти)
pnpm test:coverage  # покритие без server (game-core >= 95%, общо >= 80%)
pnpm typecheck      # tsc -b + тестовите конфигурации
pnpm lint           # eslint
pnpm build          # web build + dry-run на Worker-а
pnpm e2e            # Playwright (вдига wrangler dev + vite preview)
```

E2E: първия път `pnpm --filter web exec playwright install chromium`. Иконите на PWA се
генерират с `pnpm --filter web icons` (резултатът е в `apps/web/public/icons`).

CI (`.github/workflows/ci.yml`): lint, typecheck, тестове с покритие, build, e2e. Деплой
(`deploy.yml`) върви при push в `main`. Стъпките за Supabase, Hyperdrive и тайните са в
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Променливи на средата

Само имената; стойностите са в `.env.local` / `.dev.vars` / GitHub и Wrangler secrets и не се комитват.
Шаблони: `.env.example`, `apps/web/.env.example`, `apps/server/.dev.vars.example`.

- Worker: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DAILY_SALT`
- Клиент (build): `VITE_AUTH_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_SCREENS`
- Само за деплой: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`

## Документи

- Спецификация: [`docs/superpowers/specs/2026-10-20-pasishte-design.md`](docs/superpowers/specs/2026-10-20-pasishte-design.md)
- План: [`docs/superpowers/plans/2026-10-20-pasishte.md`](docs/superpowers/plans/2026-10-20-pasishte.md)
