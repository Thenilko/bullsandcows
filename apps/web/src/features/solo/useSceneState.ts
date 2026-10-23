import { IDLE_PROGRESS, progress } from '@bc/game-core'
import type { GameViewDto } from '@bc/protocol'
import { useMemo } from 'react'
import type { SceneProps } from '../../app/layouts/Shell'
import { sceneAnimals, type SceneMode } from '../../components/scene'
import type { GameUi } from './store'

const IDLE_MODE: SceneMode = { kind: 'idle' }

/** Pasture state for a game: calm before the start, fog from the remaining candidates after. */
export function sceneFor(game: GameViewDto | undefined, started: boolean, ui: Pick<GameUi, 'parity' | 'miss'>): SceneProps {
  const last = game?.guesses.at(-1)
  const p = game && started ? progress(last?.left ?? game.total, game.total) : IDLE_PROGRESS
  const mode: SceneMode = last && started ? { kind: 'play', bulls: last.bulls, cows: last.cows } : IDLE_MODE
  return {
    mode,
    prog: p.prog,
    fog: p.fog,
    sunY: p.sunY,
    dawn: p.dawn,
    animals: sceneAnimals(mode),
    parity: ui.parity,
    miss: ui.miss,
  }
}

export function useSceneState(game: GameViewDto | undefined, started: boolean, ui: GameUi): SceneProps {
  const { parity, miss } = ui
  return useMemo(() => sceneFor(game, started, { parity, miss }), [game, started, parity, miss])
}
