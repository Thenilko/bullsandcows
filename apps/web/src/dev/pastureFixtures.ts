import {
  isPastureUnlocked,
  PASTURE_ITEMS,
  pastureProgress,
  type BarnColor,
  type PastureFacts,
  type PastureKey,
} from '@bc/game-core'
import type { PastureDto } from '@bc/protocol'

/** The server's view (`GET /api/me/pasture`) for given facts, for the gallery and the tests. */
export function pastureView(facts: PastureFacts, barnColor: BarnColor = 'red', hidden: readonly PastureKey[] = []): PastureDto {
  return {
    level: facts.level,
    barnColor,
    items: PASTURE_ITEMS.map((def) => {
      const unlocked = isPastureUnlocked(def, facts)
      const base = { key: def.key, unlocked, shown: unlocked && !hidden.includes(def.key) }
      return unlocked ? base : { ...base, progress: pastureProgress(def, facts) }
    }),
  }
}

/** Р6: level 12 with „Ранобудник“ and a 9-day streak — the dog, the sunflowers and the beehive. */
export const pastureFixture = pastureView({
  level: 12,
  badges: { early: { tier: 1, progress: 6 }, streak: { tier: 1, progress: 9 } },
})

/** П1: level 38, everything unlocked, the barn painted blue. */
export const pastureFullFixture = pastureView(
  { level: 38, badges: { early: { tier: 2, progress: 12 }, streak: { tier: 2, progress: 34 } } },
  'blue',
)

/** П2: level 15 just reached, the windmill is new. */
export const pastureUnlockFixture = pastureView({
  level: 15,
  badges: { early: { tier: 1, progress: 6 }, streak: { tier: 1, progress: 9 } },
})
