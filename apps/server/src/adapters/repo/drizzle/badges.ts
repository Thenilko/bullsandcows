import { and, count, eq, gt, sql } from 'drizzle-orm'
import type { BadgesRepo, BadgeState, PioneerGrant } from '../../../ports/repo'
import type { Db } from './client'
import { profiles, userBadges } from './schema'

const toState = (row: typeof userBadges.$inferSelect): BadgeState => ({
  key: row.badgeKey,
  tier: row.tier,
  progress: row.progress,
  earnedAt: row.earnedAt.getTime(),
})

/**
 * Every „Пионер“ grant (and the backfill in migration 0013) takes this transaction lock first, so the count
 * and the insert of two concurrent sign-ups never interleave.
 */
const PIONEER_LOCK = sql`select pg_advisory_xact_lock(hashtext('bc.pioneer'))`

/** One transaction: lock, count the members holding it, insert below the limit, then pay the XP once. */
function grantPioneer(db: Db, userId: string, { now, limit, xp }: PioneerGrant): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(PIONEER_LOCK)
    const inserted = await tx.execute(sql`
      insert into user_badges (user_id, badge_key, tier, progress, earned_at)
      select p.id, 'pioneer', 1, 1, ${new Date(now).toISOString()}::timestamptz
      from profiles p
      where p.id = ${userId}
        and not p.is_guest
        and (
          select count(*) from user_badges b join profiles m on m.id = b.user_id
          where b.badge_key = 'pioneer' and b.tier > 0 and not m.is_guest
        ) < ${limit}
      on conflict (user_id, badge_key) do nothing
      returning user_id`)
    if (inserted.length === 0) return false
    await tx
      .update(profiles)
      .set({ xp: sql`${profiles.xp} + ${xp}` })
      .where(eq(profiles.id, userId))
    return true
  })
}

export function drizzleBadges(db: Db): BadgesRepo {
  return {
    listOf: async (userId) => {
      const rows = await db.select().from(userBadges).where(eq(userBadges.userId, userId))
      return rows.map(toState)
    },
    // The service decides tier, progress and earnedAt; the row is simply overwritten.
    save: async (userId, rows) => {
      if (rows.length === 0) return
      const values = rows.map((r) => ({
        userId,
        badgeKey: r.key,
        tier: r.tier,
        progress: r.progress,
        earnedAt: new Date(r.earnedAt),
      }))
      await db
        .insert(userBadges)
        .values(values)
        .onConflictDoUpdate({
          target: [userBadges.userId, userBadges.badgeKey],
          set: {
            tier: sql`excluded.tier`,
            progress: sql`excluded.progress`,
            earnedAt: sql`excluded.earned_at`,
          },
        })
    },
    grantPioneer: (userId, grant) => grantPioneer(db, userId, grant),
    pioneerCount: async () => {
      const [row] = await db
        .select({ n: count() })
        .from(userBadges)
        .innerJoin(profiles, eq(profiles.id, userBadges.userId))
        .where(
          and(
            eq(userBadges.badgeKey, 'pioneer'),
            gt(userBadges.tier, 0),
            eq(profiles.isGuest, false),
          ),
        )
      return row?.n ?? 0
    },
  }
}
