import type { GameViewDto, MeDto, NewBadgeDto, PastureKey } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '../../lib/sound'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { useBadgeToasts } from '../badges/toastStore'
import { hasNotes } from '../notebook/store'
import { invalidatePasture } from '../pasture/usePasture'
import { useUnlocks } from '../pasture/unlockStore'
import { invalidateBadges } from '../stats/useBadges'
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
  /** Where the end of the game leads: the result page, or `/weekly` for the weekly challenge. */
  resultPath: string
}

const readUi = (id: string) => useSolo.getState().ui[id] ?? INITIAL_UI

/** Shared plumbing: error reporting and leaving for the result page (or `resultPath`). */
function useGameEffects(gameId: string, resultPath = `/result/${gameId}`) {
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

  /**
   * The cached game, the badges, the pasture and the profile's current game are stale once a game ends; the
   * new badge tiers pop up over the result, then the new pasture rewards.
   */
  const toResult = useCallback(
    (newBadges: readonly NewBadgeDto[] | undefined, newUnlocks?: readonly PastureKey[]) => {
      void qc.invalidateQueries({ queryKey: gameKey(gameId) })
      invalidateBadges(qc)
      invalidatePasture(qc)
      api.get<MeDto>('/api/me').then(
        (me) => useSession.getState().setMe(me),
        () => void qc.invalidateQueries({ queryKey: ['me'] }),
      )
      void navigate(resultPath)
      useBadgeToasts.getState().push(newBadges)
      useUnlocks.getState().push(newUnlocks)
    },
    [qc, gameId, navigate, resultPath],
  )

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

function useSubmit(gameId: string, { game, started, finished, resultPath }: GameFlags, busyRef: React.RefObject<boolean>) {
  const { qc, onError, toResult } = useGameEffects(gameId, resultPath)
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
      const r = await sendGuess(gameId, cur.cur, hasNotes(gameId))
      qc.setQueryData<GameViewDto>(gameKey(gameId), (g) => {
        if (!g) return g
        const next = withGuess(g, cur.cur, r)
        // A lost weekly game is over right away: the input locks and the secret is known.
        return r.over ? { ...next, finishedAt: Date.now(), won: false, secret: r.secret } : next
      })
      // A lost weekly game locks the input like a win does (`solved` only gates input and leaving).
      useSolo.getState().verdict(gameId, r, r.solved || r.over === true)
      playVerdict(r, vibrate)
      if (r.solved) {
        winTimer.current = setTimeout(() => {
          playWin(vibrate)
          toResult(r.newBadges, r.newUnlocks)
        }, WIN_DELAY_MS)
      } else if (r.over) {
        // The weekly challenge's last allowed try missed: the game is lost.
        winTimer.current = setTimeout(() => {
          sfx.play('lose')
          toResult(r.newBadges, r.newUnlocks)
        }, WIN_DELAY_MS)
      }
    } catch (e) {
      onError(e)
    } finally {
      busyRef.current = false
    }
  }, [game, started, finished, gameId, qc, vibrate, onError, toResult, busyRef])
}

function useGiveUp(gameId: string, { started, finished, resultPath }: GameFlags, busyRef: React.RefObject<boolean>) {
  const { onError, toResult } = useGameEffects(gameId, resultPath)
  return useCallback(async () => {
    if (!started || finished || busyRef.current) return
    busyRef.current = true
    try {
      const r = await giveUpGame(gameId, hasNotes(gameId))
      sfx.play('lose')
      toResult(r.newBadges, r.newUnlocks)
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
