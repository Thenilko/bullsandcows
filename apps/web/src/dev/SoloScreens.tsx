import { codes, filterCandidates, isConsistent } from '@bc/game-core'
import type { DistributionDto, GameViewDto, GuessEntryDto } from '@bc/protocol'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useNotebookStore } from '../features/notebook/store'
import { INITIAL_UI, useSolo, type GameUi } from '../features/solo/store'
import { NewGame } from '../screens/NewGame'
import { PlayGame } from '../screens/Play'

const GAME_ID = 'dev-game'
const DISTRIBUTION: DistributionDto = { histogram: [0.2, 0.8, 3, 8, 15, 20, 19, 14, 9, 5, 3, 3], sample: 0, fallback: true }

/** Guess history with exactly the values the server would send. */
function history(entries: readonly (readonly [string, number, number])[]): GuessEntryDto[] {
  let cands: readonly string[] = codes(4, false)
  return entries.map(([guess, bulls, cows]) => {
    const consistent = isConsistent(cands, guess)
    cands = filterCandidates(cands, guess, { bulls, cows })
    return { guess, bulls, cows, consistent, left: cands.length }
  })
}

const NOW = Date.now()
const BASE: GameViewDto = {
  id: GAME_ID,
  kind: 'daily',
  len: 4,
  zero: false,
  practice: false,
  total: 3024,
  startedAt: null,
  finishedAt: null,
  won: null,
  score: null,
  attempts: 0,
  guesses: [],
}

function mid(): GameViewDto {
  const guesses = history([
    ['1234', 1, 1],
    ['5678', 0, 2],
    ['1567', 0, 1],
  ])
  return { ...BASE, startedAt: NOW - 71_000, attempts: guesses.length, guesses }
}

function win(): GameViewDto {
  const guesses = history([
    ['1234', 1, 1],
    ['5274', 4, 0],
  ])
  return { ...BASE, startedAt: NOW - 94_000, attempts: guesses.length, guesses }
}

function seededClient(game: GameViewDto | null): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(['distribution', 4, false, 'daily'], DISTRIBUTION)
  if (game) client.setQueryData(['game', GAME_ID], game)
  return client
}

function Seeded({ game, ui, children }: { game: GameViewDto | null; ui?: Partial<GameUi>; children: ReactNode }) {
  const [client] = useState(() => seededClient(game))
  useEffect(() => {
    if (ui) useSolo.setState({ ui: { [GAME_ID]: { ...INITIAL_UI, ...ui } } })
  }, [ui])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** Notes of the prototype's notebook screens, seeded once per mount. */
const NOTEBOOK_SEED = {
  marks: { '1': 1, '3': 1, '6': 1, '0': 1, '2': 2, '4': 2 },
  text: '2 и 4 са вътре, но не там, където ги сложих.\nПробвай 5 отпред?',
} as const

function SeededNotebook({ children }: { children: ReactNode }) {
  useState(() => useNotebookStore.setState((s) => ({ games: { ...s.games, [GAME_ID]: NOTEBOOK_SEED } })))
  return <>{children}</>
}

const MID_UI = { cur: '5' }
const COUNTDOWN_UI = { countdown: 'running' } as const
const WIN_UI = { solved: true, parity: false, lastVerdict: { bulls: 4, cows: 0 } }

export const NewGameScreen = () => (
  <Seeded game={null}>
    <NewGame />
  </Seeded>
)
export const PlayStartScreen = () => (
  <Seeded game={BASE}>
    <PlayGame gameId={GAME_ID} />
  </Seeded>
)
/** MK2: the 3-2-1 overlay; the gallery freezes the clock, so it stays on „3“. */
export const PlayCountdownScreen = () => (
  <Seeded game={BASE} ui={COUNTDOWN_UI}>
    <PlayGame gameId={GAME_ID} />
  </Seeded>
)
export const PlayMidScreen = () => (
  <Seeded game={mid()} ui={MID_UI}>
    <PlayGame gameId={GAME_ID} />
  </Seeded>
)
export const PlayWinScreen = () => (
  <Seeded game={win()} ui={WIN_UI}>
    <PlayGame gameId={GAME_ID} />
  </Seeded>
)
export const NotebookScreen = () => (
  <Seeded game={mid()} ui={MID_UI}>
    <SeededNotebook>
      <PlayGame gameId={GAME_ID} notesOpen />
    </SeededNotebook>
  </Seeded>
)
/** Desktop layout (D4): shows the notebook card beside the scene on wide viewports. */
export const PlayDesktopNotebookScreen = () => (
  <Seeded game={mid()} ui={MID_UI}>
    <SeededNotebook>
      <PlayGame gameId={GAME_ID} />
    </SeededNotebook>
  </Seeded>
)
