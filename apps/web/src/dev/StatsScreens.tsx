import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell } from '../app/layouts/Shell'
import { PIONEER_KEY } from '../features/auth/PioneerLine'
import { ME_KEY } from '../features/stats/useMe'
import { GuestFooter } from '../screens/Result'
import { buildResult } from '../screens/result/resultModel'
import { ResultView } from '../screens/result/ResultView'
import { IDLE_SCENE } from '../screens/idleScene'
import { BoardKindChips } from '../screens/board/BoardKindChips'
import { BoardView } from '../screens/board/BoardView'
import { KindBoard } from '../screens/board/KindBoard'
import { ProfileView } from '../screens/profile/ProfileView'
import {
  badgesFixture,
  boardFixture,
  duelsBoardFixture,
  fallbackDistribution,
  guestBoardFixture,
  lostGame,
  meFixture,
  wonGame,
} from './statsFixtures'

const BADGES = { states: badgesFixture, loading: false, error: false }

const noop = () => undefined
const FILTERS = { period: 'today', len: 4, zero: false } as const

function Result({ game }: { game: typeof wonGame }) {
  const { t } = useTranslation()
  const model = buildResult(game, fallbackDistribution)
  return (
    <Shell scene={model.scene} screen="result">
      <ResultView model={model} shareLabel={t('common.share')} onAgain={noop} onShare={noop} onBoard={noop} />
    </Shell>
  )
}

export const ResultWin = () => <Result game={wonGame} />
export const ResultLose = () => <Result game={lostGame} />
export const ResultPractice = () => <Result game={{ ...wonGame, practice: true, score: 0 }} />

export const Board = () => (
  <Shell scene={IDLE_SCENE} screen="board">
    <BoardView
      status="ready"
      filters={FILTERS}
      onFilters={noop}
      data={boardFixture}
      onPlay={noop}
    />
  </Shell>
)

export const BoardGuest = () => (
  <Shell scene={IDLE_SCENE} screen="board">
    <BoardView status="guest" filters={FILTERS} onFilters={noop} onPlay={noop} />
  </Shell>
)

/** The chips over the board and „Дуели“ (rating and W–L). */
export const BoardDuels = () => (
  <Shell scene={IDLE_SCENE} screen="board">
    <BoardKindChips value="duels" onChange={noop} />
    <KindBoard
      kind="duels"
      period="today"
      onPeriod={noop}
      status="ready"
      data={duelsBoardFixture}
      onPlay={noop}
      onDuel={noop}
      onChallenge={noop}
    />
  </Shell>
)

export const Profile = () => (
  <Shell scene={IDLE_SCENE} screen="profile">
    <ProfileView me={meFixture} badges={BADGES} tab="profile" onTab={noop} onPatch={noop} onLogout={noop} />
  </Shell>
)

export const ProfileGuest = () => (
  <Shell scene={IDLE_SCENE} screen="profile">
    <ProfileView
      me={{ ...meFixture, profile: { ...meFixture.profile, isGuest: true, username: 'Гост 482' } }}
      badges={BADGES}
      tab="profile"
      onTab={noop}
      onPatch={noop}
      onLogout={noop}
    />
  </Shell>
)

/** A guest on a 4-day streak with 3 games, 82 „Пионер“ spots left and the 5th place today („Щеше да си №5“). */
const GUEST_ME = {
  ...meFixture,
  dayStreak: 4,
  stats: { ...meFixture.stats, played: 3 },
  profile: { ...meFixture.profile, isGuest: true, username: 'guest-K7Q2' },
}

function GuestSeeded({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const c = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    c.setQueryData(ME_KEY, GUEST_ME)
    c.setQueryData(PIONEER_KEY, { left: 82, limit: 100 })
    c.setQueryData(['leaderboard', 'today', 4, false, 'guest'], guestBoardFixture)
    return c
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export const BoardGuestPlace = () => (
  <GuestSeeded>
    <Shell scene={IDLE_SCENE} screen="board">
      <BoardView status="ready" filters={FILTERS} onFilters={noop} data={guestBoardFixture} onPlay={noop} guest />
    </Shell>
  </GuestSeeded>
)

export function ResultGuest() {
  const { t } = useTranslation()
  const model = buildResult({ ...wonGame, kind: 'daily' }, fallbackDistribution)
  return (
    <GuestSeeded>
      <Shell scene={model.scene} screen="result">
        <ResultView
          model={model}
          shareLabel={t('common.share')}
          onAgain={noop}
          onShare={noop}
          onBoard={noop}
          footer={<GuestFooter board={{ period: 'today', len: 4, zero: false }} daily />}
        />
      </Shell>
    </GuestSeeded>
  )
}
