# Бикове и крави

Уеб версия на класическата игра с вход, класиране, число на деня и дуел на живо с приятели.

**Стек:** Vite + React + TypeScript · Supabase (Postgres, Auth, Realtime) · Vercel · GitHub Actions

## Режими

- **Играя** – компютърът избира число с различни цифри (3, 4 или 5), ти го познаваш. Точки, звезди и оценка след всяка победа.
- **Число на деня** – едно число за всички играчи през деня, с отделно класиране.
- **Дуел** – стая с 4-знаков код, всички получават едно и също число, печели първият познал. Опитите се виждат на живо.
- **Компютърът** – ти намисляш число, компютърът го познава с алгоритъма на Кнут (обикновено за 5–6 хода).
- **Класиране** – число на деня, общо точки, победи.

## Пускане локално

```sh
npm install
npm run dev        # http://localhost:5173
```

Без `.env` играта работи в **локален режим**: всичко освен вход, класиране и дуел. За пълната версия:

```sh
cp .env.example .env   # попълни VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
```

Инструкциите за базата са в [`supabase/README.md`](supabase/README.md).

Други команди:

```sh
npm test            # unit тестове на игровата логика (vitest)
npm run typecheck   # tsc
npm run build       # production билд в dist/
```

## Качване на Vercel

1. Импортирай репото във Vercel (Framework: Vite, build `npm run build`, output `dist`).
2. Добави променливите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` в Project Settings → Environment Variables.
3. В Supabase → Authentication → URL Configuration добави адреса на Vercel в Redirect URLs.

Всеки push в `main` се качва автоматично.

## Как е направено

```
src/
  game/logic.ts       чиста логика: бикове/крави, кандидати, решател, точки (с тестове)
  game/service.ts     LocalService (в браузъра) и OnlineService (Supabase RPC)
  lib/supabase.ts     клиент; null = локален режим
  lib/fx.ts           звуци, конфети, ефекти
  hooks/useAuth.ts    сесия и профил
  components/         Header, Play, Result, Solver, Duel, Leaderboard, Avatar
supabase/migrations/  схема, RLS, игрови функции, изгледи за класиране
```

Принципи:

- **Тайното число никога не стига до браузъра** в онлайн режим. Генерира се и се проверява в Postgres функции (`new_game`, `make_guess`, `use_hint`, `give_up`), а колоната `games.secret` не се дава на API ролите.
- **Числото на деня** се извлича от датата и сол, която не се чете през API, така че да е еднакво за всички, но непредвидимо.
- **Точките** се смятат по една и съща формула в `logic.ts` и в SQL (`compute_score`): база × min(1.5, пар ÷ опити) × (1 + бонус за време до 25%).
- **Дуелът** ползва Supabase Realtime: presence за опитите на всеки и broadcast за старт, победа и реакции. Първият, който познае, се записва в `duels.winner_id` на сървъра.

## Пътна карта

- Класически дуел „един срещу друг“: всеки измисля число и познава чуждото на ходове.
- Постижения и серии от дни с числото на деня.
- Статистика на профила с графики.
- Режим с думи вместо цифри.
