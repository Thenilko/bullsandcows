import { Shell } from '../app/layouts/Shell'
import { buildResult } from '../screens/result/resultModel'
import { ResultView } from '../screens/result/ResultView'
import { IDLE_SCENE } from '../screens/idleScene'
import { BoardView } from '../screens/board/BoardView'
import { ProfileView } from '../screens/profile/ProfileView'
import { boardFixture, fallbackDistribution, lostGame, meFixture, wonGame } from './statsFixtures'

const noop = () => undefined
const FILTERS = { period: 'today', len: 4, zero: false } as const

function Result({ game }: { game: typeof wonGame }) {
  const model = buildResult(game, fallbackDistribution)
  return (
    <Shell scene={model.scene}>
      <ResultView model={model} shareLabel="Share" onAgain={noop} onShare={noop} onBoard={noop} />
    </Shell>
  )
}

export const ResultWin = () => <Result game={wonGame} />
export const ResultLose = () => <Result game={lostGame} />
export const ResultPractice = () => <Result game={{ ...wonGame, practice: true, score: 0 }} />

export const Board = () => (
  <Shell scene={IDLE_SCENE} sceneSide>
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
  <Shell scene={IDLE_SCENE} sceneSide>
    <BoardView status="guest" filters={FILTERS} onFilters={noop} onPlay={noop} />
  </Shell>
)

export const Profile = () => (
  <Shell scene={IDLE_SCENE} sceneSide>
    <ProfileView me={meFixture} onPatch={noop} onLogout={noop} />
  </Shell>
)

export const ProfileGuest = () => (
  <Shell scene={IDLE_SCENE} sceneSide>
    <ProfileView
      me={{ ...meFixture, profile: { ...meFixture.profile, isGuest: true, username: 'Гост 482' } }}
      onPatch={noop}
      onLogout={noop}
    />
  </Shell>
)
