import type { PublicState } from '@bc/protocol'
import type { DuelStoreData } from '../../features/duel/store'
import { isWarning, turnMsLeft } from './parts/TurnTimer'
import type { OppStatus } from './parts/OppStrip'

export interface PlayModel {
  classic: boolean
  myTurn: boolean
  bot: boolean
  playing: boolean
  msLeft: number | null
  warn: boolean
  oppStatus: OppStatus
  botTurn: boolean
}

/** Everything DuelPlay derives from a snapshot, the latest events and the wall clock. */
export function playModel(state: PublicState, store: Pick<DuelStoreData, 'warning' | 'oppMoved'>, now: number, ended: boolean): PlayModel {
  const classic = state.format === 'classic'
  const myTurn = state.turn === state.mySeat
  const bot = state.opponentKind === 'bot'
  const playing = state.phase === 'playing' && !ended
  const msLeft = classic && playing ? turnMsLeft(state.turnDeadline, store.warning, now) : null
  const solved = store.oppMoved?.solved === true || state.opp?.guesses.some((g) => g.bulls === state.len) === true
  const status: OppStatus = solved ? 'solved' : !classic ? 'trying' : myTurn ? 'waiting' : 'thinking'
  return {
    classic,
    myTurn,
    bot,
    playing,
    msLeft,
    warn: isWarning(msLeft, store.warning !== null),
    oppStatus: status,
    botTurn: bot && playing && (classic ? !myTurn : true),
  }
}
