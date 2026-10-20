import { IDLE_PROGRESS, progress, totalCodes, type Len } from '@bc/game-core'
import type { PublicState } from '@bc/protocol'
import type { SceneProps } from '../../app/layouts/Shell'
import { sceneAnimals } from '../../components/scene'
import { IDLE_SCENE } from '../idleScene'

export { IDLE_SCENE }

const WAIT_FOG = 0.25

/** Soft haze behind the invite and queue screens. */
export const WAIT_SCENE: SceneProps = { ...IDLE_SCENE, fog: WAIT_FOG, sunY: IDLE_PROGRESS.sunY }

/** Play scene: fog follows how many candidates are left for me, animals follow my last verdict. */
export function playScene(state: PublicState, parity: number, miss: boolean): SceneProps {
  const total = totalCodes(state.len as Len, state.zero)
  const p = progress(Math.max(1, state.me.left), total)
  const last = state.me.guesses[state.me.guesses.length - 1]
  const solved = last !== undefined && last.bulls === state.len
  return {
    fog: solved ? 0 : p.fog,
    sunY: p.sunY,
    dawn: p.dawn,
    animals: sceneAnimals(last ? { kind: 'play', bulls: solved ? state.len : last.bulls, cows: last.cows } : { kind: 'play', bulls: 0, cows: 0 }),
    parity: parity % 2 === 0,
    miss,
  }
}

/** Result scene: win gathers all bulls, otherwise a calmer pasture. */
export function resultScene(won: boolean, len: number): SceneProps {
  return { ...IDLE_SCENE, fog: 0, dawn: 0.15, animals: sceneAnimals(won ? { kind: 'result', bulls: len } : { kind: 'result', bulls: 1 }) }
}
