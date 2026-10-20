import { useState, type ReactNode } from 'react'
import { useDuelStore, type DuelStoreData } from '../features/duel/store'
import { DuelPlay } from '../screens/duel/DuelPlay'
import { DuelResult } from '../screens/duel/DuelResult'
import { DuelSetup } from '../screens/duel/DuelSetup'
import { Found } from '../screens/duel/Found'
import { HideSecret } from '../screens/duel/HideSecret'
import { InviteView } from '../screens/duel/Invite'
import { JoinInvite } from '../screens/duel/JoinInvite'
import { QueueView } from '../screens/duel/Queue'
import { fixtureMe, fixtureOpp, fixtureState, FIXTURE_T0, myGuess, oppGuess } from './duelFixtures'
import type { PublicState } from '@bc/protocol'

const noop = (): void => undefined
const SETTINGS = { len: 4, zero: false, format: 'race' } as const
const INVITE = { code: 'BK7Q2', url: 'https://pasishte.example/d/BK7Q2', roomId: 'r1', token: 't1' }
const ENDED_BASE = { secrets: { mine: '1234', theirs: '5678' }, xp: 120 } as const

/** Seeds the duel store once, so screens that read events from it render with fixed data. */
function Seeded({ data, children }: { data: Partial<DuelStoreData>; children: ReactNode }) {
  useState(() => {
    useDuelStore.getState().reset()
    useDuelStore.setState(data)
    return true
  })
  return <>{children}</>
}

const raceMid = (): PublicState =>
  fixtureState({
    format: 'race',
    turn: null,
    me: fixtureMe({ left: 214, guesses: [myGuess('1234', 1, 2), myGuess('5671', 0, 3, false), myGuess('4172', 2, 1)] }),
    opp: fixtureOpp({ left: 640, guesses: [oppGuess(null, null, null), oppGuess(null, null, null)] }),
  })

const classicMid = (): PublicState =>
  fixtureState({
    turn: 'a',
    turnDeadline: FIXTURE_T0 + 45_000,
    me: fixtureMe({ left: 120, guesses: [myGuess('1234', 1, 2), myGuess('5671', 2, 1)] }),
    opp: fixtureOpp({ left: 400, guesses: [oppGuess('9021', 0, 2)] }),
  })

function ended(outcome: 'win' | 'lose' | 'draw'): PublicState {
  const winner = outcome === 'draw' ? null : outcome === 'win' ? 'a' : 'b'
  return fixtureState({
    phase: 'ended',
    format: 'classic',
    turn: null,
    endedAt: FIXTURE_T0 + 131_000,
    outcome: { winner, reason: 'solved' },
    secrets: ENDED_BASE.secrets,
    me: fixtureMe({ left: 1, guesses: [myGuess('1234', 1, 2), myGuess('5678', outcome === 'lose' ? 2 : 4, 0)] }),
    opp: fixtureOpp({ left: 1, guesses: [oppGuess('9021', 0, 2), oppGuess('1234', outcome === 'win' ? 2 : 4, 0)] }),
  })
}

function result(outcome: 'win' | 'lose' | 'draw') {
  const rating = outcome === 'win' ? { from: 1240, to: 1258, delta: 18 } : outcome === 'lose' ? { from: 1240, to: 1227, delta: -13 } : { from: 1240, to: 1242, delta: 2 }
  return function ResultScreen() {
    const state = ended(outcome)
    return (
      <Seeded data={{ state, ended: { outcome, reason: 'solved', rating, ...ENDED_BASE } }}>
        <DuelResult roomId="r1" state={state} send={noop} />
      </Seeded>
    )
  }
}

export const DuelSetupScreen = () => <DuelSetup mode="duel" />
export const BotSetupScreen = () => <DuelSetup mode="bot" />
export const InviteScreen = () => <InviteView invite={INVITE} settings={SETTINGS} copy="idle" expired={false} elapsedMs={9000} onCopy={noop} onShare={noop} onCancel={noop} />
export const JoinInviteScreen = () => <JoinInvite preview={{ status: 'waiting', host: { username: 'Ани', level: 8 }, settings: SETTINGS }} />
const queueView = (elapsedMs: number, showSuggest: boolean) => (
  <QueueView settings={SETTINGS} elapsedMs={elapsedMs} level={7} error={null} showSuggest={showSuggest} inviteError={null} onInvite={noop} onCancel={noop} onProfile={noop} />
)
export const QueueScreen = () => queueView(16_000, false)
export const QueueSuggestScreen = () => queueView(23_000, true)

export const FoundScreen = () => {
  const state = fixtureState({ phase: 'lobby', format: 'race', me: fixtureMe({ ready: false }), opp: fixtureOpp({ ready: true }) })
  return (
    <Seeded data={{ state }}>
      <Found state={state} send={noop} />
    </Seeded>
  )
}

export const HideSecretScreen = () => {
  const state = fixtureState({ phase: 'secrets', me: fixtureMe({ hasSecret: false }), opp: fixtureOpp({ hasSecret: true }) })
  return (
    <Seeded data={{ state }}>
      <HideSecret roomId="r1" state={state} send={noop} />
    </Seeded>
  )
}

export const PlayRaceScreen = () => {
  const state = raceMid()
  return (
    <Seeded data={{ state, parity: 3 }}>
      <DuelPlay roomId="r1" state={state} send={noop} />
    </Seeded>
  )
}

export const PlayClassicScreen = () => {
  const state = classicMid()
  return (
    <Seeded data={{ state, parity: 2 }}>
      <DuelPlay roomId="r1" state={state} send={noop} />
    </Seeded>
  )
}

export const ResultWinScreen = result('win')
export const ResultLoseScreen = result('lose')
export const ResultDrawScreen = result('draw')
