import type { ClientMsg, PublicState } from '@bc/protocol'
import { useDuelStore } from '../../features/duel/store'
import { useBuzz } from '../../features/duel/useFeedback'
import { sfx } from '../../lib/sound'

const KEY_BUZZ = 6

export interface PlayInput {
  press(d: string): void
  back(): void
  submit(): void
}

/** Keypad handlers: validates locally (length, repeats), then sends the guess. */
export function usePlayInput(state: PublicState, send: (msg: ClientMsg) => void): PlayInput {
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
    submit() {
      const { cur, clearCur } = useDuelStore.getState()
      if (cur.length !== state.len) return rejectWith('ERR_CODE')
      if (state.me.guesses.some((g) => g.guess === cur)) return rejectWith('ERR_REPEAT')
      send({ t: 'guess', code: cur })
      clearCur()
    },
  }
}
