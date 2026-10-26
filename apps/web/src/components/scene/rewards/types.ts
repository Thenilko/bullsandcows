import { BARN_COLORS, type BarnColor, type PastureKey } from '@bc/game-core'

/** What the scenes draw of the player's pasture: the rewards shown and the barn colour. */
export interface ScenePasture {
  readonly shown: readonly PastureKey[]
  readonly barnColor: BarnColor
}

export const has = (pasture: ScenePasture | undefined, key: PastureKey): boolean =>
  pasture?.shown.includes(key) ?? false

/** The tint over the barn walls, or null for the red barn as drawn. */
export function barnTint(pasture: ScenePasture | undefined): string | null {
  if (!pasture || pasture.barnColor === 'red') return null
  return BARN_COLORS[pasture.barnColor]
}
