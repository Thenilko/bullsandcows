import type { PublicState, RatingChangeDto, RematchOfferDto } from '@bc/protocol'
import { settle } from '../duel/settle'
import { otherSeat, type Match, type Secrets, type Seat } from '../duel/types'
import { publicView } from '../duel/view'
import type { RoomMeta } from './state'

/** What the seat's `ended` event carried (abandoned: no rating, no xp). */
export function seatResult(
  m: Match,
  seat: Seat,
): { rating: RatingChangeDto | null; xp: number } | undefined {
  if (m.phase !== 'ended' || !m.outcome) return undefined
  if (m.outcome.reason === 'abandoned') return { rating: null, xp: 0 }
  const r = settle(m)
  return { rating: r.ratingDelta?.[seat] ?? null, xp: r.xp[seat] }
}

/** A pending offer as the seat sees it; the opponent's offer wins when both exist. */
export function pendingOffer(m: Match, seat: Seat): RematchOfferDto | null {
  const theirs = m.rematch[otherSeat(seat)]
  if (theirs !== null) return { from: 'opp', expiresAt: theirs }
  const mine = m.rematch[seat]
  return mine !== null ? { from: 'me', expiresAt: mine } : null
}

/**
 * The `state` a seat gets: the machine's `publicView`, plus (once ended) the seat's rating
 * change, XP and any pending rematch offer, so a reloaded client can rebuild the result screen.
 */
export function snapshot(
  m: Match,
  seat: Seat,
  s: Secrets,
  meta?: Pick<RoomMeta, 'gameIds'>,
): PublicState {
  const view = publicView(m, seat, s)
  if (m.phase !== 'ended') return view
  const me = meta?.gameIds ? { ...view.me, gameId: meta.gameIds[seat] } : view.me
  return { ...view, me, ...seatResult(m, seat), rematchOffer: pendingOffer(m, seat) }
}
