import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lt,
  or,
  type SQL,
} from 'drizzle-orm'
import {
  LEADERBOARD_LIMIT,
  type LeaderboardPlace,
  type LeaderboardQuery,
  type LeaderboardRow,
} from '../../../ports/repo'
import type { Db } from './client'
import { games, profiles } from './schema'

function periodFilter(q: LeaderboardQuery): SQL | undefined {
  if (q.period === 'today') return and(eq(games.kind, 'daily'), eq(games.dailyDate, q.date))
  const solo = inArray(games.kind, ['daily', 'free'])
  return q.period === 'all' ? solo : and(solo, gte(games.finishedAt, new Date(q.weekStartMs)))
}

/** Each member's best won counted solo game in the period; guests excluded. */
function bestPerPlayer(db: Db, q: LeaderboardQuery) {
  return db
    .selectDistinctOn([games.userId], {
      userId: games.userId,
      username: profiles.username,
      attempts: games.attempts,
      score: games.score,
      xp: profiles.xp,
      avatarSpecies: profiles.avatarSpecies,
      goldFrameUntil: profiles.goldFrameUntil,
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
}

/** Same semantics as the memory repo: score desc, earlier finish, then user id. */
export async function drizzleLeaderboard(db: Db, q: LeaderboardQuery): Promise<LeaderboardRow[]> {
  const best = bestPerPlayer(db, q)
  const rows = await db
    .select({
      userId: best.userId,
      username: best.username,
      attempts: best.attempts,
      score: best.score,
      xp: best.xp,
      avatarSpecies: best.avatarSpecies,
      goldFrameUntil: best.goldFrameUntil,
    })
    .from(best)
    .orderBy(desc(best.score), asc(best.finishedAt), asc(best.userId))
    .limit(LEADERBOARD_LIMIT)
  return rows.map((r) => ({ ...r, goldFrameUntil: r.goldFrameUntil ? new Date(r.goldFrameUntil).getTime() : null }))
}

/** The player's place: 1 + the number of players ahead of them in the same order. */
export async function drizzleRankOf(
  db: Db,
  q: LeaderboardQuery,
  userId: string,
): Promise<LeaderboardPlace | null> {
  const best = bestPerPlayer(db, q)
  const [mine] = await db
    .select({ attempts: best.attempts, score: best.score, finishedAt: best.finishedAt })
    .from(best)
    .where(eq(best.userId, userId))
    .limit(1)
  if (!mine?.finishedAt) return null
  const sameScore = eq(best.score, mine.score)
  const [ahead] = await db
    .select({ n: count() })
    .from(best)
    .where(
      or(
        gt(best.score, mine.score),
        and(sameScore, lt(best.finishedAt, mine.finishedAt)),
        and(sameScore, eq(best.finishedAt, mine.finishedAt), lt(best.userId, userId)),
      ),
    )
  return { attempts: mine.attempts, score: mine.score, rank: (ahead?.n ?? 0) + 1 }
}
