import { isBarnColor, isPastureKey, PASTURE_ITEMS, pastureItem, type PastureKey, type PastureRequirement } from '@bc/game-core'
import type { PastureDto, PastureItemDto, PasturePatch } from '@bc/protocol'
import type { ScenePasture } from '../../components/scene/rewards'

/** What the scenes draw from the player's pasture. */
export function toScenePasture(dto: PastureDto): ScenePasture {
  return { shown: dto.items.filter((i) => i.shown).map((i) => i.key), barnColor: dto.barnColor }
}

export const isAllUnlocked = (dto: PastureDto): boolean => dto.items.every((i) => i.unlocked)

export const unlockedCount = (dto: PastureDto): number => dto.items.filter((i) => i.unlocked).length

/** The rewards with a show/hide switch, in catalog order (the barn colour has its own card). */
export function toggleItems(dto: PastureDto): PastureItemDto[] {
  const toggles = new Set(PASTURE_ITEMS.filter((d) => d.toggle).map((d) => d.key))
  return dto.items.filter((i) => toggles.has(i.key))
}

/** The rewards the player hides now: unlocked and not shown. */
export function hiddenKeys(dto: PastureDto): PastureKey[] {
  return dto.items.filter((i) => i.unlocked && !i.shown).map((i) => i.key)
}

/** The patch that shows (`show`) or hides one reward. */
export function togglePatch(dto: PastureDto, key: PastureKey, show: boolean): PasturePatch {
  const hidden = hiddenKeys(dto).filter((k) => k !== key)
  return { hiddenItems: show ? hidden : [...hidden, key] }
}

/** The view after a patch, for the optimistic update; the input is left untouched. */
export function applyPasturePatch(dto: PastureDto, patch: PasturePatch): PastureDto {
  const hidden = patch.hiddenItems ? new Set(patch.hiddenItems) : null
  const items = dto.items.map((i) => (hidden && i.unlocked ? { ...i, shown: !hidden.has(i.key) } : i))
  return { ...dto, items, barnColor: patch.barnColor ?? dto.barnColor }
}

export const requirementOf = (key: PastureKey): PastureRequirement => pastureItem(key).requirement

const isItem = (v: unknown): boolean => {
  const i = v as Partial<PastureItemDto> | null
  return typeof i === 'object' && i !== null && isPastureKey(i.key) && typeof i.unlocked === 'boolean' && typeof i.shown === 'boolean'
}

/**
 * A light check of `GET/PATCH /api/me/pasture` (the scenes of every screen draw from it, so a malformed answer
 * must not break them; zod stays out of the entry chunk). Throws on anything else.
 */
export function asPastureDto(value: unknown): PastureDto {
  const v = value as Partial<PastureDto> | null
  if (typeof v === 'object' && v !== null && Array.isArray(v.items) && v.items.every(isItem) && isBarnColor(v.barnColor) && typeof v.level === 'number') {
    return v as PastureDto
  }
  throw new Error('malformed pasture')
}
