import { useEffect, useRef } from 'react'
import type { OppMovedEvent } from '../../features/duel/store'
import { sfx } from '../../lib/sound'

/** Plays `pop` whenever the opponent moves (the toast itself is rendered from the store). */
export function useOppFeedback(oppMoved: OppMovedEvent | null): void {
  const seen = useRef(oppMoved?.n ?? 0)
  useEffect(() => {
    if (!oppMoved || oppMoved.n === seen.current) return
    seen.current = oppMoved.n
    sfx.play('pop')
  }, [oppMoved])
}
