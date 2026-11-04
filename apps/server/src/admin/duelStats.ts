import type { AdminDuelStatsDto } from '@bc/protocol'
import type { Clock } from '../ports/clock'
import type { Repo } from '../ports/repo'

const DAY_MS = 86_400_000
export const DUEL_STATS_DAYS = 30
/** A pause of 10 minutes or more is someone who left the game open, not thinking. */
const MAX_GAP_MS = 10 * 60_000

const oneDecimal = (v: number): number => Math.round(v * 10) / 10

/** How people fare against the bot, how duels end and how long a guess takes, over the last 30 days. */
export async function adminDuelStats({
  repo,
  clock,
}: {
  repo: Repo
  clock: Clock
}): Promise<AdminDuelStatsDto> {
  const rows = await repo.admin.duelStats({
    since: clock.now() - DUEL_STATS_DAYS * DAY_MS,
    maxGapMs: MAX_GAP_MS,
  })
  return {
    windowDays: DUEL_STATS_DAYS,
    bot: rows.bot.map((r) => ({
      ...r,
      humanAttempts: r.humanAttempts === null ? null : oneDecimal(r.humanAttempts),
    })),
    outcomes: [...rows.outcomes],
    think: rows.think.map((r) => ({ ...r, p50: oneDecimal(r.p50), p90: oneDecimal(r.p90) })),
  }
}
