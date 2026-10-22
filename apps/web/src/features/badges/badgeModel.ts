import {
  BADGE_CATEGORIES,
  BADGES,
  badgeDef,
  isTiered,
  nextThreshold,
  type BadgeCategory,
  type BadgeDef,
} from '@bc/game-core'
import type { BadgeKey, BadgeStateDto, NewBadgeDto } from '@bc/protocol'

export type TierName = 'none' | 'bronze' | 'silver' | 'gold'
export type MedalClass = 'md-none' | 'md-bronze' | 'md-silver' | 'md-gold'
export type PipClass = '' | 'on1' | 'on2' | 'on3'
/** What the threshold counts: `badges.need.<unit>`. */
export type NeedUnit = 'times' | 'days' | 'formats'

export interface BadgeStep {
  readonly tierName: Exclude<TierName, 'none'>
  readonly threshold: number
  readonly done: boolean
  readonly md: MedalClass
}

/** One badge as the collection and the detail draw it. */
export interface BadgeView {
  readonly key: BadgeKey
  readonly def: BadgeDef
  readonly tier: number
  readonly progress: number
  readonly next: number | null
  /** One threshold: a single badge, drawn gold once earned. */
  readonly single: boolean
  /** Tier 0: grey medallion. */
  readonly locked: boolean
  /** A hidden badge not earned yet: „???“ instead of the name and the description. */
  readonly secret: boolean
  readonly tierName: TierName
  readonly md: MedalClass
  readonly pips: readonly PipClass[]
  readonly steps: readonly BadgeStep[]
  /** Progress towards the next tier, 0..1 (1 once every tier is earned). */
  readonly fraction: number
  readonly unit: NeedUnit
}

export interface BadgeGroup {
  readonly category: BadgeCategory
  readonly items: readonly BadgeView[]
  readonly earned: number
}

export interface CollectionSummary {
  readonly earned: number
  readonly total: number
  readonly tiers: number
  readonly left: number
  readonly fraction: number
}

const TIER_NAMES: readonly TierName[] = ['none', 'bronze', 'silver', 'gold']
const MEDALS: readonly MedalClass[] = ['md-none', 'md-bronze', 'md-silver', 'md-gold']
const STEP_NAMES: readonly Exclude<TierName, 'none'>[] = ['bronze', 'silver', 'gold']
const UNITS: Readonly<Partial<Record<BadgeKey, NeedUnit>>> = { streak: 'days', formats: 'formats' }

const tierNameOf = (single: boolean, tier: number): TierName =>
  tier === 0 ? 'none' : single ? 'gold' : (TIER_NAMES[tier] ?? 'gold')

const medalOf = (single: boolean, tier: number): MedalClass =>
  tier === 0 ? 'md-none' : single ? 'md-gold' : (MEDALS[tier] ?? 'md-gold')

function pipsOf(def: BadgeDef, single: boolean, tier: number): PipClass[] {
  if (single) return [tier > 0 ? 'on3' : '']
  return def.thresholds.map((_, i) => (tier > i ? (`on${i + 1}` as PipClass) : ''))
}

function stepsOf(def: BadgeDef, single: boolean, progress: number): BadgeStep[] {
  return def.thresholds.map((threshold, i) => ({
    tierName: single ? 'gold' : (STEP_NAMES[i] ?? 'gold'),
    threshold,
    done: progress >= threshold,
    md: single ? 'md-gold' : (MEDALS[i + 1] ?? 'md-gold'),
  }))
}

/** The view of one badge from its server state (`next` as the server computed it). */
export function badgeView(state: BadgeStateDto): BadgeView {
  const def = badgeDef(state.key)
  const single = !isTiered(def)
  const { tier, progress, next } = state
  return {
    key: state.key,
    def,
    tier,
    progress,
    next,
    single,
    locked: tier === 0,
    secret: def.hidden === true && tier === 0,
    tierName: tierNameOf(single, tier),
    md: medalOf(single, tier),
    pips: pipsOf(def, single, tier),
    steps: stepsOf(def, single, progress),
    fraction: next === null ? 1 : Math.min(1, progress / Math.max(1, next)),
    unit: UNITS[state.key] ?? 'times',
  }
}

const EMPTY = (key: BadgeKey): BadgeStateDto => ({
  key,
  tier: 0,
  progress: 0,
  next: nextThreshold(badgeDef(key), 0),
  earnedAt: null,
})

/** All 29 badges in the order of `BADGES`; those the server did not mention are at tier 0. */
export function badgeViews(states: readonly BadgeStateDto[] | undefined): BadgeView[] {
  const byKey = new Map((Array.isArray(states) ? states : []).map((s) => [s.key, s]))
  return BADGES.map((def) => badgeView(byKey.get(def.key) ?? EMPTY(def.key)))
}

/** The 8 groups of the collection, in the order of `BADGE_CATEGORIES`. */
export function groupBadges(views: readonly BadgeView[]): BadgeGroup[] {
  return BADGE_CATEGORIES.map((category) => {
    const items = views.filter((v) => v.def.category === category)
    return { category, items, earned: items.filter((v) => !v.locked).length }
  })
}

/** „N значки · M степени · K предстоят“ and the bar of the „Колекция“ card. */
export function collectionSummary(views: readonly BadgeView[]): CollectionSummary {
  const earned = views.filter((v) => !v.locked).length
  const tiers = views.reduce((sum, v) => sum + (v.single ? Math.min(1, v.tier) : v.tier), 0)
  const total = views.length
  return { earned, total, tiers, left: total - earned, fraction: total === 0 ? 0 : earned / total }
}

/**
 * The view of a tier earned just now, before (or without) the refreshed list: the progress is taken
 * as the threshold just reached. A fresher state from the server wins when present.
 */
export function viewOfNew(badge: NewBadgeDto, states?: readonly BadgeStateDto[]): BadgeView {
  const fresh = states?.find((s) => s.key === badge.key)
  if (fresh && fresh.tier >= badge.tier) return badgeView(fresh)
  const def = badgeDef(badge.key)
  const tier = Math.min(badge.tier, def.thresholds.length)
  return badgeView({
    key: badge.key,
    tier,
    progress: def.thresholds[tier - 1] ?? 0,
    next: nextThreshold(def, tier),
    earnedAt: Date.now(),
  })
}
