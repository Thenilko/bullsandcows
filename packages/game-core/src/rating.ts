import { Glicko2, type Glicko2Player } from 'glicko2'
import type { Outcome } from './scoring'

export interface Rating {
  readonly rating: number
  readonly rd: number
  readonly vol: number
}

export const DEFAULT_RATING: Rating = { rating: 1500, rd: 350, vol: 0.06 }

const TAU = 0.5
const OUTCOME_SCORE: Readonly<Record<Outcome, number>> = { win: 1, draw: 0.5, lose: 0 }

const toRating = (p: Glicko2Player): Rating => ({
  rating: p.getRating(),
  rd: p.getRd(),
  vol: p.getVol(),
})

/** One Glicko-2 rating period containing a single match. `outcome` is from `me`'s side. */
export function updateRating(
  me: Rating,
  opp: Rating,
  outcome: Outcome,
): { me: Rating; opp: Rating } {
  const engine = new Glicko2({ tau: TAU, ...DEFAULT_RATING })
  const a = engine.makePlayer(me.rating, me.rd, me.vol)
  const b = engine.makePlayer(opp.rating, opp.rd, opp.vol)
  engine.updateRatings([[a, b, OUTCOME_SCORE[outcome]]])
  return { me: toRating(a), opp: toRating(b) }
}

export function displayRating(r: Rating): number {
  return Math.round(r.rating)
}
