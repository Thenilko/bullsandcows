import { IDLE_PROGRESS } from '@bc/game-core'
import { sceneAnimals, type SceneMode } from '../components/scene'
import type { SceneProps } from '../app/layouts/Shell'

const IDLE_MODE: SceneMode = { kind: 'idle' }

/** Calm pasture behind the non-game screens (login, rules). */
export const IDLE_SCENE: SceneProps = {
  mode: IDLE_MODE,
  prog: IDLE_PROGRESS.prog,
  fog: IDLE_PROGRESS.fog,
  sunY: IDLE_PROGRESS.sunY,
  dawn: IDLE_PROGRESS.dawn,
  animals: sceneAnimals(IDLE_MODE),
  parity: true,
  miss: false,
}
