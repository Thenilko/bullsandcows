import {
  DEFAULT_BARN_COLOR,
  isPastureUnlocked,
  levelFromXp,
  newPastureUnlocks,
  PASTURE_ITEMS,
  pastureItem,
  pastureProgress,
  unlockedPastureKeys,
  type PastureFacts,
  type PastureKey,
} from '@bc/game-core'
import type { PastureDto, PastureItemDto, PasturePatch } from '@bc/protocol'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { BadgeState, PastureSettings, Repo } from '../ports/repo'

const DEFAULTS: PastureSettings = { hiddenItems: [], barnColor: DEFAULT_BARN_COLOR }

/** The catalog's view of a player: the level from xp and the stored badge tiers. */
export function pastureFactsOf(xp: number, badges: readonly BadgeState[]): PastureFacts {
  return {
    level: levelFromXp(xp),
    badges: Object.fromEntries(badges.map((b) => [b.key, { tier: b.tier, progress: b.progress }])),
  }
}

/** What the player has unlocked right now; null without a profile row. */
export async function unlockedNow(repo: Repo, userId: string): Promise<PastureKey[] | null> {
  const [profile, badges] = await Promise.all([
    repo.profiles.get(userId),
    repo.badges.listOf(userId),
  ])
  return profile ? unlockedPastureKeys(pastureFactsOf(profile.xp, badges)) : null
}

/**
 * Rewards unlocked by what happened since `before` was taken (`unlockedNow` before the game's XP and badges
 * were written); empty without a snapshot or a profile.
 */
export async function unlocksSince(
  repo: Repo,
  userId: string,
  before: readonly PastureKey[] | null,
): Promise<PastureKey[]> {
  if (before === null) return []
  const after = await unlockedNow(repo, userId)
  return after ? newPastureUnlocks(before, after) : []
}

function viewOf(facts: PastureFacts, settings: PastureSettings): PastureDto {
  const hidden = new Set(settings.hiddenItems)
  const items = PASTURE_ITEMS.map((def): PastureItemDto => {
    const unlocked = isPastureUnlocked(def, facts)
    const base = { key: def.key, unlocked, shown: unlocked && !hidden.has(def.key) }
    return unlocked ? base : { ...base, progress: pastureProgress(def, facts) }
  })
  const colorOpen = isPastureUnlocked(pastureItem('barnColor'), facts)
  return {
    items,
    barnColor: colorOpen ? settings.barnColor : DEFAULT_BARN_COLOR,
    level: facts.level,
  }
}

async function load(repo: Repo, userId: string) {
  const [profile, badges, stored] = await Promise.all([
    repo.profiles.get(userId),
    repo.badges.listOf(userId),
    repo.pasture.get(userId),
  ])
  if (!profile) throw new AppError('ERR_NOT_FOUND', 404)
  return { facts: pastureFactsOf(profile.xp, badges), settings: stored ?? DEFAULTS }
}

/** `GET /api/me/pasture`. Guests have a pasture too (they have a level). */
export async function getPasture(repo: Repo, user: AuthUser): Promise<PastureDto> {
  const { facts, settings } = await load(repo, user.id)
  return viewOf(facts, settings)
}

/**
 * `PATCH /api/me/pasture`: replaces the hidden list and/or the colour. Hiding a locked reward is harmless (it
 * stays hidden once unlocked); a colour other than red while the choice is locked is `ERR_INPUT`.
 */
export async function patchPasture(
  repo: Repo,
  user: AuthUser,
  patch: PasturePatch,
): Promise<PastureDto> {
  const { facts, settings } = await load(repo, user.id)
  const color = patch.barnColor
  if (
    color &&
    color !== DEFAULT_BARN_COLOR &&
    !isPastureUnlocked(pastureItem('barnColor'), facts)
  ) {
    throw new AppError('ERR_INPUT', 400)
  }
  const next: PastureSettings = {
    hiddenItems: patch.hiddenItems ? [...new Set(patch.hiddenItems)] : settings.hiddenItems,
    barnColor: color ?? settings.barnColor,
  }
  await repo.pasture.save(user.id, next)
  return viewOf(facts, next)
}
