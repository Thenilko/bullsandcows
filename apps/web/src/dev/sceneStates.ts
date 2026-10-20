import { IDLE_PROGRESS, progress } from '@bc/game-core'
import { sceneAnimals } from '../components/scene'
import type { SceneProps } from '../app/layouts/Shell'

export const IDLE_SCENE: SceneProps = {
  fog: IDLE_PROGRESS.fog,
  sunY: IDLE_PROGRESS.sunY,
  dawn: IDLE_PROGRESS.dawn,
  animals: sceneAnimals({ kind: 'idle' }),
  parity: true,
  miss: false,
}

const PLAY_PROGRESS = progress(120, 3024)

export const PLAY_SCENE: SceneProps = {
  fog: PLAY_PROGRESS.fog,
  sunY: PLAY_PROGRESS.sunY,
  dawn: PLAY_PROGRESS.dawn,
  animals: sceneAnimals({ kind: 'play', bulls: 2, cows: 2 }),
  parity: true,
  miss: false,
}

const RESULT_PROGRESS = progress(1, 3024)

export const RESULT_SCENE: SceneProps = {
  fog: RESULT_PROGRESS.fog,
  sunY: RESULT_PROGRESS.sunY,
  dawn: RESULT_PROGRESS.dawn,
  animals: sceneAnimals({ kind: 'result', bulls: 4 }),
  parity: true,
  miss: false,
}
