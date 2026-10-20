import { act, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureMe, fixtureOpp, fixtureState, myGuess } from '../../dev/duelFixtures'
import { useSession } from '../../features/auth/session'
import { useDuelStore } from '../../features/duel/store'
import { MockWebSocket } from '../../test/mockWebSocket'
import { renderWithI18n } from '../../test/render'
import { DuelRoom } from './DuelRoom'

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}

function show(path: string) {
  return renderWithI18n(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/duel/new" element={<Where />} />
        <Route path="/duel/:roomId" element={<><DuelRoom /><Where /></>} />
        <Route path="/duel/:roomId/result" element={<><DuelRoom view="result" /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  )
}

const deliver = (state: ReturnType<typeof fixtureState>) => act(() => MockWebSocket.last().receive({ t: 'state', state }))

beforeEach(() => {
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
  sessionStorage.clear()
  useDuelStore.getState().reset()
  useSession.setState({ session: { accessToken: 'jwt', refreshToken: 'r', expiresAt: 9e12, user: { id: 'u', isGuest: false } } } as never)
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ session: null, me: null })
})

describe('DuelRoom', () => {
  it('without a seat token goes back to setup', () => {
    show('/duel/r1')
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/new')
  })

  it('reads the token once, then keeps it out of the address bar', () => {
    show('/duel/r1?token=secret-token')
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/duel\/r1$/)
    expect(new URL(MockWebSocket.last().url).searchParams.get('token')).toBe('secret-token')
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('shows the lobby screen for a lobby snapshot and play for a playing one', () => {
    show('/duel/r1?token=t')
    expect(screen.getByRole('status')).toHaveTextContent('Зареждане')
    deliver(fixtureState({ phase: 'lobby', me: fixtureMe({ ready: false }), opp: fixtureOpp({ ready: false }) }))
    expect(screen.getByRole('button', { name: 'Готов!' })).toBeEnabled()
    deliver(fixtureState({ me: fixtureMe({ guesses: [myGuess('1234', 0, 1)] }) }))
    expect(screen.getByRole('button', { name: 'Предавам се' })).toBeInTheDocument()
  })

  it('shows the classic hide-secret screen', () => {
    show('/duel/r1?token=t')
    deliver(fixtureState({ phase: 'secrets', me: fixtureMe({ hasSecret: false }) }))
    expect(screen.getByRole('heading', { name: 'Скрий своето число' })).toBeInTheDocument()
  })

  it('a reload into an ended match lands on the result', () => {
    show('/duel/r1?token=t')
    deliver(fixtureState({ phase: 'ended', turn: null, outcome: { winner: 'a', reason: 'solved' }, secrets: { mine: '1234', theirs: '4321' } }))
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/r1/result')
    expect(screen.getByRole('heading', { name: 'Победа!' })).toBeInTheDocument()
  })

  it('leaves the result for the lobby when a rematch starts', () => {
    show('/duel/r1?token=t')
    deliver(fixtureState({ phase: 'ended', turn: null, outcome: { winner: 'b', reason: 'giveUp' }, secrets: { mine: '1234', theirs: '4321' } }))
    expect(screen.getByRole('heading', { name: 'Загуба' })).toBeInTheDocument()
    deliver(fixtureState({ phase: 'lobby', me: fixtureMe({ ready: false }) }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/duel\/r1$/)
  })
})
