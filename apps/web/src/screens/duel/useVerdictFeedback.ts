import { useEffect, useRef } from 'react'
import type { VerdictEvent } from '../../features/duel/store'
import { sfx } from '../../lib/sound'

const BULL_BUZZ = [30, 40, 30]
const OTHER_BUZZ = 20

/** Same sound and vibration choreography as solo play, driven by `verdict` events. */
export function useVerdictFeedback(verdict: VerdictEvent | null, buzz: (p: number | number[]) => void): void {
  const seen = useRef(verdict?.n ?? 0)
  useEffect(() => {
    if (!verdict || verdict.n === seen.current) return
    seen.current = verdict.n
    const { bulls, cows } = verdict
    if (bulls) {
      sfx.play('hooves')
      sfx.play('bull', 0.75)
    }
    if (cows) {
      sfx.play('bell', bulls ? 1.2 : 0.4)
      sfx.play('cow', bulls ? 1.5 : 0.8)
    }
    if (!bulls && !cows) sfx.play('miss')
    buzz(bulls ? BULL_BUZZ : OTHER_BUZZ)
  }, [verdict, buzz])
}
