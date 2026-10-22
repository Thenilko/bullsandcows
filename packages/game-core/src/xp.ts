import type { Stars } from './scoring'

const DAILY_XP_BASE = 150
const DAILY_XP_PER_STAR = 20
const FREE_XP_BASE = 40
const FREE_XP_PER_STAR = 12
const FREE_XP_AFTER_LIMIT = 10
const STREAK_XP_PER_DAY = 10
const STREAK_XP_MAX = 70

/** Counted (non-practice) free games per Sofia day that earn the full XP. */
export const FREE_XP_GAMES_PER_DAY = 10

/** XP for every new badge tier (a single badge is one tier); none for the backfill. */
export const BADGE_TIER_XP = 50

/** +10 XP per day in the day streak (the day being won included), at most +70. */
export function dayStreakBonus(dayStreak: number): number {
  return Math.min(STREAK_XP_MAX, STREAK_XP_PER_DAY * Math.max(0, dayStreak))
}

/** XP for winning the number of the day; `dayStreak` includes that day. */
export function dailyXp(stars: Stars, dayStreak = 0): number {
  return DAILY_XP_BASE + DAILY_XP_PER_STAR * stars + dayStreakBonus(dayStreak)
}

/** XP for a counted free game; `nthToday` is its 1-based position among the day's free games. */
export function freeXp(stars: Stars, nthToday: number): number {
  if (nthToday > FREE_XP_GAMES_PER_DAY) return FREE_XP_AFTER_LIMIT
  return FREE_XP_BASE + FREE_XP_PER_STAR * stars
}
