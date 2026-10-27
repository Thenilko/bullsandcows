import type { DuelRow, GameRow, GuessRow, Profile, PublicGameRow } from '../../../ports/repo'
import type { duels, games, guesses, profiles } from './schema'

const ms = (d: Date | null): number | null => (d ? d.getTime() : null)
export const toDate = (value: number | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(value)

export function toProfile(row: typeof profiles.$inferSelect): Profile {
  const { rating, ratingDev, volatility, createdAt, goldFrameUntil, ...rest } = row
  return {
    ...rest,
    goldFrameUntil: ms(goldFrameUntil),
    rating: { rating, rd: ratingDev, vol: volatility },
    createdAt: createdAt.getTime(),
  }
}

type GameSelect = typeof games.$inferSelect

export function toPublicGame(row: Omit<GameSelect, 'secret'>): PublicGameRow {
  return {
    ...row,
    startedAt: ms(row.startedAt),
    finishedAt: ms(row.finishedAt),
    createdAt: row.createdAt.getTime(),
  }
}

export function toGame(row: GameSelect): GameRow {
  return {
    ...row,
    startedAt: ms(row.startedAt),
    finishedAt: ms(row.finishedAt),
    createdAt: row.createdAt.getTime(),
  }
}

export const toGuess = (row: typeof guesses.$inferSelect): GuessRow => ({
  ...row,
  at: row.at.getTime(),
})

export function toDuel(row: typeof duels.$inferSelect): DuelRow {
  return { ...row, createdAt: row.createdAt.getTime(), finishedAt: ms(row.finishedAt) }
}
