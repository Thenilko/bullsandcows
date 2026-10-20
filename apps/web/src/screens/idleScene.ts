import { IDLE_PROGRESS } from '@bc/game-core'
import { sceneAnimals } from '../components/scene'
import type { SceneProps } from '../app/layouts/Shell'

/** Calm pasture behind the non-game screens (login, rules). */
export const IDLE_SCENE: SceneProps = {
  fog: IDLE_PROGRESS.fog,
  sunY: IDLE_PROGRESS.sunY,
  dawn: IDLE_PROGRESS.dawn,
  animals: sceneAnimals({ kind: 'idle' }),
  parity: true,
  miss: false,
}
