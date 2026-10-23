import { resources, type Lang } from '@bc/i18n'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectLang, LANG_STORAGE_KEY } from './detectLang'

function readStored(): string | null {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY)
  } catch {
    return null
  }
}

const initial = detectLang(null, readStored(), typeof navigator === 'undefined' ? 'en' : navigator.language)

void i18next.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

if (typeof document !== 'undefined') document.documentElement.lang = initial

export function setLang(lang: Lang): void {
  void i18next.changeLanguage(lang)
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // storage may be unavailable
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

export default i18next
