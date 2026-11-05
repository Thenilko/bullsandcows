-- „Пионер“ for the members who registered before the badge existed: oldest profile first, up to the 100 spots
-- (PIONEER_LIMIT), each with the one-time +100 XP (PIONEER_XP). Idempotent: a holder is never picked again and
-- nothing is given past the limit, so running it twice changes nothing. Takes the same lock as
-- `grantPioneer` (adapters/repo/drizzle/badges.ts); drizzle's migrator runs inside a transaction.
SELECT pg_advisory_xact_lock(hashtext('bc.pioneer'));
--> statement-breakpoint
WITH taken AS (
  SELECT count(*)::int AS n
  FROM user_badges b
  JOIN profiles p ON p.id = b.user_id
  WHERE b.badge_key = 'pioneer' AND b.tier > 0 AND NOT p.is_guest
),
candidates AS (
  SELECT p.id
  FROM profiles p
  WHERE NOT p.is_guest
    AND NOT EXISTS (
      SELECT 1 FROM user_badges b WHERE b.user_id = p.id AND b.badge_key = 'pioneer'
    )
  ORDER BY p.created_at, p.id
  LIMIT (SELECT greatest(0, 100 - n) FROM taken)
),
granted AS (
  INSERT INTO user_badges (user_id, badge_key, tier, progress, earned_at)
  SELECT id, 'pioneer', 1, 1, now() FROM candidates
  ON CONFLICT (user_id, badge_key) DO NOTHING
  RETURNING user_id
)
UPDATE profiles SET xp = xp + 100 WHERE id IN (SELECT user_id FROM granted);
