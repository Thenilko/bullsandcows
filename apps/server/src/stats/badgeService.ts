import {
  BADGE_TIER_XP,
  BADGES,
  badgeDef,
  nextThreshold,
  tierFor,
  type BadgeCategory,
  type BadgeKey,
} from '@bc/game-core'
import type { BadgeStateDto, NewBadgeDto } from '@bc/protocol'
import type { BadgeState, DuelRow, PublicGameRow, Repo } from '../ports/repo'
import {
  badgeProgress,
  EMPTY_FACTS,
  type BadgeEvent,
  type BadgeFacts,
  type DuelFact,
  type GameFact,
} from './badgeMetrics'
import { sofiaHour } from './time'

/** Games and duels read per recompute (the same bound as the profile stats). */
export const HISTORY_LIMIT = 1_000

/**
 * Which badges an event can move: a finished game (solo, duel or bot) touches everything but
 * the „together“ group, a share only that group, the backfill all of them.
 */
export type BadgeScope = 'game' | 'share' | 'all'

const SCOPE_CATEGORIES: Readonly<Record<BadgeScope, readonly BadgeCategory[]>> = {
  game: ['logic', 'speed', 'consistency', 'duel', 'bot', 'collector', 'hidden'],
  share: ['together'],
  all: ['logic', 'speed', 'consistency', 'duel', 'bot', 'collector', 'together', 'hidden'],
}

export const badgesInScope = (scope: BadgeScope): BadgeKey[] =>
  BADGES.filter((b) => SCOPE_CATEGORIES[scope].includes(b.category)).map((b) => b.key)

export interface BadgeProgressEntry {
  readonly key: BadgeKey
  readonly progress: number
}

export interface BadgeMerge {
  /** Rows to write: every badge whose progress or tier moved. */
  readonly rows: readonly BadgeState[]
  readonly newBadges: readonly NewBadgeDto[]
  /** Tiers gained in total (a single badge counts one). */
  readonly newTiers: number
}

/**
 * Pure: the stored states against freshly computed progress. Progress and tier never go down
 * (a shorter history window or a one-off event seen earlier must not undo anything); a tier
 * reached now gets `earnedAt = now`, otherwise the row keeps its time.
 */
export function mergeBadgeStates(
  current: readonly BadgeState[],
  computed: readonly BadgeProgressEntry[],
  now: number,
): BadgeMerge {
  const stored = new Map(current.map((s) => [s.key, s]))
  const rows: BadgeState[] = []
  const newBadges: NewBadgeDto[] = []
  let newTiers = 0
  for (const { key, progress: fresh } of computed) {
    const def = badgeDef(key)
    const prev = stored.get(key) ?? { key, tier: 0, progress: 0, earnedAt: now }
    const progress = Math.max(prev.progress, fresh)
    const tier = Math.max(prev.tier, tierFor(def, progress))
    if (progress === prev.progress && tier === prev.tier) continue
    const gained = tier > prev.tier
    rows.push({ key, tier, progress, earnedAt: gained ? now : prev.earnedAt })
    if (gained) {
      newBadges.push({ key, tier })
      newTiers += tier - prev.tier
    }
  }
  return { rows, newBadges, newTiers }
}

/** The API shape of all 29 badges: keys only (a hidden one at tier 0 is shown as „???“). */
export function toBadgeStates(current: readonly BadgeState[]): BadgeStateDto[] {
  const stored = new Map(current.map((s) => [s.key, s]))
  return BADGES.map((def) => {
    const s = stored.get(def.key)
    const tier = s?.tier ?? 0
    return {
      key: def.key,
      tier,
      progress: s?.progress ?? 0,
      next: nextThreshold(def, tier),
      earnedAt: tier > 0 && s ? s.earnedAt : null,
    }
  })
}

/** Held (tier ≥ 1) per key, for `MeDto.badges`. */
export function heldBadges(current: readonly BadgeState[]): Readonly<Record<BadgeKey, boolean>> {
  const held = new Set(current.filter((s) => s.tier > 0).map((s) => s.key))
  return Object.fromEntries(BADGES.map((b) => [b.key, held.has(b.key)])) as Record<
    BadgeKey,
    boolean
  >
}

const durationOf = (g: PublicGameRow): number | null =>
  g.startedAt === null || g.finishedAt === null ? null : g.finishedAt - g.startedAt

/** Counted, finished games as facts; unfinished and practice games are left out. */
export function toGameFacts(games: readonly PublicGameRow[]): GameFact[] {
  return games.flatMap((g) => {
    if (g.finishedAt === null || g.practice) return []
    return [
      {
        kind: g.kind,
        len: g.len,
        zero: g.zero,
        won: g.won === true,
        attempts: g.attempts,
        wasted: g.wasted,
        durationMs: durationOf(g),
        hourSofia: sofiaHour(g.finishedAt),
        dailyDate: g.dailyDate,
        usedNotes: g.usedNotes,
      },
    ]
  })
}

/** Finished duels of `userId` as facts, oldest first (the repo lists newest first). */
export function toDuelFacts(userId: string, duels: readonly DuelRow[]): DuelFact[] {
  return [...duels].reverse().map((d) => {
    const won = d.winner === userId
    return {
      vsHuman: d.opponentKind !== 'bot' && d.playerB !== null,
      won,
      botLevel: d.botLevel,
      isRematch: d.isRematch,
      comeback: won && d.comeback,
    }
  })
}

export interface RecomputeInput {
  readonly userId: string
  readonly scope: BadgeScope
  readonly now: number
  /** One-off events of the game that just ended. */
  readonly events?: readonly BadgeEvent[]
  /** The player's history when the caller has it already (any order; filtered here). */
  readonly games?: readonly PublicGameRow[]
  /** False for the backfill: tiers are written, no XP is paid. */
  readonly payXp: boolean
}

async function gatherFacts(repo: Repo, input: RecomputeInput): Promise<BadgeFacts> {
  const { userId, scope } = input
  const withGames = scope !== 'share'
  const withShares = scope !== 'game'
  const [games, profile, duels, shares] = await Promise.all([
    withGames ? (input.games ?? repo.games.history(userId, HISTORY_LIMIT)) : [],
    withGames ? repo.profiles.get(userId) : null,
    withGames ? repo.duels.listOf(userId, HISTORY_LIMIT) : [],
    withShares ? repo.shares.countOf(userId) : 0,
  ])
  return {
    ...EMPTY_FACTS,
    games: toGameFacts(games),
    bestDayStreak: profile?.bestStreak ?? 0,
    duels: toDuelFacts(userId, duels),
    shares,
    events: input.events ?? [],
  }
}

/**
 * Recomputes the badges an event can move, writes the rows that changed and pays
 * `BADGE_TIER_XP` per new tier (unless `payXp` is false). Returns the tiers earned now.
 * Idempotent: running it again with the same facts changes nothing.
 */
export async function recomputeBadges(repo: Repo, input: RecomputeInput): Promise<NewBadgeDto[]> {
  const facts = await gatherFacts(repo, input)
  const computed = badgesInScope(input.scope).map((key) => ({
    key,
    progress: badgeProgress(key, facts),
  }))
  const current = await repo.badges.listOf(input.userId)
  const merged = mergeBadgeStates(current, computed, input.now)
  await repo.badges.save(input.userId, merged.rows)
  if (input.payXp && merged.newTiers > 0) {
    await repo.profiles.addXp(input.userId, BADGE_TIER_XP * merged.newTiers)
  }
  return [...merged.newBadges]
}
