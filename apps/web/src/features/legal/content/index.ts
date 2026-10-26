import type { Lang } from '@bc/i18n'
import type { InfoPages } from '../types'
import { bg } from './bg'
import { en } from './en'

const BY_LANG: Readonly<Record<Lang, InfoPages>> = { bg, en }

export function infoPages(lang: string): InfoPages {
  return lang === 'en' ? BY_LANG.en : BY_LANG.bg
}
