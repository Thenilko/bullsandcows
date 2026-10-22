export type AnimalKind = 'bull' | 'cow'
export type AnimalMotion = 'idle' | 'run' | 'walk'

export interface SceneAnimal {
  readonly kind: AnimalKind
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly motion: AnimalMotion
  /** CSS time string fed to the `--d` custom property, e.g. `-1.3s`. */
  readonly delay: string
}

/** Mobile scene (390×380): x, y; the scale follows the row (back row above y 280). */
export const BULL_SPOTS = [[10, 290], [68, 294], [126, 290], [38, 262], [96, 264]] as const
export const COW_SPOTS = [[214, 298], [298, 304], [252, 266], [330, 262], [206, 266]] as const

/** Wide desktop scene (1600×900): x, y, scale; front row 1.9, back row 1.55. */
export const WIDE_BULL_SPOTS = [[300, 600, 1.9], [455, 602, 1.9], [610, 600, 1.9], [380, 573, 1.55], [535, 575, 1.55]] as const
export const WIDE_COW_SPOTS = [[900, 644, 1.9], [1060, 650, 1.9], [1215, 644, 1.9], [985, 606, 1.55], [1140, 608, 1.55]] as const

export type SceneMode =
  | { kind: 'idle' }
  | { kind: 'result'; bulls: number }
  | { kind: 'play'; bulls: number; cows: number }

interface Placed {
  readonly x: number
  readonly y: number
  readonly scale: number
}

/** Spot index and `--d` delay of an animal standing in the idle scene. */
type IdleSlot = readonly [index: number, delay: string]

interface Layout {
  readonly bulls: readonly Placed[]
  readonly cows: readonly Placed[]
  readonly idle: { readonly bulls: readonly IdleSlot[]; readonly cows: readonly IdleSlot[] }
}

const BACK_ROW_Y = 280
const BACK_SCALE = 0.725
const FRONT_SCALE = 0.875

function rowSpot([x, y]: readonly [number, number]): Placed {
  return { x, y, scale: y < BACK_ROW_Y ? BACK_SCALE : FRONT_SCALE }
}

function wideSpot([x, y, scale]: readonly [number, number, number]): Placed {
  return { x, y, scale }
}

const MOBILE: Layout = {
  bulls: BULL_SPOTS.map(rowSpot),
  cows: COW_SPOTS.map(rowSpot),
  idle: { bulls: [[1, '0s'], [3, '-1.3s']], cows: [[0, '-1s'], [3, '-3s']] },
}

const WIDE: Layout = {
  bulls: WIDE_BULL_SPOTS.map(wideSpot),
  cows: WIDE_COW_SPOTS.map(wideSpot),
  idle: { bulls: [[0, '0s'], [4, '-1.3s']], cows: [[3, '-3s'], [1, '-1s']] },
}

/** `n` seconds as a CSS time; rounds away float noise and never yields `-0s`. */
function seconds(n: number): string {
  return String(Math.round(n * 1000) / 1000 + 0) + 's'
}

function clampCount(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(n)))
}

function make(kind: AnimalKind, spot: Placed, motion: AnimalMotion, delay: string): SceneAnimal {
  return { kind, x: spot.x, y: spot.y, scale: spot.scale, motion, delay }
}

function range(n: number, max: number): number[] {
  return Array.from({ length: clampCount(n, max) }, (_, i) => i)
}

function build(mode: SceneMode, layout: Layout): SceneAnimal[] {
  const { bulls, cows, idle } = layout
  switch (mode.kind) {
    case 'idle':
      return [
        ...idle.bulls.map(([i, d]) => make('bull', bulls[i]!, 'idle', d)),
        ...idle.cows.map(([i, d]) => make('cow', cows[i]!, 'idle', d)),
      ]
    case 'result':
      return [
        ...range(mode.bulls, bulls.length).map((i) => make('bull', bulls[i]!, 'idle', seconds(-i * 0.7))),
        make('cow', cows[0]!, 'idle', '-2s'),
      ]
    case 'play':
      return [
        ...range(mode.bulls, bulls.length).map((i) => make('bull', bulls[i]!, 'run', seconds(i * 0.16))),
        ...range(mode.cows, cows.length).map((i) => make('cow', cows[i]!, 'walk', seconds(0.35 + i * 0.22))),
      ]
  }
}

function sorted(animals: SceneAnimal[]): readonly SceneAnimal[] {
  return animals.sort((a, b) => a.y - b.y)
}

/** Animal placement for the mobile pasture scene; sorted back-to-front by `y`. */
export function sceneAnimals(mode: SceneMode): readonly SceneAnimal[] {
  return sorted(build(mode, MOBILE))
}

/** Animal placement for the wide desktop scene (same modes, the wide spots and scales); sorted back-to-front. */
export function wideSceneAnimals(mode: SceneMode): readonly SceneAnimal[] {
  return sorted(build(mode, WIDE))
}
