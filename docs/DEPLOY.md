# Деплой на „Пасището“

Една Cloudflare Worker услуга сервира статичния клиент, `/api` и `/ws` (Durable Objects). Supabase (безплатен план) дава Auth и Postgres, към който Worker-ът се свързва през Hyperdrive. Ежедневен Cron пази Supabase проекта „буден“.

Само имената на тайните са тук; стойностите никога не се комитват.

## 1. Supabase проект

Използва се съществуващият проект (ref в `scripts/deploy/common.sh`). В таблото:

1. **Authentication → Providers → Email**: изключи „Confirm email“ (потвърждението на имейла).
2. **Authentication → Sign In / Providers**: включи **Allow anonymous sign-ins** (гост вход).
3. **Authentication → URL Configuration**: Site URL = `APP_ORIGIN` (напр. `https://pasishte.example.com`); добави в Redirect URLs `APP_ORIGIN/reset`.
4. **Project Settings → JWT Keys**: провери, че проектът подписва с асиметрични ключове (JWKS, ES256 или RS256). Сървърът проверява само ES256/RS256; проект със споделена HS256 тайна ще бъде отхвърлян.
5. Запиши от **Project Settings → API**: `SUPABASE_URL`, `anon` ключа и `service_role` ключа.
6. **Authentication → Rate Limits** (действие на собственика): вдигни лимитите за анонимни
   входове и за sign-in/sign-up. Гост входът става в браузъра (лимитът е на IP на играча), но
   вход, регистрация, ъпгрейд и нулиране на парола минават през Worker-а и всички делят малкото
   изходни IP-та на Cloudflare, т.е. лимитът „на IP“ на практика е общ за приложението.
7. **Authentication → Emails → SMTP Settings** (действие на собственика): настрой собствен SMTP.
   Вграденият пощенски сървър праща само до адресите на екипа на проекта и около 2 писма на час,
   така че „Забравена парола“ не стига до истински играчи без собствен SMTP.

## 2. База: роля `pasishte` и миграции

Worker-ът и миграциите ползват една и съща отделна роля, **`pasishte`**. Тя създава и
притежава таблиците, затова RLS (включен без политики) не я засяга, а PostgREST ролите
`anon`/`authenticated` не виждат нищо. Не пускай миграции като `postgres`: новите таблици
ще са на `postgres` без права за `pasishte` и Worker-ът ще получава permission грешки.

Паролата на ролята е в `local/deploy/worker.pw` (git-ignored). Скриптовете в `scripts/deploy/`:

1. `01-prepare-db.sh` създава ролята (или сменя паролата ѝ). С `--i-know-this-drops-everything`
   преди това трие всички таблици на приложението; отказва, ако `public.games` има редове,
   освен с `FORCE_DROP=1`. `01b-drop-old-triggers.sh` (еднократно, със същия флаг) маха
   тригерите на старото тестово приложение.
2. `02-migrate.sh` пуска Drizzle миграциите като `pasishte` през **Session pooler**
   (Supavisor, порт 5432, поддържа DDL). Хостът е в `local/deploy/pooler.host` (Supabase →
   **Connect** → **Session pooler**).

Връзката (и стойността на GitHub тайната `DATABASE_URL`) има формата:

```text
postgresql://pasishte.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

Директната връзка (`db.PROJECT.supabase.co`) е само IPv6, а GitHub-hosted runner-ите са само
IPv4, затова `deploy.yml` ползва Session pooler-а. Нови миграции: `pnpm --filter server
db:generate`, прегледай SQL-а в `apps/server/drizzle/` и го комитни; `deploy.yml` ги прилага
преди всеки деплой.

## 3. Hyperdrive

`03-hyperdrive.sh` създава конфигурацията `pasishte-db` към **същата** Session pooler връзка
като ролята `pasishte` (порт 5432) и записва върнатия `id` в `apps/server/wrangler.toml`
(`[[hyperdrive]]` → `id`). Комитни промяната. (Блокът `[[env.dev.hyperdrive]]` е само за
локална разработка и остава.)

## 4. Първи деплой

`scripts/deploy/05-deploy.sh` билдва клиента в Supabase режим (`VITE_AUTH_MODE=supabase`,
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` от `apps/server/.dev.vars`, без да ги
отпечатва), проверява, че бъндълът съдържа адреса на Supabase проекта, и пуска
`wrangler deploy`. Билд без тези стойности пада с грешка (`apps/web/build/prodEnv.ts`).

Преди тази стъпка `wrangler.toml` трябва да има истинско Hyperdrive `id` (стъпка 3). Докато
тайните от стъпка 5 липсват, Worker-ът ще отговаря с грешка; това е очаквано. След първия ръчен
деплой `deploy.yml` деплоира автоматично след успешен CI в `main`.

## 5. Тайни на Worker-а (веднъж, на ръка)

От `apps/server`:

```sh
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_ANON_KEY
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put DAILY_SALT      # дълъг случаен низ; сменянето променя числата на деня
```

Worker-ът вече съществува след стъпка 4. CI не задава тези тайни.

## 6. Домейн и `APP_ORIGIN`

- По подразбиране: `https://pasishte.<account>.workers.dev`.
- Собствен домейн: Cloudflare → Workers & Pages → `pasishte` → Settings → Domains & Routes → Add custom domain.
- Задай същия адрес в `[vars] APP_ORIGIN` в `apps/server/wrangler.toml` (от него се строи линкът за нулиране на парола) и в Supabase Site URL / Redirect URLs (стъпка 1.3). `06-origin.sh` прави и двете.
- Статичните файлове носят `Content-Security-Policy` и др. от `dist/_headers` (генерира се при билда; `connect-src` позволява само собствения origin и `VITE_SUPABASE_URL`).

## 7. Какво прави Cron

`[triggers] crons = ["0 6 * * *"]` изпълнява всеки ден в 06:00 UTC лека заявка към Postgres, за да не бъде безплатният Supabase проект спрян заради неактивност.

## 8. Връщане назад

```sh
pnpm --filter server exec wrangler deployments list
pnpm --filter server exec wrangler rollback            # предишната версия
```

Миграциите на базата не се връщат автоматично; пиши обратна миграция, ако е нужно.

## 9. Обновяване при клиентите (PWA)

Клиентът е PWA със service worker (`vite-plugin-pwa`, `registerType: 'autoUpdate'`). Новият worker се
инсталира при следващото отваряне и веднага поема контрола (`skipWaiting` + `clientsClaim` във `vite.config.ts`),
а `virtual:pwa-register` в `main.tsx` презарежда страницата. Без тези две опции плъгинът оставя новия worker
„waiting“, докато не се затворят всички табове, и телефонът продължава да показва стария билд.

Ако някой клиент все пак е на стара версия: DevTools → Application → Service workers → „skipWaiting“, или
затваряне на всички табове на сайта (на iPhone — затваряне на добавеното на началния екран приложение).

Старите чънкове (`/assets/*-<hash>.js`) не се пазят след деплой. Отворена страница от предишната
версия, която поиска такъв чънк, получава 404 от Worker-а (`/assets/*` минава през него, за да не
върне SPA обвивката като скрипт), Vite вдига `vite:preloadError` и клиентът се презарежда веднъж
(`apps/web/src/app/staleChunk.ts`). Ако и това не помогне, маршрутът показва страницата за грешка
с бутон „Презареди“ (`RouteError.tsx`).

## 10. GitHub secrets и variables за `deploy.yml`

В GitHub → Settings → Environments → `production`:

| Вид | Име | Съдържание |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | API token с право „Edit Cloudflare Workers“ |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | ID на Cloudflare акаунта |
| Secret | `DATABASE_URL` | Session pooler връзка **като `pasishte`** (порт 5432, виж стъпка 2) за `drizzle-kit migrate` |
| Secret | `VITE_SUPABASE_ANON_KEY` | `anon` ключът (публичен, но се пази като secret) за билда на клиента |
| Variable | `VITE_SUPABASE_URL` | `https://PROJECT.supabase.co` за билда на клиента |
| Variable | `VITE_PUBLIC_URL` | публичният адрес на играта в споделения текст (`…/?s=share`); без него клиентът ползва origin-а на страницата |

`ci.yml` не изисква тайни (фалшива автентикация, in-memory хранилище, `VITE_AUTH_MODE=fake`).

**Защита на `production`:** в Settings → Environments → `production` → Deployment branches избери „Selected branches“ = само `main` (по желание добави Required reviewers).

**CI gate:** `deploy.yml` тръгва с `workflow_run` след успешен CI за push в `main` (или ръчно с `workflow_dispatch` от `main`) и деплоира точно тествания commit. Пази `main` и с branch protection (задължителни проверки `check`, `build`, `e2e`, `e2e-gallery`).

**Първи push в `main`:** докато Hyperdrive `id` в `wrangler.toml` е `REPLACE_ME`, `deploy.yml` пада рано с ясно съобщение (guard стъпка), преди миграциите и деплоя. Липсващи GitHub secrets/variables също водят до неуспех (билдът на клиента спира без `VITE_SUPABASE_*`), без вреда.

## 11. Админ панел и зачистване на базата

`/admin` показва играчите, игрите по режими и дни, социалното и последно активните. Достъп има само акаунт с
`app_metadata.role = "admin"` в Supabase Auth: ролята е в access token-а, Worker-ът я чете от проверения JWT
(`requireAdmin`, 403 за всички други), а `app_metadata` се пише само със service role ключа, не от потребителя.
Нова роля важи след нов вход (или когато токенът се обнови, до 1 час).

```bash
# Даване на ролята (без да се трие нищо)
node apps/server/scripts/prod-admin.mjs grant <email>
# Само <email> остава: първо показва бройките, нищо не трие
node apps/server/scripts/prod-admin.mjs prune <email>
# Изпълнение: data-only pg_dump в local/backups/, после трие другите профили (с всичко тяхно) и auth потребителите
node apps/server/scripts/prod-admin.mjs prune <email> --apply
```

Скриптът чете `local/deploy/database.url` и `apps/server/.dev.vars` (същите като deploy стъпките). Ако локалният
`pg_dump` е по-стар от сървъра, backup-ът се прави в Docker образа `postgres:<версия>`. Без успешен backup нищо не
се трие. В dev (fake auth) админ е `admin@pasishte.test`.

## Локална разработка

```sh
pnpm install
cp apps/server/.dev.vars.example apps/server/.dev.vars   # по желание
pnpm dev        # web на :5173 + wrangler dev --env dev на :8787
```

- Средата `dev` ползва `AUTH_MODE=fake` и `REPO_MODE=memory`: без Supabase и без акаунт.
- `.dev.vars` и `.env.local` са в `.gitignore`. Реални стойности са нужни само ако пуснеш `AUTH_MODE=supabase` локално.
- Клиентът чете `VITE_AUTH_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_SCREENS`, `VITE_PUBLIC_URL` (виж `apps/web/.env.example`).
- Проверки: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm e2e`.
