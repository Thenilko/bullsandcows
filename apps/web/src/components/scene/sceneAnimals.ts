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

export const BULL_SPOTS = [[10, 290], [68, 294], [126, 290], [38, 262], [96, 264]] as const
export const COW_SPOTS = [[214, 298], [298, 304], [252, 266], [330, 262], [206, 266]] as const

export type SceneMode =
  | { kind: 'idle' }
  | { kind: 'result'; bulls: number }
  | { kind: 'play'; bulls: number; cows: number }

type Spot = readonly [number, number]

const BACK_ROW_Y = 280
const BACK_SCALE = 0.725
const FRONT_SCALE = 0.875
const MAX_ANIMALS = BULL_SPOTS.length

/** `n` seconds as a CSS time; rounds away float noise and never yields `-0s`. */
function seconds(n: number): string {
  return String(Math.round(n * 1000) / 1000 + 0) + 's'
}

function clampCount(n: number): number {
  return Math.max(0, Math.min(MAX_ANIMALS, Math.floor(n)))
}

function make(kind: AnimalKind, spot: Spot, motion: AnimalMotion, delay: string): SceneAnimal {
  const [x, y] = spot
  return { kind, x, y, scale: y < BACK_ROW_Y ? BACK_SCALE : FRONT_SCALE, motion, delay }
}

function range(n: number): number[] {
  return Array.from({ length: clampCount(n) }, (_, i) => i)
}

function build(mode: SceneMode): SceneAnimal[] {
  switch (mode.kind) {
    case 'idle':
      return [
        make('bull', BULL_SPOTS[1], 'idle', '0s'),
        make('bull', BULL_SPOTS[3], 'idle', '-1.3s'),
        make('cow', COW_SPOTS[0], 'idle', '-1s'),
        make('cow', COW_SPOTS[3], 'idle', '-3s'),
      ]
    case 'result':
      return [
        ...range(mode.bulls).map((i) => make('bull', BULL_SPOTS[i], 'idle', seconds(-i * 0.7))),
        make('cow', COW_SPOTS[0], 'idle', '-2s'),
      ]
    case 'play':
      return [
        ...range(mode.bulls).map((i) => make('bull', BULL_SPOTS[i], 'run', seconds(i * 0.16))),
        ...range(mode.cows).map((i) => make('cow', COW_SPOTS[i], 'walk', seconds(0.35 + i * 0.22))),
      ]
  }
}

/** Animal placement for the pasture scene; sorted back-to-front by `y`. */
export function sceneAnimals(mode: SceneMode): readonly SceneAnimal[] {
  return build(mode).sort((a, b) => a.y - b.y)
}
