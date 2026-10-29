import type { Lang } from '@bc/i18n'

const locale = (lang: Lang): string => (lang === 'bg' ? 'bg-BG' : 'en-GB')
const SOFIA = 'Europe/Sofia'

export const formatCount = (n: number, lang: Lang): string => new Intl.NumberFormat(locale(lang)).format(n)

/** `2026-10-29` (a Sofia day) as „29 окт“. */
export const formatDay = (date: string, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )

export const formatDate = (ms: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: SOFIA }).format(ms)

export const formatDateTime = (ms: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SOFIA,
  }).format(ms)

export const formatTime = (ms: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit', timeZone: SOFIA }).format(ms)
