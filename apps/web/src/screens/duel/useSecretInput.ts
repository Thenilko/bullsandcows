import type { ClientMsg, PublicState } from '@bc/protocol'
import { useState } from 'react'
import { saveMySecret } from '../../features/duel/mySecret'
import { useDuelStore } from '../../features/duel/store'
import { useBuzz } from '../../features/duel/useFeedback'
import { sfx } from '../../lib/sound'

const KEY_BUZZ = 6
const CONFIRM_BUZZ = 30

export interface SecretInput {
  needDigits: boolean
  press(d: string): void
  back(): void
  confirm(): void
}

/** Keypad handlers for hiding my number; the code is kept in this tab for display after a reload. */
export function useSecretInput(roomId: string, state: PublicState, send: (msg: ClientMsg) => void): SecretInput {
  const buzz = useBuzz()
  const [needDigits, setNeedDigits] = useState(false)
  return {
    needDigits,
    press(d) {
      sfx.play('tap')
      buzz(KEY_BUZZ)
      setNeedDigits(false)
      useDuelStore.getState().press(d)
    },
    back() {
      sfx.play('tap')
      useDuelStore.getState().back()
    },
    confirm() {
      const { cur, clearCur } = useDuelStore.getState()
      if (cur.length !== state.len) {
        sfx.play('err')
        setNeedDigits(true)
        useDuelStore.getState().reject('ERR_CODE')
        return
      }
      sfx.play('bell')
      buzz(CONFIRM_BUZZ)
      saveMySecret(roomId, cur)
      send({ t: 'secret', code: cur })
      clearCur()
    },
  }
}
