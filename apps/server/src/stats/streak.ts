import type { DayStreak } from '../ports/repo'

const DAY_MS = 86_400_000
const ISO_DATE_LENGTH = 10

export const NO_STREAK: DayStreak = { currentStreak: 0, bestStreak: 0, streakDate: null }

/** The calendar day before a 'YYYY-MM-DD' date (Sofia dates are plain calendar dates). */
export function previousDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, ISO_DATE_LENGTH)
}

/**
 * The day streak after winning the number of day `date`: one more when the previous day
 * was in the streak, the same when that day already counts, else a fresh streak of one.
 */
export function nextDayStreak(prev: DayStreak, date: string): DayStreak {
  if (prev.streakDate !== null && date <= prev.streakDate) return prev
  const continues = prev.streakDate === previousDate(date)
  const currentStreak = continues ? prev.currentStreak + 1 : 1
  return {
    currentStreak,
    bestStreak: Math.max(prev.bestStreak, currentStreak),
    streakDate: date,
  }
}

/** The streak as it stands after all the given won days, in any order, for the backfill. */
export function dayStreakFromDates(dates: Iterable<string>): DayStreak {
  const sorted = [...new Set(dates)].sort()
  return sorted.reduce(nextDayStreak, NO_STREAK)
}
