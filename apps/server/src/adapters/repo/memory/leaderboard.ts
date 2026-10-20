import {
  LEADERBOARD_LIMIT,
  type GameRow,
  type LeaderboardQuery,
  type LeaderboardRow,
  type Profile,
} from '../../../ports/repo'

type Finished = GameRow & { readonly finishedAt: number }

const isRanked = (g: GameRow): g is Finished =>
  g.won === true && !g.practice && g.finishedAt !== null

function inPeriod(g: Finished, q: LeaderboardQuery): boolean {
  if (g.len !== q.len || g.zero !== q.zero) return false
  if (q.period === 'today') return g.kind === 'daily' && g.dailyDate === q.date
  if (g.kind !== 'daily' && g.kind !== 'free') return false
  return q.period === 'all' || g.finishedAt >= q.weekStartMs
}

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Higher score first; then whoever finished earlier; then user id, so ties are stable. */
const better = (a: Finished, b: Finished): number =>
  b.score - a.score || a.finishedAt - b.finishedAt || compareIds(a.userId, b.userId)

/**
 * Spec §10: "today" ranks the counted daily game; "week"/"all" rank each player's best
 * single won solo game (daily or free, no practice). Guests are never ranked.
 */
export function rankLeaderboard(
  games: Iterable<GameRow>,
  profiles: ReadonlyMap<string, Profile>,
  q: LeaderboardQuery,
): LeaderboardRow[] {
  const best = new Map<string, Finished>()
  for (const g of games) {
    if (!isRanked(g) || !inPeriod(g, q)) continue
    const profile = profiles.get(g.userId)
    if (!profile || profile.isGuest) continue
    const current = best.get(g.userId)
    if (!current || better(g, current) < 0) best.set(g.userId, g)
  }
  return [...best.values()]
    .sort(better)
    .slice(0, LEADERBOARD_LIMIT)
    .map((g) => ({
      userId: g.userId,
      username: profiles.get(g.userId)?.username ?? '',
      attempts: g.attempts,
      score: g.score,
    }))
}
