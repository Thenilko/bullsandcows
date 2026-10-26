import type { Len } from './codes'
import { sofiaDate } from './daily'

/**
 * „Седмично предизвикателство“ (spec ЧАСТ 3): a week runs Monday 00:00 – Sunday 23:59:59 Europe/Sofia and is
 * numbered by its ISO week; the rule rotates with `(isoWeek + isoYear) % 4`, so it needs no database.
 */

export const WEEKLY_RULE_KEYS = ['fiveZero', 'threeNoZero', 'quickFour', 'fourZero'] as const
export type WeeklyRuleKey = (typeof WEEKLY_RULE_KEYS)[number]

export interface WeeklyRule {
  readonly key: WeeklyRuleKey
  readonly len: Len
  /** With zero, 0 may also be the first digit. */
  readonly zero: boolean
  /** The game is lost after this many wrong guesses. */
  readonly maxAttempts: number
  /** Seconds from the start; null: no time limit. */
  readonly timeLimitSecs: number | null
}

const QUICK_SECS = 180

/** The table of the spec, in rotation order. */
export const WEEKLY_RULES: readonly WeeklyRule[] = [
  { key: 'fiveZero', len: 5, zero: true, maxAttempts: 8, timeLimitSecs: null },
  { key: 'threeNoZero', len: 3, zero: false, maxAttempts: 6, timeLimitSecs: null },
  { key: 'quickFour', len: 4, zero: false, maxAttempts: 10, timeLimitSecs: QUICK_SECS },
  { key: 'fourZero', len: 4, zero: true, maxAttempts: 9, timeLimitSecs: null },
]

/** XP for everyone who won the week's number at least once; paid when the week is finalised. */
export const WEEKLY_WIN_XP = 300
/** The best this many players wear the gold frame through the following week. */
export const WEEKLY_GOLD_TOP = 10

const DAY_MS = 86_400_000
const WEEK_DAYS = 7
const THURSDAY_OFFSET = 3
const JAN_4 = 4
const DEC_28 = 28
const WEEK_ID = /^(\d{4})-W(\d{2})$/

export interface IsoWeek {
  readonly isoYear: number
  readonly week: number
}

/** A week with its Sofia calendar days and its bounds in Unix ms (`endsAt` is the next Monday's midnight). */
export interface WeekInfo extends IsoWeek {
  /** '2026-W44'. */
  readonly id: string
  /** Sofia dates 'YYYY-MM-DD' of its Monday and Sunday. */
  readonly monday: string
  readonly sunday: string
  readonly startsAt: number
  readonly endsAt: number
}

const utcDay = (date: string): number => Date.parse(`${date}T00:00:00Z`)
const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** ISO week of a calendar date 'YYYY-MM-DD' (Monday first; week 1 holds the year's first Thursday). */
export function isoWeekOf(date: string): IsoWeek {
  const ms = utcDay(date)
  const weekday = (new Date(ms).getUTCDay() + 6) % WEEK_DAYS
  const thursday = ms + (THURSDAY_OFFSET - weekday) * DAY_MS
  const isoYear = new Date(thursday).getUTCFullYear()
  const week = 1 + Math.floor((thursday - Date.UTC(isoYear, 0, 1)) / (WEEK_DAYS * DAY_MS))
  return { isoYear, week }
}

/** 52 or 53. */
export function weeksInIsoYear(isoYear: number): number {
  return isoWeekOf(isoDate(Date.UTC(isoYear, 11, DEC_28))).week
}

export const weekIdOf = ({ isoYear, week }: IsoWeek): string =>
  `${isoYear}-W${String(week).padStart(2, '0')}`

/** '2026-W44' → its year and number; null for anything else, also for a week the year does not have. */
export function parseWeekId(id: string): IsoWeek | null {
  const m = WEEK_ID.exec(id)
  if (!m) return null
  const isoYear = Number(m[1])
  const week = Number(m[2])
  if (week < 1 || week > weeksInIsoYear(isoYear)) return null
  return { isoYear, week }
}

const offsetFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Sofia',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/** Sofia's offset from UTC at `ms`, in ms (+2 h in winter, +3 h in summer). */
function sofiaOffset(ms: number): number {
  const parts = Object.fromEntries(
    offsetFormat.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  )
  const n = (key: string) => Number(parts[key])
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
  return wall - (ms - (ms % 1000))
}

/** 00:00 Europe/Sofia of a calendar date, in Unix ms (the clocks change at 03:00/04:00, never at midnight). */
export function sofiaMidnight(date: string): number {
  const wall = utcDay(date)
  const first = wall - sofiaOffset(wall)
  return wall - sofiaOffset(first)
}

/** Monday of week 1 is the Monday on or before 4 January. */
function mondayOf({ isoYear, week }: IsoWeek): string {
  const jan4 = Date.UTC(isoYear, 0, JAN_4)
  const weekday = (new Date(jan4).getUTCDay() + 6) % WEEK_DAYS
  return isoDate(jan4 - weekday * DAY_MS + (week - 1) * WEEK_DAYS * DAY_MS)
}

export function weekInfo(week: IsoWeek): WeekInfo {
  const monday = mondayOf(week)
  const nextMonday = isoDate(utcDay(monday) + WEEK_DAYS * DAY_MS)
  return {
    ...week,
    id: weekIdOf(week),
    monday,
    sunday: isoDate(utcDay(monday) + (WEEK_DAYS - 1) * DAY_MS),
    startsAt: sofiaMidnight(monday),
    endsAt: sofiaMidnight(nextMonday),
  }
}

/** The Sofia week that contains the instant `nowMs`. */
export function sofiaWeekAt(nowMs: number): WeekInfo {
  return weekInfo(isoWeekOf(sofiaDate(new Date(nowMs))))
}

/** The week after `week` (across the year boundary too). */
export function nextWeek(week: IsoWeek): WeekInfo {
  return weekInfo(isoWeekOf(isoDate(utcDay(mondayOf(week)) + WEEK_DAYS * DAY_MS)))
}

/** `rules[(isoWeek + isoYear) % 4]`. */
export function weeklyRule({ isoYear, week }: IsoWeek): WeeklyRule {
  return WEEKLY_RULES[(week + isoYear) % WEEKLY_RULES.length] as WeeklyRule
}

export interface WeeklyResult {
  readonly won: boolean
  readonly attempts: number
  /** Null when the start is unknown (ranks last among equals). */
  readonly secs: number | null
}

/** Better first: a win, then fewer attempts, then less time. */
export function compareWeekly(a: WeeklyResult, b: WeeklyResult): number {
  if (a.won !== b.won) return a.won ? -1 : 1
  if (a.attempts !== b.attempts) return a.attempts - b.attempts
  return (a.secs ?? Number.MAX_SAFE_INTEGER) - (b.secs ?? Number.MAX_SAFE_INTEGER)
}
