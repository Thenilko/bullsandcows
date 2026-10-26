import { badgeDef, type BadgeKey } from './badges'

/** The rewards of „Твоето пасище“ in catalog order (the order of the list and of `newUnlocks`). */
export const PASTURE_KEYS = [
  'dog',
  'sunflowers',
  'beehive',
  'rooster',
  'windmill',
  'pond',
  'barnColor',
  'shed',
  'goldenVane',
] as const
export type PastureKey = (typeof PASTURE_KEYS)[number]

/** A level to reach, or a badge to hold at least at `tier` (1 bronze, 2 silver, 3 gold). */
export type PastureRequirement =
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'badge'; readonly badge: BadgeKey; readonly tier: number }

export interface PastureItemDef {
  readonly key: PastureKey
  readonly requirement: PastureRequirement
  /** Drawn in the scene and shown or hidden by the player; the barn colour is a choice instead. */
  readonly toggle: boolean
}

const level = (key: PastureKey, n: number): PastureItemDef => ({
  key,
  requirement: { kind: 'level', level: n },
  toggle: key !== 'barnColor',
})
const badge = (key: PastureKey, b: BadgeKey, tier: number): PastureItemDef => ({
  key,
  requirement: { kind: 'badge', badge: b, tier },
  toggle: true,
})

/**
 * The catalog. Unlocking is never stored: it follows from the level and `user_badges`. The rooster needs the
 * 30-day streak (the design's „серия 30 дни“), which is the silver tier of „Серия“ (7 / 30 / 100).
 */
export const PASTURE_ITEMS: readonly PastureItemDef[] = [
  level('dog', 5),
  level('sunflowers', 10),
  badge('beehive', 'early', 1),
  badge('rooster', 'streak', 2),
  level('windmill', 15),
  level('pond', 20),
  level('barnColor', 25),
  level('shed', 30),
  level('goldenVane', 35),
]

const BY_KEY: ReadonlyMap<PastureKey, PastureItemDef> = new Map(PASTURE_ITEMS.map((i) => [i.key, i]))

export function pastureItem(key: PastureKey): PastureItemDef {
  const found = BY_KEY.get(key)
  if (!found) throw new Error(`unknown pasture item ${key}`)
  return found
}

export const isPastureKey = (value: unknown): value is PastureKey =>
  typeof value === 'string' && BY_KEY.has(value as PastureKey)

/** Barn colours; red is the barn as drawn, the others tint its walls. */
export const BARN_COLORS = {
  red: '#B5452F',
  blue: '#3B76B8',
  green: '#5E9E46',
  yellow: '#E2B44A',
  purple: '#8E5BA8',
} as const
export type BarnColor = keyof typeof BARN_COLORS
export const BARN_COLOR_KEYS = ['red', 'blue', 'green', 'yellow', 'purple'] as const satisfies readonly BarnColor[]
export const DEFAULT_BARN_COLOR: BarnColor = 'red'

export const isBarnColor = (value: unknown): value is BarnColor =>
  typeof value === 'string' && (BARN_COLOR_KEYS as readonly string[]).includes(value)

/** A badge as the catalog needs it: its tier and its progress metric. */
export interface BadgeProgressFact {
  readonly tier: number
  readonly progress: number
}

export interface PastureFacts {
  readonly level: number
  /** Badges without an entry are at tier 0, progress 0. */
  readonly badges: Partial<Record<BadgeKey, BadgeProgressFact>>
}

/** The number to reach: the level, or the badge threshold of the tier. */
export function requirementTarget(req: PastureRequirement): number {
  if (req.kind === 'level') return req.level
  return badgeDef(req.badge).thresholds[req.tier - 1] ?? 0
}

export function isPastureUnlocked(item: PastureItemDef, facts: PastureFacts): boolean {
  const req = item.requirement
  if (req.kind === 'level') return facts.level >= req.level
  return (facts.badges[req.badge]?.tier ?? 0) >= req.tier
}

/** Where the player stands: the level or the badge progress, capped at the target. */
export function pastureProgress(item: PastureItemDef, facts: PastureFacts): { current: number; target: number } {
  const req = item.requirement
  const target = requirementTarget(req)
  const raw = req.kind === 'level' ? facts.level : (facts.badges[req.badge]?.progress ?? 0)
  return { current: Math.max(0, Math.min(raw, target)), target }
}

export function unlockedPastureKeys(facts: PastureFacts): PastureKey[] {
  return PASTURE_ITEMS.filter((i) => isPastureUnlocked(i, facts)).map((i) => i.key)
}

/** Unlocked in `after` and not in `before`, in catalog order. */
export function newPastureUnlocks(before: readonly PastureKey[], after: readonly PastureKey[]): PastureKey[] {
  const had = new Set(before)
  return PASTURE_KEYS.filter((k) => after.includes(k) && !had.has(k))
}

/** The reward that the next level milestone above `current` brings (for „Следващата награда: …“). */
export function nextLevelUnlock(current: number): PastureItemDef | null {
  const ahead = PASTURE_ITEMS.filter((i) => i.requirement.kind === 'level' && i.requirement.level > current)
  const levelOf = (i: PastureItemDef) => (i.requirement.kind === 'level' ? i.requirement.level : 0)
  return [...ahead].sort((a, b) => levelOf(a) - levelOf(b))[0] ?? null
}
