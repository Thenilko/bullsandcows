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
  vi.useRealTimers()
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

  it('keeps rating and xp from the ended event across the play -> result route change', () => {
    show('/duel/r1?token=t')
    vi.useFakeTimers()
    deliver(fixtureState())
    const ended = fixtureState({ phase: 'ended', turn: null, outcome: { winner: 'a', reason: 'solved' }, secrets: { mine: '1234', theirs: '4321' } })
    deliver(ended)
    act(() => MockWebSocket.last().receive({ t: 'ended', outcome: 'win', reason: 'solved', secrets: { mine: '1234', theirs: '4321' }, rating: { from: 1240, to: 1258, delta: 18 }, xp: 120 }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/duel\/r1$/)
    act(() => void vi.advanceTimersByTime(1400))
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/r1/result')
    expect(screen.getByText(/\+120 т\. опит/)).toBeInTheDocument()
    expect(screen.getByText('1240 → 1258')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('after a reload shows rating and xp from the ended snapshot without an ended event', () => {
    show('/duel/r1?token=t')
    deliver(
      fixtureState({
        phase: 'ended',
        turn: null,
        outcome: { winner: 'a', reason: 'solved' },
        secrets: { mine: '1234', theirs: '4321' },
        rating: { from: 1240, to: 1258, delta: 18 },
        xp: 120,
      }),
    )
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/r1/result')
    expect(useDuelStore.getState().ended).toBeNull()
    expect(screen.getByText(/\+120 т\. опит/)).toBeInTheDocument()
    expect(screen.getByText('1240 → 1258')).toBeInTheDocument()
  })

  it('does not leak a previous room into a new one', () => {
    useDuelStore.getState().enter('old')
    useDuelStore.getState().apply({ t: 'ended', outcome: 'win', reason: 'solved', secrets: { mine: null, theirs: null }, rating: null, xp: 1 })
    show('/duel/r2?token=t')
    expect(useDuelStore.getState().ended).toBeNull()
  })
})
