import type { ClientMsg, PublicState } from '@bc/protocol'
import { useDuelStore } from '../../features/duel/store'
import { isComplete } from '../../lib/code'
import { useBuzz } from '../../features/duel/useFeedback'
import { hasNotes } from '../../features/notebook/store'
import { sfx } from '../../lib/sound'

const KEY_BUZZ = 6

export interface PlayInput {
  press(d: string): void
  back(): void
  select(slot: number): void
  submit(): void
}

/** Keypad handlers: validates locally (length, repeats), then sends the guess (with whether the notebook was used). */
export function usePlayInput(roomId: string, state: PublicState, send: (msg: ClientMsg) => void): PlayInput {
  const buzz = useBuzz()

  function rejectWith(code: 'ERR_CODE' | 'ERR_REPEAT'): void {
    sfx.play('err')
    useDuelStore.getState().reject(code)
  }

  return {
    press(d) {
      sfx.play('tap')
      buzz(KEY_BUZZ)
      useDuelStore.getState().press(d)
    },
    back() {
      sfx.play('tap')
      useDuelStore.getState().back()
    },
    select(slot) {
      sfx.play('tap')
      useDuelStore.getState().select(slot)
    },
    submit() {
      const { cur, clearCur } = useDuelStore.getState()
      if (!isComplete(cur, state.len)) return rejectWith('ERR_CODE')
      if (state.me.guesses.some((g) => g.guess === cur)) return rejectWith('ERR_REPEAT')
      send({ t: 'guess', code: cur, usedNotes: hasNotes(roomId) })
      clearCur()
    },
  }
}
