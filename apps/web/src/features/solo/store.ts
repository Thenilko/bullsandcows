import type { Len } from '@bc/game-core'
import type { ErrorCode } from '@bc/protocol'
import { create } from 'zustand'
import { eraseDigit, placeDigit } from '../../lib/code'

export type UiError = ErrorCode | 'LEN' | 'REPEAT' | 'NETWORK'
export type CountdownPhase = 'idle' | 'running' | 'done'

export interface Rules {
  len: Len
  zero: boolean
}

export interface Verdict {
  bulls: number
  cows: number
}

/** Transient UI state of one game; the game itself lives in the TanStack Query cache. */
export interface GameUi {
  /** The code being typed; `_` marks an empty slot before a filled one (see lib/code). */
  cur: string
  /** The slot chosen by tapping it: the next digit goes there. */
  sel: number | null
  err: UiError | null
  shake: number
  countdown: CountdownPhase
  /** Optimistic start time until the server value arrives. */
  localStartedAt: number | null
  parity: boolean
  miss: boolean
  solved: boolean
  lastVerdict: Verdict | null
}

export const INITIAL_UI: GameUi = {
  cur: '',
  sel: null,
  err: null,
  shake: 0,
  countdown: 'idle',
  localStartedAt: null,
  parity: true,
  miss: false,
  solved: false,
  lastVerdict: null,
}

export interface SoloState {
  ui: Readonly<Record<string, GameUi>>
  press(id: string, d: string, rules: Rules): void
  back(id: string): void
  /** Chooses a slot for the next digit; choosing it again lets go. */
  select(id: string, slot: number): void
  clear(id: string): void
  fail(id: string, err: UiError): void
  setCountdown(id: string, countdown: CountdownPhase): void
  markStarted(id: string, at: number): void
  /** Undo an optimistic start (the server refused it); the user can press Start again. */
  unstart(id: string): void
  verdict(id: string, v: Verdict, solved?: boolean): void
  reset(id: string): void
}

export const useSolo = create<SoloState>()((set, get) => {
  const patch = (id: string, change: (u: GameUi) => Partial<GameUi>) =>
    set((s) => {
      const prev = s.ui[id] ?? INITIAL_UI
      return { ui: { ...s.ui, [id]: { ...prev, ...change(prev) } } }
    })

  return {
    ui: {},
    press: (id, d, { len, zero }) => {
      const { cur, sel } = get().ui[id] ?? INITIAL_UI
      if (d === '0' && !zero) return
      const next = placeDigit(cur, len, d, sel)
      if (next === cur) return
      patch(id, () => ({ cur: next, sel: null, err: null }))
    },
    back: (id) => patch(id, (u) => ({ cur: eraseDigit(u.cur, u.sel), sel: null, err: null })),
    select: (id, slot) => patch(id, (u) => ({ sel: u.sel === slot ? null : slot })),
    clear: (id) => patch(id, () => ({ cur: '', sel: null })),
    fail: (id, err) => patch(id, (u) => ({ err, shake: u.shake + 1 })),
    setCountdown: (id, countdown) => patch(id, () => ({ countdown })),
    markStarted: (id, at) => patch(id, () => ({ localStartedAt: at, countdown: 'done' })),
    unstart: (id) => patch(id, () => ({ localStartedAt: null, countdown: 'idle' })),
    verdict: (id, v, solved = false) =>
      patch(id, (u) => ({
        cur: '',
        sel: null,
        err: null,
        parity: !u.parity,
        miss: v.bulls === 0 && v.cows === 0,
        solved,
        lastVerdict: v,
      })),
    reset: (id) =>
      set((s) => ({ ui: Object.fromEntries(Object.entries(s.ui).filter(([k]) => k !== id)) })),
  }
})

export function useGameUi(id: string): GameUi {
  return useSolo((s) => s.ui[id] ?? INITIAL_UI)
}
