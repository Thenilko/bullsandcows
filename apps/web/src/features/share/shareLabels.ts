import { shareDuration } from '@bc/game-core'
import type { TFunction } from 'i18next'
import type { ShareModel } from './shareModel'

/** The texts the card shows (on screen and in the PNG), already translated. */
export interface ShareLabels {
  readonly title: string
  readonly titleAccent: string
  /** „Число на деня #127 · 22 окт“, „Свободна игра · 4 цифри“, „Дуел с Боби“. */
  readonly heading: string
  /** „5 опита“ or „не позна“. */
  readonly big: string
  /** The time (solo) or the outcome (duel), on the right of `big`. */
  readonly aside: string
  /** „ТОП 20% днес“ for a daily win with a known rank; null otherwise. */
  readonly top: string | null
  readonly better: string
}

const SOFIA_TZ = 'Europe/Sofia'
const SHORT_MONTH_LETTERS = 3

/** „22 окт“ in Bulgarian (the first three letters of the month), the locale's short form otherwise. */
export function formatShareDate(ms: number, lang: string): string {
  const date = new Date(ms)
  if (!lang.startsWith('bg')) {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: SOFIA_TZ }).format(date)
  }
  const day = new Intl.DateTimeFormat('bg', { day: 'numeric', timeZone: SOFIA_TZ }).format(date)
  const month = new Intl.DateTimeFormat('bg', { month: 'long', timeZone: SOFIA_TZ }).format(date)
  return `${day} ${month.slice(0, SHORT_MONTH_LETTERS)}`
}

function headingOf(model: ShareModel, t: TFunction, lang: string): string {
  const { input } = model
  switch (input.kind) {
    case 'daily': {
      const date = model.finishedAt === null ? '' : formatShareDate(model.finishedAt, lang)
      return t('share.daily', { n: input.dailyNumber, date }).replace(/ · $/, '')
    }
    case 'free':
      return t('share.free', { digits: t('common.digits', { count: input.len }) })
    case 'duel':
      return t('share.duel', { name: input.opponent })
  }
}

function asideOf(model: ShareModel, t: TFunction): string {
  const { input } = model
  if (input.kind === 'duel') return t(`outcome.${input.outcome}`)
  return input.secs === undefined ? '' : shareDuration(input.secs)
}

/** „ТОП X% днес“ only for a daily win whose rank is known. */
function topOf(input: ShareModel['input'], t: TFunction): string | null {
  if (input.kind !== 'daily' || !input.won || typeof input.top !== 'number') return null
  return t('share.top', { top: input.top })
}

export function shareLabels(model: ShareModel, t: TFunction, lang: string): ShareLabels {
  const { input } = model
  const attempts = t('common.attempts', { count: input.rows.length })
  const won = input.kind === 'duel' ? input.outcome === 'win' : input.won
  return {
    title: 'Бикове',
    titleAccent: 'и крави',
    heading: headingOf(model, t, lang),
    big: input.kind === 'duel' || won ? attempts : t('share.lost'),
    aside: asideOf(model, t),
    top: topOf(input, t),
    better: t('share.better'),
  }
}
