import { nextWeek, parseWeekId } from '@bc/game-core'
import type { Repo } from '../ports/repo'
import { recomputeBadges } from '../stats/badgeService'
import { resultsOf, standings } from './model'

/**
 * Finalises every week that has ended and is not finalised yet (spec ЧАСТ 3 т. 5): +300 XP for each player
 * with a win, the gold frame until the end of the next week for the top 10, the results kept for П8, then
 * the „Седмичник“ badge. Idempotent per `week_id`: the repo writes everything in one transaction that
 * first checks `finalized_at`, so the two Cron Triggers and the lazy run on `GET /api/weekly` never pay twice.
 * Returns the weeks finalised by this call.
 */
export async function finalizeDueWeeks(repo: Repo, now: number): Promise<string[]> {
  const done: string[] = []
  for (const week of await repo.weekly.dueWeeks(now)) {
    const iso = parseWeekId(week.weekId)
    if (!iso) continue
    const s = standings(await repo.weekly.finishedPlays(week.weekId))
    const finalized = await repo.weekly.finalize({
      weekId: week.weekId,
      now,
      participants: s.participants,
      results: resultsOf(s, week.weekId),
      goldFrameUntil: nextWeek(iso).endsAt,
    })
    if (!finalized) continue
    done.push(week.weekId)
    for (const { entry } of s.ranked) {
      await recomputeBadges(repo, { userId: entry.userId, scope: 'share', now, payXp: true })
    }
  }
  return done
}
