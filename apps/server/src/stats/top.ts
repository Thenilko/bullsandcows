import { FALLBACK_HISTOGRAM, topOf, type Len } from '@bc/game-core'
import type { DistributionDto } from '@bc/protocol'
import type { PublicGameRow, SoloKind } from '../ports/repo'

export interface DistributionQuery {
  readonly len: Len
  readonly zero: boolean
  readonly kind: SoloKind
  /** Sofia date; selects the day for `daily` (and is part of the cache key for both). */
  readonly date: string
}

/** Whatever answers a distribution query (the stats service, or a stub in tests). */
export interface DistributionSource {
  distribution(q: DistributionQuery): Promise<DistributionDto>
}

export const cacheKey = (q: DistributionQuery): string =>
  `${q.kind}|${q.len}|${q.zero ? 1 : 0}|${q.date}`

/** The daily game's date-specific query, or the free one (last 30 days), or none. */
export function queryOf(g: PublicGameRow, today: string): DistributionQuery | null {
  if (g.kind === 'daily' && g.dailyDate !== null) {
    return { kind: 'daily', len: g.len, zero: g.zero, date: g.dailyDate }
  }
  return g.kind === 'free' ? { kind: 'free', len: g.len, zero: g.zero, date: today } : null
}

/** "Top X%" of one game against the distribution its mode shows (the fallback for bots/duels). */
export async function topOfGame(
  source: DistributionSource,
  g: PublicGameRow,
  today: string,
): Promise<number> {
  const q = queryOf(g, today)
  const histogram = q ? (await source.distribution(q)).histogram : FALLBACK_HISTOGRAM[g.len]
  return topOf(g.attempts, histogram).top
}
