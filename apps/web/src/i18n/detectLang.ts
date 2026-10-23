import type { Lang } from '@bc/i18n'
import { LANGS } from '@bc/i18n'

export const LANG_STORAGE_KEY = 'bc.lang'

const isLang = (v: string | null): v is Lang => v !== null && (LANGS as readonly string[]).includes(v)

/** Profile language, then stored choice, then browser language (bg* -> bg, else en). */
export function detectLang(profileLang: Lang | null, stored: string | null, navigatorLang: string): Lang {
  if (profileLang) return profileLang
  if (isLang(stored)) return stored
  return navigatorLang.toLowerCase().startsWith('bg') ? 'bg' : 'en'
}
