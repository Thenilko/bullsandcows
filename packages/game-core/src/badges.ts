/**
 * The 29 badges in 8 groups (spec: docs/superpowers/specs/2026-10-22-share-and-badge-tiers.md,
 * part B). One threshold = a single badge (tier 0/1, drawn gold); three = bronze/silver/gold.
 * `progress` is the badge's metric (count, days, formats…); the server derives it in
 * `apps/server/src/stats/badgeMetrics.ts`.
 */
export const BADGE_KEYS = [
  'noWaste',
  'sherlock',
  'allCows',
  'lucky',
  'five',
  'pure',
  'underMinute',
  'bolt',
  'streak',
  'early',
  'night',
  'month',
  'duelist',
  'unbeaten',
  'comeback',
  'rematch',
  'bot1',
  'bot2',
  'bot3',
  'bot4',
  'formats',
  'notes',
  'invite',
  'family',
  'teller',
  'weekly',
  'mirror',
  'ladder',
  'zeroHero',
] as const
export type BadgeKey = (typeof BADGE_KEYS)[number]

export const BADGE_CATEGORIES = [
  'logic',
  'speed',
  'consistency',
  'duel',
  'bot',
  'collector',
  'together',
  'hidden',
] as const
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number]

/**
 * 24×24 stroke icon paths from the PasExtras artboard (`GLYPH` in `design/pasishte/PasExtras.dc.html`).
 * `cow` and `scarecrow` are drawn with the character heads instead of a path.
 */
export const BADGE_GLYPHS = {
  check: 'M5 12.5l4.2 4.2L19 7',
  search: 'M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5',
  cow: '',
  clover:
    'M12 11.5c-2-4-6.5-2.5-4.5 1C5 14 9 18 12 13.5M12 11.5c2-4 6.5-2.5 4.5 1C19 14 15 18 12 13.5M12 13.5V21',
  five: 'M16 4H9l-1 7c1.5-1 3-1.3 4.5-1 3 .6 4 3 3.6 5.3-.6 3-3.5 4.4-6.6 3.7-1.4-.3-2.6-1.1-3.5-2',
  target:
    'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2',
  clock: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 8v4l3 2',
  bolt: 'M13 2L5 13h6l-1 9 8-11h-6l1-9z',
  flame: 'M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z',
  sunrise: 'M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5 9.5l2 2M19 9.5l-2 2',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M9 15l2 2 4-4',
  swords: 'M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M7 17l-3 3M17 17l3 3M9 15l-2 2M15 15l2 2',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  comeback: 'M4 14a8 8 0 1 0 2.3-6.3L4 10M4 4v6h6',
  rematch: 'M17 2l3 3-3 3M20 5H9a5 5 0 0 0-5 5M7 22l-3-3 3-3M4 19h11a5 5 0 0 0 5-5',
  scarecrow: '',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  notebook: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M10 8h6M10 12h5',
  userplus: 'M10 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8M3 21c1-4 4-6 7-6s6 2 7 6M19 8v6M16 11h6',
  house: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6',
  share:
    'M18 8a3 3 0 1 0 0-6a3 3 0 1 0 0 6M6 15a3 3 0 1 0 0-6a3 3 0 1 0 0 6M18 22a3 3 0 1 0 0-6a3 3 0 1 0 0 6M8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  star: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z',
  question: 'M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 4M12 17.5h.01',
} as const
export type BadgeGlyph = keyof typeof BADGE_GLYPHS

export interface BadgeDef {
  readonly key: BadgeKey
  readonly category: BadgeCategory
  /** i18n keys: `badge.<key>.name` / `badge.<key>.desc`. */
  readonly nameKey: string
  readonly descKey: string
  readonly glyph: BadgeGlyph
  /** One value: a single badge; three: bronze, silver, gold. Strictly increasing. */
  readonly thresholds: readonly number[]
  /** Name and description are shown only once earned; „???“ before that. */
  readonly hidden?: boolean
  /** False: the feature it needs is not shipped yet („скоро“); progress stays 0. */
  readonly available: boolean
}

const def = (
  key: BadgeKey,
  category: BadgeCategory,
  glyph: BadgeGlyph,
  thresholds: readonly number[],
  extra: Partial<Pick<BadgeDef, 'hidden' | 'available'>> = {},
): BadgeDef => ({
  key,
  category,
  nameKey: `badge.${key}.name`,
  descKey: `badge.${key}.desc`,
  glyph,
  thresholds,
  available: true,
  ...extra,
})

export const BADGES: readonly BadgeDef[] = [
  // Логика
  def('noWaste', 'logic', 'check', [1, 10, 50]),
  def('sherlock', 'logic', 'search', [1, 5, 25]),
  def('allCows', 'logic', 'cow', [1]),
  def('lucky', 'logic', 'clover', [1]),
  def('five', 'logic', 'five', [1, 10, 50]),
  def('pure', 'logic', 'target', [1, 10, 25]),
  // Скорост
  def('underMinute', 'speed', 'clock', [1, 10, 50]),
  def('bolt', 'speed', 'bolt', [1, 5, 25]),
  // Постоянство
  def('streak', 'consistency', 'flame', [7, 30, 100]),
  def('early', 'consistency', 'sunrise', [1, 10, 30]),
  def('night', 'consistency', 'moon', [1, 10, 30]),
  def('month', 'consistency', 'calendar', [1]),
  // Дуели
  def('duelist', 'duel', 'swords', [1, 10, 100]),
  def('unbeaten', 'duel', 'trophy', [5, 10, 20]),
  def('comeback', 'duel', 'comeback', [1]),
  def('rematch', 'duel', 'rematch', [1, 10, 50]),
  // Плашилото
  def('bot1', 'bot', 'scarecrow', [1]),
  def('bot2', 'bot', 'scarecrow', [1]),
  def('bot3', 'bot', 'scarecrow', [1]),
  def('bot4', 'bot', 'scarecrow', [1]),
  // Колекционер
  def('formats', 'collector', 'grid', [6]),
  def('notes', 'collector', 'notebook', [10, 50, 200]),
  // Заедно
  def('invite', 'together', 'userplus', [1, 5, 20], { available: false }),
  def('family', 'together', 'house', [1], { available: false }),
  def('teller', 'together', 'share', [5, 25, 100]),
  def('weekly', 'together', 'star', [1, 4, 12], { available: false }),
  // Скрити
  def('mirror', 'hidden', 'question', [1], { hidden: true }),
  def('ladder', 'hidden', 'question', [1], { hidden: true }),
  def('zeroHero', 'hidden', 'question', [1], { hidden: true }),
]

const BY_KEY: ReadonlyMap<BadgeKey, BadgeDef> = new Map(BADGES.map((b) => [b.key, b]))

export function badgeDef(key: BadgeKey): BadgeDef {
  const found = BY_KEY.get(key)
  if (!found) throw new Error(`unknown badge ${key}`)
  return found
}

export const isBadgeKey = (value: unknown): value is BadgeKey =>
  typeof value === 'string' && BY_KEY.has(value as BadgeKey)

export const isTiered = (d: BadgeDef): boolean => d.thresholds.length > 1

/** The highest tier (0–3) whose threshold `progress` reaches; a single badge is 0 or 1. */
export function tierFor(d: BadgeDef, progress: number): number {
  return d.thresholds.filter((t) => progress >= t).length
}

/** The threshold of the tier after `tier`, or null once every tier is earned. */
export function nextThreshold(d: BadgeDef, tier: number): number | null {
  return d.thresholds[tier] ?? null
}

/** Tiers of a badge in total: 1 for a single one, 3 for a tiered one. */
export const maxTier = (d: BadgeDef): number => d.thresholds.length

export const BADGES_BY_CATEGORY: ReadonlyMap<BadgeCategory, readonly BadgeDef[]> = new Map(
  BADGE_CATEGORIES.map((c) => [c, BADGES.filter((b) => b.category === c)]),
)
