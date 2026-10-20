import type { ErrorCode, PublicState, ServerMsg } from '@bc/protocol'
import { create } from 'zustand'
import type { RealtimeStatus } from '../../lib/realtime'

type Evt<T extends ServerMsg['t']> = Omit<Extract<ServerMsg, { t: T }>, 't'>

export type VerdictEvent = Evt<'verdict'> & { n: number }
export type OppMovedEvent = Evt<'oppMoved'> & { n: number }
export type EndedEvent = Evt<'ended'>
export type RematchOffer = Evt<'rematchOffer'>
export interface WarningEvent {
  msLeft: number
  /** Local time the warning arrived, to count down without trusting server clocks. */
  at: number
}

/** What the opponent just did, ready for the UI to turn into a translated toast. */
export type ToastInfo =
  | { kind: 'solved'; n: number }
  | { kind: 'classic'; n: number; guess: string; bulls: number; cows: number }
  | { kind: 'race'; n: number; attempt: number }

export interface DuelStoreData {
  state: PublicState | null
  /** True when the very first snapshot after connecting was already an ended match (page reload). */
  resumedEnded: boolean
  verdict: VerdictEvent | null
  oppMoved: OppMovedEvent | null
  warning: WarningEvent | null
  toast: ToastInfo | null
  startAt: number | null
  ended: EndedEvent | null
  rematchOffer: RematchOffer | null
  errCode: ErrorCode | null
  cur: string
  shake: number
  parity: number
  miss: boolean
  status: RealtimeStatus
}

export interface DuelStore extends DuelStoreData {
  apply(msg: ServerMsg): void
  setStatus(status: RealtimeStatus): void
  press(digit: string): void
  back(): void
  clearCur(): void
  reject(code: ErrorCode): void
  reset(): void
}

const INITIAL: DuelStoreData = {
  state: null,
  resumedEnded: false,
  verdict: null,
  oppMoved: null,
  warning: null,
  toast: null,
  startAt: null,
  ended: null,
  rematchOffer: null,
  errCode: null,
  cur: '',
  shake: 0,
  parity: 0,
  miss: false,
  status: 'connecting',
}

/** Snapshot: replaces the state and drops events that belong to a finished phase. */
function applySnapshot(s: DuelStoreData, next: PublicState): Partial<DuelStoreData> {
  const turnChanged = s.state?.turnDeadline !== next.turnDeadline
  const stillEnded = next.phase === 'ended'
  return {
    state: next,
    resumedEnded: s.state === null ? stillEnded : s.resumedEnded,
    warning: turnChanged ? null : s.warning,
    ended: stillEnded ? s.ended : null,
    rematchOffer: stillEnded ? s.rematchOffer : null,
    startAt: next.phase === 'countdown' || next.phase === 'playing' ? s.startAt : null,
    parity: Math.max(s.parity, next.me.guesses.length),
  }
}

function oppToast(s: DuelStoreData, attempts: number, solved: boolean, n: number): ToastInfo {
  if (solved) return { kind: 'solved', n }
  const g = s.state?.format === 'classic' ? s.state.opp?.guesses[attempts - 1] : undefined
  if (g?.guess != null && g.bulls != null && g.cows != null) return { kind: 'classic', n, guess: g.guess, bulls: g.bulls, cows: g.cows }
  return { kind: 'race', n, attempt: attempts }
}

function reduceMsg(s: DuelStoreData, msg: ServerMsg): Partial<DuelStoreData> {
  switch (msg.t) {
    case 'state':
      return applySnapshot(s, msg.state)
    case 'verdict':
      return {
        verdict: { guess: msg.guess, bulls: msg.bulls, cows: msg.cows, consistent: msg.consistent, left: msg.left, attempts: msg.attempts, n: (s.verdict?.n ?? 0) + 1 },
        parity: s.parity + 1,
        miss: msg.bulls + msg.cows === 0,
        errCode: null,
      }
    case 'oppMoved': {
      const n = (s.oppMoved?.n ?? 0) + 1
      return { oppMoved: { attempts: msg.attempts, left: msg.left, solved: msg.solved, n }, toast: oppToast(s, msg.attempts, msg.solved === true, n) }
    }
    case 'countdown':
      return { startAt: msg.startAt }
    case 'started':
      return { startAt: null, warning: null }
    case 'warning':
      return { warning: { msLeft: msg.msLeft, at: Date.now() } }
    case 'ended':
      return { ended: { outcome: msg.outcome, reason: msg.reason, secrets: msg.secrets, rating: msg.rating, xp: msg.xp }, warning: null }
    case 'rematchOffer':
      return { rematchOffer: { from: msg.from, expiresAt: msg.expiresAt } }
    case 'error':
      return { errCode: msg.code, shake: s.shake + 1 }
  }
}

export const useDuelStore = create<DuelStore>()((set) => ({
  ...INITIAL,
  apply: (msg) => set((s) => reduceMsg(s, msg)),
  setStatus: (status) => set({ status }),
  press: (digit) => set((s) => ({ cur: s.cur + digit, errCode: null })),
  back: () => set((s) => ({ cur: s.cur.slice(0, -1), errCode: null })),
  clearCur: () => set({ cur: '' }),
  reject: (code) => set((s) => ({ errCode: code, shake: s.shake + 1 })),
  reset: () => set({ ...INITIAL }),
}))
