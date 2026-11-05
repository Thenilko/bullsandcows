import type { PublicState } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useBadgeToasts } from '../../features/badges/toastStore'
import { useDuelStore } from '../../features/duel/store'
import { invalidateBadges } from '../../features/stats/useBadges'
import { refreshMe } from '../../features/stats/useMe'
import { invalidatePasture } from '../../features/pasture/usePasture'
import { useUnlocks } from '../../features/pasture/unlockStore'
import { useBuzz } from '../../features/duel/useFeedback'
import { WIN_DELAY_MS } from '../../features/solo/feedback'
import { sfx } from '../../lib/sound'
import { outcomeOf } from './duelUtils'

/** As in the solo game: the last verdict plays out, then the result (and its confetti) comes quickly. */
export const RESULT_DELAY_MS = WIN_DELAY_MS
const WIN_BUZZ = [40, 60, 40, 60, 160]
const LOSE_BUZZ = [80]

/**
 * On match end: win/lose sound and vibration, then the result route after `RESULT_DELAY_MS` (the solo 900 ms),
 * where the new badge tiers (from `ended`) pop up one by one and the profile reloads (the duel's XP and
 * rating). Returns whether it ended.
 */
export function useEndFlow(roomId: string, state: PublicState, go: (to: string) => void): boolean {
  const endedEvent = useDuelStore((s) => s.ended)
  const qc = useQueryClient()
  const buzz = useBuzz()
  const outcome = outcomeOf(state, endedEvent)
  const isEnded = outcome !== null

  useEffect(() => {
    if (!outcome) return
    sfx.play(outcome === 'lose' ? 'lose' : 'win')
    buzz(outcome === 'win' ? WIN_BUZZ : LOSE_BUZZ)
    const id = setTimeout(() => {
      go(`/duel/${encodeURIComponent(roomId)}/result`)
      invalidateBadges(qc)
      invalidatePasture(qc)
      refreshMe(qc)
      const ended = useDuelStore.getState().ended
      useBadgeToasts.getState().push(ended?.newBadges)
      useUnlocks.getState().push(ended?.newUnlocks)
    }, RESULT_DELAY_MS)
    return () => clearTimeout(id)
    // `go` and `buzz` are stable enough for a one-shot ending; re-running would restart the delay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, roomId])

  return isEnded
}
