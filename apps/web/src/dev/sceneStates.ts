import { IDLE_PROGRESS, progress } from '@bc/game-core'
import { sceneAnimals, type SceneMode } from '../components/scene'
import type { SceneProps } from '../app/layouts/Shell'

const IDLE_MODE: SceneMode = { kind: 'idle' }
const PLAY_MODE: SceneMode = { kind: 'play', bulls: 2, cows: 2 }
const RESULT_MODE: SceneMode = { kind: 'result', bulls: 4 }

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

const PLAY_PROGRESS = progress(120, 3024)

export const PLAY_SCENE: SceneProps = {
  mode: PLAY_MODE,
  prog: PLAY_PROGRESS.prog,
  fog: PLAY_PROGRESS.fog,
  sunY: PLAY_PROGRESS.sunY,
  dawn: PLAY_PROGRESS.dawn,
  animals: sceneAnimals(PLAY_MODE),
  parity: true,
  miss: false,
}

const RESULT_PROGRESS = progress(1, 3024)

export const RESULT_SCENE: SceneProps = {
  mode: RESULT_MODE,
  prog: RESULT_PROGRESS.prog,
  fog: RESULT_PROGRESS.fog,
  sunY: RESULT_PROGRESS.sunY,
  dawn: RESULT_PROGRESS.dawn,
  animals: sceneAnimals(RESULT_MODE),
  parity: true,
  miss: false,
}
