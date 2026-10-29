import { useEffect, useState } from 'react'
import { Shell } from '../app/layouts/Shell'
import { BadgeToastHost } from '../features/badges/BadgeToastHost'
import { useBadgeToasts } from '../features/badges/toastStore'
import { useDuelStore } from '../features/duel/store'
import { IDLE_SCENE } from '../screens/idleScene'
import { DuelResult } from '../screens/duel/DuelResult'
import { ProfileView } from '../screens/profile/ProfileView'
import { ResultLoaded } from '../screens/Result'
import { buildResult } from '../screens/result/resultModel'
import { fixtureMe, fixtureOpp, fixtureState, FIXTURE_T0, myGuess, oppGuess } from './duelFixtures'
import { badgesFixture, fallbackDistribution, meFixture, wonGame } from './statsFixtures'

const noop = () => undefined
const BADGES = { states: badgesFixture, loading: false, error: false }
const GUEST = { ...meFixture, profile: { ...meFixture.profile, isGuest: true, username: 'Гост 482' } }
const NO_BADGES = { states: badgesFixture.map((b) => ({ ...b, tier: 0, progress: 0, earnedAt: null })), loading: false, error: false }

/** Р1: the result of the won daily game with the share sheet open. */
export const ShareSheetScreen = () => <ResultLoaded model={buildResult(wonGame, fallbackDistribution)} sharing />

const duelWon = () =>
  fixtureState({
    phase: 'ended',
    turn: null,
    endedAt: FIXTURE_T0 + 131_000,
    outcome: { winner: 'a', reason: 'solved' },
    secrets: { mine: '1234', theirs: '5678' },
    me: fixtureMe({ left: 1, guesses: [myGuess('1234', 1, 2), myGuess('5671', 0, 3, false), myGuess('5678', 4, 0)] }),
    opp: fixtureOpp({ left: 1, guesses: [oppGuess('9021', 0, 2), oppGuess('1234', 2, 0)] }),
  })

/** Р1 over a duel result: only my rows, the opponent's name and the outcome. */
export function ShareDuelScreen() {
  const [state] = useState(() => {
    const s = duelWon()
    useDuelStore.getState().reset()
    useDuelStore.setState({ state: s, ended: { outcome: 'win', reason: 'solved', secrets: { mine: '1234', theirs: '5678' }, rating: null, xp: 120 } })
    return s
  })
  return <DuelResult roomId="r1" state={state} send={noop} sharing />
}

const profile = (me: typeof meFixture, badges: typeof BADGES, detailKey?: 'sherlock') => (
  <Shell scene={IDLE_SCENE} screen="profile">
    <ProfileView me={me} badges={badges} tab="badges" onTab={noop} onPatch={noop} onLogout={noop} detailKey={detailKey} />
  </Shell>
)

/** Р2: the collection with the artboard's tiers. */
export const BadgesScreen = () => profile(meFixture, BADGES)
/** Р2 for a guest: everything locked and the line asking to sign in. */
export const BadgesGuestScreen = () => profile(GUEST, NO_BADGES)
/** Р3: „Шерлок“ at bronze, 3 of 5 to silver. */
export const BadgeDetailScreen = () => profile(meFixture, BADGES, 'sherlock')

/** The „Нова значка!“ toast over the result (sticky, so the screenshot catches it). */
export function BadgeToastScreen() {
  // After commit, not during render: the app-wide toast host listens to this store, and a store write on every
  // suspended retry of the lazy wide scene re-rendered that host and restarted the retry, so it never settled.
  useEffect(() => {
    useBadgeToasts.setState({ queue: [{ key: 'sherlock', tier: 2 }], shown: 1 })
  }, [])
  return (
    <>
      <ResultLoaded model={buildResult(wonGame, fallbackDistribution)} />
      <BadgeToastHost sticky />
    </>
  )
}
