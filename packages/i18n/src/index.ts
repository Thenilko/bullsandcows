import bg from './bg.json'
import en from './en.json'

export const resources = {
  bg: { translation: bg },
  en: { translation: en },
} as const

export const LANGS = ['bg', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_NS = 'translation'

type Tree = { readonly [key: string]: string | Tree }

/** Dotted flattened keys of a nested JSON tree, e.g. 'error.ERR_CODE'. */
type Flatten<T extends Tree, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends Tree
      ? Flatten<T[K], `${P}${K}.`>
      : never
}[keyof T & string]

type PluralBase<S extends string> = S extends `${infer B}_${'one' | 'other'}` ? B : S

/** Plural variants (`_one`/`_other`) collapse to their base key, as i18next expects. */
export type TranslationKey = PluralBase<Flatten<typeof bg>>
