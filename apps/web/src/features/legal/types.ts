export const INFO_KEYS = [
  'privacy',
  'terms',
  'legal',
  'changelog',
  'support',
  'story',
] as const
export type InfoKey = (typeof INFO_KEYS)[number]

export interface InfoSection {
  readonly h: string
  readonly p?: readonly string[]
  readonly list?: readonly string[]
}

export interface InfoPage {
  readonly title: string
  readonly intro: string
  /** Shown as „Последна промяна“ under the title (legal texts only). */
  readonly updated?: string
  readonly sections?: readonly InfoSection[]
  readonly faq?: readonly { readonly q: string; readonly a: string }[]
  readonly entries?: readonly { readonly date: string; readonly items: readonly string[] }[]
}

export type InfoPages = Readonly<Record<InfoKey, InfoPage>>
