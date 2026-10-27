import type { WeeklyDto, WeeklyRuleDto } from '@bc/protocol'
import type { TFunction } from 'i18next'

const MIN_MS = 60_000
const HOUR_MS = 60 * MIN_MS
const DAY_MS = 24 * HOUR_MS
const SECS_PER_MIN = 60

/** „3д 4ч“, „5ч 12м“ or „12 мин“ until `endsAt` (never negative). */
export function timeLeft(t: TFunction, endsAt: number, now: number): string {
  const ms = Math.max(0, endsAt - now)
  const d = Math.floor(ms / DAY_MS)
  const h = Math.floor((ms % DAY_MS) / HOUR_MS)
  const m = Math.floor((ms % HOUR_MS) / MIN_MS)
  if (d > 0) return t('weekly.left.days', { d, h })
  if (h > 0) return t('weekly.left.hours', { h, m })
  return t('weekly.left.minutes', { m: Math.max(1, m) })
}

const MONTHS: Readonly<Record<string, readonly string[]>> = {
  bg: ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

/** Short month names of the artboards (fixed, so every browser writes them the same). */
const monthName = (date: string, lang: string): string =>
  (MONTHS[lang === 'en' ? 'en' : 'bg'] ?? [])[Number(date.slice(5, 7)) - 1] ?? ''

const dayOf = (date: string): number => Number(date.slice(8, 10))

/** „20–26 окт“ or „26 окт – 1 ное“: the Monday and the Sunday of a week. */
export function weekDates(monday: string, sunday: string, lang: string): string {
  const to = `${dayOf(sunday)} ${monthName(sunday, lang)}`
  if (monday.slice(0, 7) === sunday.slice(0, 7)) return `${dayOf(monday)}–${to}`
  return `${dayOf(monday)} ${monthName(monday, lang)} – ${to}`
}

/** The chips of a rule: digits, zero, the attempts (and the time) — Р7 and the card in „Нова игра“. */
export function ruleChips(t: TFunction, rule: WeeklyRuleDto): string[] {
  return [
    t('common.digits', { count: rule.len }),
    t(rule.zero ? 'weekly.chip.zero' : 'weekly.chip.noZero'),
    t('weekly.chip.attempts', { count: rule.maxAttempts }),
    ...(rule.timeLimitSecs === null
      ? []
      : [t('weekly.chip.time', { count: Math.round(rule.timeLimitSecs / SECS_PER_MIN) })]),
  ]
}

export type WeeklyCta = 'play' | 'resume' | 'tomorrow'

/** One game a day: resume today's unfinished game, otherwise play, or wait until tomorrow once it is over. */
export function ctaOf(week: Pick<WeeklyDto, 'playedToday' | 'today'>): WeeklyCta {
  if (week.playedToday) return 'tomorrow'
  return week.today ? 'resume' : 'play'
}

export type DotState = 'used' | 'cur' | ''

/** `.wk-dots`: tries used, the current one, the rest. */
export function attemptDots(used: number, max: number, finished: boolean): DotState[] {
  return Array.from({ length: max }, (_, i) =>
    i < used ? 'used' : i === used && !finished ? 'cur' : '',
  )
}

/** „по-добре от N%“: the share of participants behind `place`. */
export function betterThan(place: number, participants: number): number | null {
  if (participants < 2) return null
  return Math.floor(((participants - place) / participants) * 100)
}
