import { useState } from 'react'
import { useDuelStore } from '../features/duel/store'
import { DuelResult } from '../screens/duel/DuelResult'
import { ResultLoaded } from '../screens/Result'
import { buildResult } from '../screens/result/resultModel'
import { fixtureMe, fixtureOpp, fixtureState, FIXTURE_T0, myGuess, oppGuess } from './duelFixtures'
import { fallbackDistribution, wonGame } from './statsFixtures'

const noop = () => undefined

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
