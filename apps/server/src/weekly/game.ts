import { parseWeekId, weekInfo, weeklyRule, type WeekInfo, type WeeklyRule } from '@bc/game-core'
import type { WeeklyGameInfoDto } from '@bc/protocol'
import type { PublicGameRow, Repo } from '../ports/repo'

const MS_PER_SEC = 1000

/** The limits a weekly game is played under: its week (with the end) and the rule. */
export interface WeeklyLimits {
  readonly week: WeekInfo
  readonly rule: WeeklyRule
}

/** Null for a game that is not a weekly one (or whose play row is missing). */
export async function weeklyLimitsOf(
  repo: Repo,
  game: PublicGameRow,
): Promise<WeeklyLimits | null> {
  if (game.kind !== 'weekly') return null
  const play = await repo.weekly.playByGame(game.id)
  const iso = play ? parseWeekId(play.weekId) : null
  return iso ? { week: weekInfo(iso), rule: weeklyRule(iso) } : null
}

/**
 * When the game is lost by the clock: the end of the week, or earlier for a timed rule once started. Checked on
 * the server for every guess and every read, so a client clock can neither stretch nor skip it.
 */
export function deadlineOf(limits: WeeklyLimits, startedAt: number | null): number {
  const { timeLimitSecs } = limits.rule
  if (timeLimitSecs === null || startedAt === null) return limits.week.endsAt
  return Math.min(limits.week.endsAt, startedAt + timeLimitSecs * MS_PER_SEC)
}

export const isOverdue = (limits: WeeklyLimits, game: PublicGameRow, now: number): boolean =>
  game.finishedAt === null && now >= deadlineOf(limits, game.startedAt)

export function weeklyInfoDto({ week, rule }: WeeklyLimits): WeeklyGameInfoDto {
  return {
    weekId: week.id,
    week: week.week,
    rule: {
      key: rule.key,
      len: rule.len,
      zero: rule.zero,
      maxAttempts: rule.maxAttempts,
      timeLimitSecs: rule.timeLimitSecs,
    },
    endsAt: week.endsAt,
  }
}

/** Whole seconds from the start (at least 1), or null when the start is unknown. */
export function playSecs(startedAt: number | null, finishedAt: number): number | null {
  return startedAt === null ? null : Math.max(1, Math.round((finishedAt - startedAt) / MS_PER_SEC))
}

/** Writes the end of a weekly game to its play row (a no-op for other games). */
export async function recordWeeklyEnd(
  repo: Repo,
  game: PublicGameRow,
  outcome: { readonly attempts: number; readonly won: boolean; readonly finishedAt: number },
): Promise<void> {
  if (game.kind !== 'weekly') return
  await repo.weekly.finishPlay(game.id, {
    attempts: outcome.attempts,
    won: outcome.won,
    secs: playSecs(game.startedAt, outcome.finishedAt),
    finishedAt: outcome.finishedAt,
  })
}
