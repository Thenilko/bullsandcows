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
  protocol/       (предстои) споделени схеми и типове на съобщенията
design/pasishte/  референтни прототипи от Claude Design (не се шипват)
docs/superpowers/ спецификация и план
```

## Команди

```sh
pnpm install      # зависимости (Node 22, pnpm 10)
pnpm dev          # web + server паралелно
pnpm test         # vitest (workspace)
pnpm typecheck    # tsc -b през project references
pnpm lint         # eslint
pnpm build        # pnpm -r build
pnpm e2e          # Playwright (билдва web, вдига wrangler dev + preview)
```

E2E: първия път `pnpm --filter web exec playwright install chromium`. Иконите на PWA се
генерират с `pnpm --filter web icons` (резултатът е в `apps/web/public/icons`).

## Променливи на средата

Само имената; стойностите са в `.env.local` / `.dev.vars` и не се комитват.

- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DAILY_SALT`

## Документи

- Спецификация: [`docs/superpowers/specs/2026-10-20-pasishte-design.md`](docs/superpowers/specs/2026-10-20-pasishte-design.md)
- План: [`docs/superpowers/plans/2026-10-20-pasishte.md`](docs/superpowers/plans/2026-10-20-pasishte.md)
