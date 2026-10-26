import type { Len } from './codes'
import type { Outcome } from './scoring'

/** The verdict of one of MY attempts; digits are never part of the text. */
export interface ShareRow {
  readonly bulls: number
  readonly cows: number
}

interface ShareBase {
  readonly len: Len
  /** My attempts in order. */
  readonly rows: readonly ShareRow[]
  /** `VITE_PUBLIC_URL` on the client; the footer appends `/?s=share`. */
  readonly publicUrl: string
}

interface SoloShare extends ShareBase {
  readonly won: boolean
  /** Duration in whole seconds; left out when unknown. */
  readonly secs?: number
}

export interface DailyShare extends SoloShare {
  readonly kind: 'daily'
  readonly dailyNumber: number
  /** "Top X% today" of a win; null or absent before the sample exists. */
  readonly top?: number | null
}

export interface FreeShare extends SoloShare {
  readonly kind: 'free'
}

export interface DuelShare extends ShareBase {
  readonly kind: 'duel'
  readonly opponent: string
  readonly outcome: Outcome
}

export type ShareTextInput = DailyShare | FreeShare | DuelShare

export const SHARE_TITLE = 'Бикове и крави'
export const SHARE_PATH = '/?s=share'
const BULL = '🐂'
const COW = '🐄'
const BLANK = '⬜'
const SEP = ' · '
const OUTCOME_TEXT: Readonly<Record<Outcome, string>> = {
  win: 'победа',
  lose: 'загуба',
  draw: 'равно',
}
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

const two = (n: number): string => String(n).padStart(2, '0')

/** `MM:SS`, or `H:MM:SS` from an hour on. */
export function shareDuration(secs: number): string {
  const whole = Math.max(0, Math.round(secs))
  const hours = Math.floor(whole / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR))
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR
  const seconds = whole % SECONDS_PER_MINUTE
  const base = `${two(minutes)}:${two(seconds)}`
  return hours > 0 ? `${hours}:${base}` : base
}

/** Bulls first, then cows, then blanks: sorted, so the positions stay secret. */
export function shareRow(row: ShareRow, len: Len): string {
  const bulls = Math.max(0, Math.min(len, row.bulls))
  const cows = Math.max(0, Math.min(len - bulls, row.cows))
  return BULL.repeat(bulls) + COW.repeat(cows) + BLANK.repeat(len - bulls - cows)
}

const attemptsText = (n: number): string => (n === 1 ? '1 опит' : `${n} опита`)

const resultPart = (won: boolean, attempts: number): string =>
  won ? attemptsText(attempts) : 'не позна'

function header(input: ShareTextInput): string {
  switch (input.kind) {
    case 'daily': {
      const parts = [
        `${SHARE_TITLE} #${input.dailyNumber}`,
        resultPart(input.won, input.rows.length),
      ]
      return [...parts, ...(input.secs === undefined ? [] : [shareDuration(input.secs)])].join(SEP)
    }
    case 'free': {
      const parts = [
        SHARE_TITLE,
        'Свободна игра',
        `${input.len} цифри`,
        resultPart(input.won, input.rows.length),
      ]
      return [...parts, ...(input.secs === undefined ? [] : [shareDuration(input.secs)])].join(SEP)
    }
    case 'duel':
      return [
        SHARE_TITLE,
        `Дуел с ${input.opponent}`,
        OUTCOME_TEXT[input.outcome],
        attemptsText(input.rows.length),
      ].join(SEP)
  }
}

/** A daily win with a known "top X%" boasts it; everything else asks „Можеш ли по-добре?“. */
function footer(input: ShareTextInput): string {
  const link = `${input.publicUrl}${SHARE_PATH}`
  const top = input.kind === 'daily' && input.won ? input.top : null
  return top === null || top === undefined
    ? `Можеш ли по-добре?${SEP}${link}`
    : `Топ ${top}% днес${SEP}${link}`
}

/** The text for the chat (spec, part A §3): header, one emoji row per attempt, footer. */
export function shareText(input: ShareTextInput): string {
  const rows = input.rows.map((r) => shareRow(r, input.len))
  return [header(input), ...rows, footer(input)].join('\n')
}
