import { displayRating } from '@bc/game-core'
import type { PublicMe, PublicOpp, PublicState } from '@bc/protocol'
import { revealFor } from './end'
import { otherSeat, playerAt, type Match, type Player, type Secrets, type Seat } from './types'

type PublicBase = Omit<PublicMe, 'guesses'>

const base = (p: Player): PublicBase => ({
  id: p.id,
  username: p.username,
  level: p.level,
  rating: displayRating(p.rating),
  isGuest: p.isGuest,
  ready: p.ready,
  hasSecret: p.hasSecret,
  left: p.left,
  connected: p.connected,
  disconnectedAt: p.disconnectedAt,
})

const meView = (p: Player): PublicMe => ({
  ...base(p),
  guesses: p.guesses.map((g) => ({ ...g })),
})

/** The opponent's guesses carry only the verdict, never the code. */
const oppView = (p: Player): PublicOpp => ({
  ...base(p),
  guesses: p.guesses.map(({ bulls, cows, at }) => ({ bulls, cows, at })),
})

/** What `forSeat` may see. Secrets appear only once the match has ended. */
export function publicView(m: Match, forSeat: Seat, s: Secrets): PublicState {
  const opp = m.players[otherSeat(forSeat)]
  const view: PublicState = {
    format: m.format,
    len: m.len,
    zero: m.zero,
    opponentKind: m.opponentKind,
    botLevel: m.botLevel,
    phase: m.phase,
    me: meView(playerAt(m, forSeat)),
    opp: opp ? oppView(opp) : null,
    mySeat: forSeat,
    turn: m.turn,
    firstMover: m.firstMover,
    countdownAt: m.countdownAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    turnDeadline: m.turnDeadline,
    outcome: m.outcome,
  }
  return m.phase === 'ended' ? { ...view, secrets: revealFor(m, s, forSeat) } : view
}
