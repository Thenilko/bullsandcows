import { codes, filterCandidates, isConsistent } from '@bc/game-core'
import type { GameViewDto, GuessEntryDto } from '@bc/protocol'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { INITIAL_UI, useSolo } from '../features/solo/store'
import { NewGame } from '../screens/NewGame'
import { WeeklyShell } from '../screens/Weekly'
import { WeeklyAwardModal } from '../screens/weekly/WeeklyAwardModal'
import { WeeklyCard } from '../screens/weekly/WeeklyCard'
import { WeeklyView } from '../screens/weekly/WeeklyView'
import { WeeklyGame } from '../screens/WeeklyPlay'
import { WEEKLY_NOW, weeklyAwardFixture, weeklyFixture, weeklyNextFixture } from './weeklyFixtures'

const noop = () => undefined
const MIRA = { level: 21, rankKey: 'pastor', avatarSpecies: 'cow', goldFrame: false } as const
const GAME_ID = 'dev-weekly'

/** Р7 / ПД9 / ПДН4. */
export function WeeklyScreen() {
  return (
    <WeeklyShell week={weeklyFixture.week}>
      <WeeklyView
        week={weeklyFixture}
        now={WEEKLY_NOW}
        username="Мира"
        self={MIRA}
        onPlay={noop}
        busy={false}
      />
    </WeeklyShell>
  )
}

/** П6 / ПД10: the card at the top of „Нова игра“. */
export function WeeklyCardScreen() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } }),
  )
  return (
    <QueryClientProvider client={client}>
      <NewGame weekly={<WeeklyCard week={weeklyFixture} now={WEEKLY_NOW} onPlay={noop} />} />
    </QueryClientProvider>
  )
}

/** Three guesses of a 5-digit number with zero, judged against 01937 as the server would. */
function history(): GuessEntryDto[] {
  const secret = '01937'
  let cands: readonly string[] = codes(5, true)
  return ['01234', '56789', '05371'].map((guess) => {
    let bulls = 0
    let cows = 0
    for (let i = 0; i < guess.length; i++) {
      if (secret[i] === guess[i]) bulls++
      else if (secret.includes(guess[i] ?? '')) cows++
    }
    const consistent = isConsistent(cands, guess)
    cands = filterCandidates(cands, guess, { bulls, cows })
    return { guess, bulls, cows, consistent, left: cands.length }
  })
}

const playing = (): GameViewDto => {
  const guesses = history()
  return {
    id: GAME_ID,
    kind: 'weekly',
    len: 5,
    zero: true,
    practice: false,
    total: 30240,
    startedAt: WEEKLY_NOW - 128_000,
    finishedAt: null,
    won: null,
    score: null,
    attempts: guesses.length,
    guesses,
    weekly: {
      weekId: '2026-W43',
      week: 43,
      rule: weeklyFixture.rule,
      endsAt: weeklyFixture.endsAt,
    },
  }
}

function Seeded({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    })
    c.setQueryData(['game', GAME_ID], playing())
    return c
  })
  useEffect(() => {
    useSolo.setState({ ui: { [GAME_ID]: { ...INITIAL_UI, cur: '0' } } })
  }, [])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** П7 / ПД11 / ПДН3: try 4 of 8, „0“ typed first. */
export function WeeklyPlayScreen() {
  return (
    <Seeded>
      <WeeklyGame gameId={GAME_ID} />
    </Seeded>
  )
}

/** П8 / ПД12: the end of week 43 over the new week's screen. */
export function WeeklyAwardScreen() {
  return (
    <WeeklyShell week={weeklyNextFixture.week}>
      <WeeklyView
        week={{ ...weeklyNextFixture, best: null, place: null }}
        now={WEEKLY_NOW}
        username="Мира"
        self={MIRA}
        onPlay={noop}
        busy={false}
      />
      <WeeklyAwardModal
        award={weeklyAwardFixture}
        next={{ week: 44, rule: 'threeNoZero' }}
        onNext={noop}
        onBoard={noop}
      />
    </WeeklyShell>
  )
}
