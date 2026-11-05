import { levelFromXp } from '@bc/game-core'
import type { AdminOnlineDto } from '@bc/protocol'
import type { Clock } from '../ports/clock'
import type { Repo } from '../ports/repo'
import { toAdminGame } from './games'

const MINUTE_MS = 60_000
/** The client pings every minute; three minutes forgive one lost ping and a slow tab. */
export const ONLINE_MINUTES = 3
const ONLINE_MS = ONLINE_MINUTES * MINUTE_MS

/** Seen within the last `ONLINE_MINUTES` (the same window as the admin's „Онлайн сега“). */
export const isOnline = (lastSeenAt: number | null, now: number): boolean =>
  lastSeenAt !== null && lastSeenAt >= now - ONLINE_MS
/** An unfinished game older than this is an abandoned one, not what the player is doing now. */
const OPEN_GAME_MS = 3 * 60 * MINUTE_MS
const ONLINE_LIMIT = 200

/** Who is in the app right now, what they have open, and the solo game they are playing. */
export async function adminOnline({
  repo,
  clock,
}: {
  repo: Repo
  clock: Clock
}): Promise<AdminOnlineDto> {
  const now = clock.now()
  const rows = await repo.admin.online({
    since: now - ONLINE_MS,
    gameSince: now - OPEN_GAME_MS,
    limit: ONLINE_LIMIT,
  })
  return {
    windowMinutes: ONLINE_MINUTES,
    players: rows.map(({ xp, game, ...p }) => ({
      ...p,
      level: levelFromXp(xp),
      game: game ? toAdminGame(game) : null,
    })),
  }
}
