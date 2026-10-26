import type { Len } from '@bc/game-core'
import type { ErrorCode } from '@bc/protocol'
import { create } from 'zustand'

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
  cur: string
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
      const { cur } = get().ui[id] ?? INITIAL_UI
      if (cur.length >= len || cur.includes(d) || (d === '0' && !zero)) return
      patch(id, () => ({ cur: cur + d, err: null }))
    },
    back: (id) => patch(id, (u) => ({ cur: u.cur.slice(0, -1), err: null })),
    clear: (id) => patch(id, () => ({ cur: '' })),
    fail: (id, err) => patch(id, (u) => ({ err, shake: u.shake + 1 })),
    setCountdown: (id, countdown) => patch(id, () => ({ countdown })),
    markStarted: (id, at) => patch(id, () => ({ localStartedAt: at, countdown: 'done' })),
    unstart: (id) => patch(id, () => ({ localStartedAt: null, countdown: 'idle' })),
    verdict: (id, v, solved = false) =>
      patch(id, (u) => ({
        cur: '',
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
