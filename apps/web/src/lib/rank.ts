import { rankKeyForLevel } from '@bc/game-core'
import type { MeDto, RankKey } from '@bc/protocol'

/** Guests have no progression: they are always „Теленце“. */
export const GUEST_RANK: RankKey = 'calf'

export interface RankedPlayer {
  readonly level: number
  readonly isGuest: boolean
}

/** The title shown for a duel player: by level for members, the calf for guests. */
export function rankKeyOf(player: RankedPlayer): RankKey {
  return player.isGuest ? GUEST_RANK : rankKeyForLevel(player.level)
}

/** My own title from the session, the calf while signed out or as a guest. */
export function myRankKey(me: MeDto | null): RankKey {
  if (!me || me.profile.isGuest) return GUEST_RANK
  return me.rankKey
}
