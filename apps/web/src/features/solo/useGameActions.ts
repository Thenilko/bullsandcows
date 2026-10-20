import type { GameViewDto, MeDto } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '../../lib/sound'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { giveUpGame, sendGuess, startGame } from './api'
import { withGuess } from './derive'
import { playRejected, playVerdict, playWin, WIN_DELAY_MS } from './feedback'
import { gameKey, toUiError } from './gameKey'
import { INITIAL_UI, useSolo, type UiError } from './store'

export interface GameActions {
  press(d: string): void
  back(): void
  beginCountdown(): void
  start(): Promise<void>
  submit(): Promise<void>
  giveUp(): Promise<void>
}

export interface GameFlags {
  game: GameViewDto | undefined
  started: boolean
  finished: boolean
}

const readUi = (id: string) => useSolo.getState().ui[id] ?? INITIAL_UI

/** Shared plumbing: error reporting and leaving for the result page. */
function useGameEffects(gameId: string) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const onError = useCallback(
    (e: unknown) => {
      const code = toUiError(e)
      useSolo.getState().fail(gameId, code)
      if (code === 'ERR_FINISHED' || code === 'ERR_NOT_STARTED') void qc.refetchQueries({ queryKey: gameKey(gameId) })
    },
    [gameId, qc],
  )

  /** The cached game and the profile's current game are stale once a game ends. */
  const toResult = useCallback(() => {
    void qc.invalidateQueries({ queryKey: gameKey(gameId) })
    api.get<MeDto>('/api/me').then(
      (me) => useSession.getState().setMe(me),
      () => void qc.invalidateQueries({ queryKey: ['me'] }),
    )
    void navigate(`/result/${gameId}`)
  }, [qc, gameId, navigate])

  return { qc, onError, toResult }
}

function useStartActions(gameId: string, started: boolean) {
  const { qc, onError } = useGameEffects(gameId)
  const start = useCallback(async () => {
    useSolo.getState().markStarted(gameId, Date.now())
    try {
      const r = await startGame(gameId)
      qc.setQueryData<GameViewDto>(gameKey(gameId), (g) => (g ? { ...g, startedAt: r.startedAt } : g))
    } catch (e) {
      useSolo.getState().unstart(gameId)
      onError(e)
    }
  }, [gameId, qc, onError])

  const beginCountdown = useCallback(() => {
    if (started || readUi(gameId).countdown !== 'idle') return
    sfx.play('tap')
    useSolo.getState().setCountdown(gameId, 'running')
  }, [gameId, started])

  return { start, beginCountdown }
}

function useInputActions(gameId: string, { game, started, finished }: GameFlags) {
  const len = game?.len
  const zero = game?.zero
  const press = useCallback(
    (d: string) => {
      if (len === undefined || zero === undefined || !started || finished) return
      sfx.play('tap')
      useSolo.getState().press(gameId, d, { len, zero })
    },
    [gameId, len, zero, started, finished],
  )
  const back = useCallback(() => {
    sfx.play('tap')
    useSolo.getState().back(gameId)
  }, [gameId])
  return { press, back }
}

function useSubmit(gameId: string, { game, started, finished }: GameFlags, busyRef: React.RefObject<boolean>) {
  const { qc, onError, toResult } = useGameEffects(gameId)
  const vibrate = useSession((s) => s.me?.profile.vibrate ?? false)
  const winTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(winTimer.current), [])

  return useCallback(async () => {
    const cur = readUi(gameId)
    if (!game || !started || finished || cur.solved || busyRef.current) return
    const err: UiError | null = cur.cur.length !== game.len ? 'LEN' : game.guesses.some((g) => g.guess === cur.cur) ? 'REPEAT' : null
    if (err) {
      useSolo.getState().fail(gameId, err)
      playRejected(vibrate)
      return
    }
    busyRef.current = true
    try {
      const r = await sendGuess(gameId, cur.cur)
      qc.setQueryData<GameViewDto>(gameKey(gameId), (g) => (g ? withGuess(g, cur.cur, r) : g))
      useSolo.getState().verdict(gameId, r, r.solved)
      playVerdict(r, vibrate)
      if (r.solved) {
        winTimer.current = setTimeout(() => {
          playWin(vibrate)
          toResult()
        }, WIN_DELAY_MS)
      }
    } catch (e) {
      onError(e)
    } finally {
      busyRef.current = false
    }
  }, [game, started, finished, gameId, qc, vibrate, onError, toResult, busyRef])
}

function useGiveUp(gameId: string, { started, finished }: GameFlags, busyRef: React.RefObject<boolean>) {
  const { onError, toResult } = useGameEffects(gameId)
  return useCallback(async () => {
    if (!started || finished || busyRef.current) return
    busyRef.current = true
    try {
      await giveUpGame(gameId)
      sfx.play('lose')
      toResult()
    } catch (e) {
      onError(e)
    } finally {
      busyRef.current = false
    }
  }, [started, finished, gameId, toResult, onError, busyRef])
}

export function useGameActions(gameId: string, flags: GameFlags): GameActions {
  const busyRef = useRef(false)
  const input = useInputActions(gameId, flags)
  const startActions = useStartActions(gameId, flags.started)
  const submit = useSubmit(gameId, flags, busyRef)
  const giveUp = useGiveUp(gameId, flags, busyRef)
  return { ...input, ...startActions, submit, giveUp }
}
