# База данни (Supabase)

1. Създай проект на https://supabase.com и отвори **SQL Editor**.
2. Пусни `migrations/0001_init.sql` наведнъж. Алтернатива с CLI:
   ```sh
   supabase link --project-ref <ref>
   supabase db push
   ```
3. **Authentication → Providers**: включи Google (OAuth client от Google Cloud) и Email (magic link).
4. **Authentication → URL Configuration**: добави `http://localhost:5173` и адреса на Vercel в Redirect URLs.
5. **Project Settings → API**: копирай URL и anon ключа в `.env` на проекта.

Какво пази схемата:
- `games.secret` никога не се връща на клиента. Всички проверки стават през `make_guess`.
- Числото на деня се извлича от датата и сол в `app_config`, която не се чете през API.
- Класирането е в изгледите `leaderboard_daily` и `leaderboard_total`.
- Дуелите живеят в `duels`; стаята на живо е Supabase Realtime канал `duel:<код>`.
