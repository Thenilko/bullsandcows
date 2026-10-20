# Деплой на „Пасището“

Една Cloudflare Worker услуга сервира статичния клиент, `/api` и `/ws` (Durable Objects). Supabase (безплатен план) дава Auth и Postgres, към който Worker-ът се свързва през Hyperdrive. Ежедневен Cron пази Supabase проекта „буден“.

Само имената на тайните са тук; стойностите никога не се комитват.

## 1. Supabase проект

Използва се съществуващият проект. В таблото:

1. **Authentication → Providers → Email**: изключи „Confirm email“ (потвърждението на имейла).
2. **Authentication → Sign In / Providers**: включи **Allow anonymous sign-ins** (гост вход).
3. **Authentication → URL Configuration**: Site URL = `APP_ORIGIN` (напр. `https://pasishte.example.com`); добави в Redirect URLs `APP_ORIGIN/reset`.
4. **Project Settings → JWT Keys**: провери, че проектът подписва с асиметрични ключове (JWKS, ES256 или RS256). Сървърът проверява само ES256/RS256; проект със споделена HS256 тайна ще бъде отхвърлян.
5. Запиши от **Project Settings → API**: `SUPABASE_URL`, `anon` ключа и `service_role` ключа.

## 2. Миграции на базата

Нужна е директна връзка (порт 5432, не pooler) от **Connect → Direct connection**:

```sh
DATABASE_URL='postgresql://postgres:...@db.PROJECT.supabase.co:5432/postgres' \
  pnpm --filter server db:migrate
```

Същото прави `deploy.yml` при всеки push в `main`. Нови миграции: `pnpm --filter server db:generate`, прегледай SQL-а в `apps/server/drizzle/` и го комитни.

## 3. Hyperdrive

1. От **Connect → Transaction pooler** вземи connection string-а (порт 6543).
2. Създай конфигурацията:

   ```sh
   pnpm --filter server exec wrangler hyperdrive create pasishte-db \
     --connection-string='postgresql://postgres.PROJECT:...@aws-0-REGION.pooler.supabase.com:6543/postgres'
   ```

3. Копирай върнатия `id` в `apps/server/wrangler.toml` (`[[hyperdrive]]` → `id`, вместо `REPLACE_ME`) и комитни. (Блокът `[[env.dev.hyperdrive]]` е само за локална разработка и остава.)

## 4. Тайни на Worker-а (веднъж, на ръка)

От `apps/server`:

```sh
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_ANON_KEY
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put DAILY_SALT      # дълъг случаен низ; сменянето променя числата на деня
```

CI не задава тези тайни.

## 5. Домейн и `APP_ORIGIN`

- По подразбиране: `https://pasishte.<account>.workers.dev`.
- Собствен домейн: Cloudflare → Workers & Pages → `pasishte` → Settings → Domains & Routes → Add custom domain.
- Задай същия адрес в `[vars] APP_ORIGIN` в `apps/server/wrangler.toml` (проверката на `Origin` за API и WebSocket разчита на него) и в Supabase Site URL / Redirect URLs (стъпка 1.3).

## 6. Първи деплой

```sh
pnpm install
pnpm build                              # web + dry-run на Worker-а
pnpm --filter server exec wrangler deploy --env=""
```

Оттук нататък `deploy.yml` деплоира автоматично при push в `main`.

## 7. Какво прави Cron

`[triggers] crons = ["0 6 * * *"]` изпълнява всеки ден в 06:00 UTC лека заявка към Postgres, за да не бъде безплатният Supabase проект спрян заради неактивност.

## 8. Връщане назад

```sh
pnpm --filter server exec wrangler deployments list
pnpm --filter server exec wrangler rollback            # предишната версия
```

Миграциите на базата не се връщат автоматично; пиши обратна миграция, ако е нужно.

## 9. GitHub secrets за `deploy.yml`

В GitHub → Settings → Environments → `production` → Secrets:

| Име | Съдържание |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token с право „Edit Cloudflare Workers“ |
| `CLOUDFLARE_ACCOUNT_ID` | ID на Cloudflare акаунта |
| `DATABASE_URL` | директна Supabase връзка (порт 5432) за `drizzle-kit migrate` |

`ci.yml` не изисква тайни (фалшива автентикация, in-memory хранилище).

## Локална разработка

```sh
pnpm install
cp apps/server/.dev.vars.example apps/server/.dev.vars   # по желание
pnpm dev        # web на :5173 + wrangler dev --env dev на :8787
```

- Средата `dev` ползва `AUTH_MODE=fake` и `REPO_MODE=memory`: без Supabase и без акаунт.
- `.dev.vars` и `.env.local` са в `.gitignore`. Реални стойности са нужни само ако пуснеш `AUTH_MODE=supabase` локално.
- Клиентът чете `VITE_AUTH_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (виж `apps/web/.env.example`).
- Проверки: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm e2e`.
