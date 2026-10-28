import type { Lang } from '@bc/i18n'
import { LANGS } from '@bc/i18n'

export const LANG_STORAGE_KEY = 'bc.lang'
export const DEFAULT_LANG: Lang = 'bg'

const isLang = (v: string | null): v is Lang =>
  v !== null && (LANGS as readonly string[]).includes(v)

/** Profile language, then stored choice, then Bulgarian — the browser language is not consulted. */
export function detectLang(profileLang: Lang | null, stored: string | null): Lang {
  if (profileLang) return profileLang
  if (isLang(stored)) return stored
  return DEFAULT_LANG
}
