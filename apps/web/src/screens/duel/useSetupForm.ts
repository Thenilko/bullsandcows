import type { Len } from '@bc/game-core'
import type { DuelFormat } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSession } from '../../features/auth/session'
import { duelApi, roomPath, saveInvite } from '../../features/duel/api'
import { ApiError } from '../../lib/api'
import { sfx } from '../../lib/sound'
import { settingsQuery } from './parts/params'

export type SetupMode = 'duel' | 'bot'
export type Opponent = 'quick' | 'friend'
export type BotLevel = 1 | 2 | 3 | 4
export type PickedMode = 'solo' | SetupMode

const DEFAULT_BOT_LEVEL: BotLevel = 2

export interface SetupForm {
  len: Len
  zero: boolean
  format: DuelFormat
  opponent: Opponent
  level: BotLevel
  isGuest: boolean
  busy: boolean
  error: string | null
  setLen(v: Len): void
  setZero(v: boolean): void
  setFormat(v: DuelFormat): void
  setOpponent(v: Opponent): void
  setLevel(v: BotLevel): void
  switchMode(m: PickedMode): void
  submit(): Promise<void>
}

/** State and actions of the duel/bot setup screen; guests are pinned to the friend opponent. */
export function useSetupForm(mode: SetupMode): SetupForm {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isGuest = useSession((s) => s.session?.user.isGuest ?? false)
  const defaultLen = useSession((s) => s.me?.profile.defaultLen ?? 4)
  const [len, setLen] = useState<Len>(defaultLen)
  const [zero, setZero] = useState(false)
  const [format, setFormat] = useState<DuelFormat>('race')
  const [picked, setOpponent] = useState<Opponent>(isGuest ? 'friend' : 'quick')
  const [level, setLevel] = useState<BotLevel>(DEFAULT_BOT_LEVEL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const opponent: Opponent = isGuest ? 'friend' : picked

  function switchMode(m: PickedMode) {
    sfx.play('tap')
    void navigate(m === 'solo' ? '/' : m === 'bot' ? '/bot/new' : '/duel/new')
  }

  async function create(settings: { len: Len; zero: boolean; format: DuelFormat }) {
    if (mode === 'bot') {
      const room = await duelApi.createBot({ ...settings, level })
      void navigate(roomPath(room.roomId, room.token))
      return
    }
    const invite = await duelApi.createInvite(settings)
    saveInvite(invite)
    void navigate(`/duel/invite/${invite.code}`, { state: invite })
  }

  async function submit() {
    sfx.play('tap')
    const settings = { len, zero, format }
    if (mode === 'duel' && opponent === 'quick') {
      void navigate(`/duel/queue?${settingsQuery(settings)}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await create(settings)
    } catch (e) {
      setError(t(e instanceof ApiError && e.status !== 0 ? `error.${e.code}` : 'error.network'))
    } finally {
      setBusy(false)
    }
  }

  return { len, zero, format, opponent, level, isGuest, busy, error, setLen, setZero, setFormat, setOpponent, setLevel, switchMode, submit }
}
