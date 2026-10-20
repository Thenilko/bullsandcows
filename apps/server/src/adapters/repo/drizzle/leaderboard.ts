import { and, asc, desc, eq, gte, inArray, isNotNull, type SQL } from 'drizzle-orm'
import { LEADERBOARD_LIMIT, type LeaderboardQuery, type LeaderboardRow } from '../../../ports/repo'
import type { Db } from './client'
import { games, profiles } from './schema'

function periodFilter(q: LeaderboardQuery): SQL | undefined {
  if (q.period === 'today') return and(eq(games.kind, 'daily'), eq(games.dailyDate, q.date))
  const solo = inArray(games.kind, ['daily', 'free'])
  return q.period === 'all' ? solo : and(solo, gte(games.finishedAt, new Date(q.weekStartMs)))
}

/** Same semantics as the memory repo: best won counted solo game per member, guests excluded. */
export async function drizzleLeaderboard(db: Db, q: LeaderboardQuery): Promise<LeaderboardRow[]> {
  const best = db
    .selectDistinctOn([games.userId], {
      userId: games.userId,
      username: profiles.username,
      attempts: games.attempts,
      score: games.score,
      finishedAt: games.finishedAt,
    })
    .from(games)
    .innerJoin(profiles, eq(profiles.id, games.userId))
    .where(
      and(
        periodFilter(q),
        eq(games.len, q.len),
        eq(games.zero, q.zero),
        eq(games.won, true),
        eq(games.practice, false),
        isNotNull(games.finishedAt),
        eq(profiles.isGuest, false),
      ),
    )
    .orderBy(games.userId, desc(games.score), asc(games.finishedAt))
    .as('best')
  const rows = await db
    .select({
      userId: best.userId,
      username: best.username,
      attempts: best.attempts,
      score: best.score,
    })
    .from(best)
    .orderBy(desc(best.score), asc(best.finishedAt))
    .limit(LEADERBOARD_LIMIT)
  return rows
}
