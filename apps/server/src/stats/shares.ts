import type { ShareBody, ShareResultDto } from '@bc/protocol'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Repo } from '../ports/repo'
import { recomputeBadges } from './badgeService'
import { unlockedNow, unlocksSince } from './pasture'

/**
 * `POST /api/shares`: records that the user shared one of their finished games (any channel;
 * one row per game, spec A §6) and moves the „teller“ badge. Guests are accepted and ignored.
 */
export async function recordShare(
  repo: Repo,
  user: AuthUser,
  body: ShareBody,
  now: number,
): Promise<ShareResultDto> {
  if (user.isGuest) return { counted: false }
  const game = await repo.games.get(body.gameId)
  if (!game || game.userId !== user.id || game.finishedAt === null) {
    throw new AppError('ERR_NOT_FOUND', 404)
  }
  const added = await repo.shares.add({
    userId: user.id,
    gameId: game.id,
    channel: body.channel,
    createdAt: now,
  })
  if (!added) return { counted: false }
  const before = await unlockedNow(repo, user.id)
  const newBadges = await recomputeBadges(repo, {
    userId: user.id,
    scope: 'share',
    now,
    payXp: true,
  })
  return { counted: true, newBadges, newUnlocks: await unlocksSince(repo, user.id, before) }
}
