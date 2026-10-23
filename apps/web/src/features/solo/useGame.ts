import type { GameViewDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { SceneProps } from '../../app/layouts/Shell'
import { fetchGame } from './api'
import { gameKey } from './gameKey'
import { useGameActions, type GameActions } from './useGameActions'
import { useElapsed, useSanityCheck } from './useGameClock'
import { useGameUi, useSolo, type GameUi } from './store'
import { useSceneState } from './useSceneState'

export interface GameApi extends GameActions {
  game: GameViewDto | undefined
  ui: GameUi
  loadFailed: boolean
  started: boolean
  finished: boolean
  left: number
  elapsedSec: number
  scene: SceneProps
}

/** One solo game: server state (TanStack Query) + transient UI state + actions. */
export function useGame(gameId: string): GameApi {
  const ui = useGameUi(gameId)
  const query = useQuery({ queryKey: gameKey(gameId), queryFn: () => fetchGame(gameId), staleTime: Infinity, refetchOnWindowFocus: false })
  const game = query.data
  const startedAt = game ? (game.startedAt ?? ui.localStartedAt) : null
  const started = startedAt !== null
  const finished = game?.finishedAt != null

  useSanityCheck(game)
  useEffect(() => () => useSolo.getState().reset(gameId), [gameId])

  return {
    ...useGameActions(gameId, { game, started, finished }),
    game,
    ui,
    loadFailed: query.isError,
    started,
    finished,
    left: game ? (game.guesses.at(-1)?.left ?? game.total) : 0,
    elapsedSec: useElapsed(startedAt, started && !finished),
    scene: useSceneState(game, started, ui),
  }
}
