import { useEffect, useRef, useState } from 'react'
import { useBuzz } from '../../features/duel/useFeedback'
import { sfx } from '../../lib/sound'

const ARRIVAL_BUZZ = [30, 40, 30]
const TICK_BUZZ = 15

export interface FoundFeedback {
  /** Increments each time the (human) opponent becomes ready; drives the toast. */
  readyToast: number
  tick(): void
}

/** Arrival jingle on mount, a bell + toast when the opponent gets ready, ticks during the countdown. */
export function useFoundFeedback(oppReady: boolean, bot: boolean): FoundFeedback {
  const buzz = useBuzz()
  const [readyToast, setReadyToast] = useState(0)
  const wasReady = useRef(oppReady)

  useEffect(() => {
    sfx.play('found')
    sfx.play('cow', 0.3)
    buzz(ARRIVAL_BUZZ)
    // arrival feedback is a one-shot on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (oppReady && !wasReady.current && !bot) {
      sfx.play('bell')
      setReadyToast((n) => n + 1)
    }
    wasReady.current = oppReady
  }, [oppReady, bot])

  return {
    readyToast,
    tick() {
      sfx.play('tap')
      buzz(TICK_BUZZ)
    },
  }
}
