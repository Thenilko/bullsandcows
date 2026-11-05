import { PIONEER_LIMIT, PIONEER_XP } from '@bc/game-core'
import type { NewBadgeDto, PioneerDto } from '@bc/protocol'
import type { Repo } from '../ports/repo'

/**
 * „Пионер“ for a profile that just became a member (sign-up or guest upgrade): the badge and `PIONEER_XP`
 * once, while fewer than `PIONEER_LIMIT` members hold it. The repo makes the count and the write atomic.
 * Returns the badge for the „Нова значка!“ toast, or nothing.
 */
export async function grantPioneer(
  repo: Repo,
  userId: string,
  now: number,
): Promise<NewBadgeDto[]> {
  const granted = await repo.badges.grantPioneer(userId, {
    now,
    limit: PIONEER_LIMIT,
    xp: PIONEER_XP,
  })
  return granted ? [{ key: 'pioneer', tier: 1 }] : []
}

/** Spots left (never below 0: a backfill or a race can only fill the limit, not pass it). */
export async function pioneerSpots(repo: Repo): Promise<PioneerDto> {
  const held = await repo.badges.pioneerCount()
  return { left: Math.max(0, PIONEER_LIMIT - held), limit: PIONEER_LIMIT }
}
