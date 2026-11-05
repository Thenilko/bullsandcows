import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FIXTURE_T0,
  fixtureMe,
  fixtureOpp,
  fixtureState,
  myGuess,
  oppGuess,
} from '../../dev/duelFixtures'
import { useDuelStore, type EndedEvent } from '../../features/duel/store'
import { renderWithI18n } from '../../test/render'
import { DuelResult } from './DuelResult'

const send = vi.fn()
const SECRETS = { mine: '1234', theirs: '5678' }

function endedState(over: Parameters<typeof fixtureState>[0] = {}) {
  return fixtureState({
    phase: 'ended',
    turn: null,
    endedAt: FIXTURE_T0 + 131_000,
    outcome: { winner: 'a', reason: 'solved' },
    secrets: SECRETS,
    me: fixtureMe({ guesses: [myGuess('1234', 1, 2), myGuess('5678', 4, 0)] }),
    opp: fixtureOpp({ guesses: [oppGuess('9021', 0, 2)] }),
    ...over,
  })
}

function show(state = endedState(), ended: Partial<EndedEvent> | null = null) {
  if (ended) {
    useDuelStore.setState({
      ended: {
        outcome: 'win',
        reason: 'solved',
        secrets: SECRETS,
        rating: null,
        xp: 120,
        ...ended,
      },
    })
  }
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/r1/result']}>
      <Routes>
        <Route
          path="/duel/r1/result"
          element={<DuelResult roomId="r1" state={state} send={send} />}
        />
        <Route path="/duel/new" element={<p>duel setup</p>} />
        <Route path="/bot/new" element={<p>bot setup</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  send.mockClear()
  useDuelStore.getState().reset()
  sessionStorage.clear()
})

describe('DuelResult', () => {
  it('is the solo result card: the numbers as the kicker, the big title, the mode chip', () => {
    show()
    const card = screen.getByRole('region', { name: 'Резултат' })
    expect(card).toHaveTextContent('НЕГОВОТО 5678 · ТВОЕТО 1234')
    expect(within(card).getByRole('heading', { name: 'Победа!' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Дуел · Класически')
    expect(card).toHaveTextContent('Изпревари Боби. Биковете са в обора.')
    expect(screen.getByTestId('result-overlay')).toBeInTheDocument()
  })

  it('keeps both players with their attempts and who solved it', () => {
    show()
    const card = screen.getByRole('region', { name: 'Резултат' })
    expect(card).toHaveTextContent('Мира (ти)')
    expect(card).toHaveTextContent('Боби')
    expect(within(card).getByText('позна')).toBeInTheDocument()
    expect(within(card).getByText('не позна')).toBeInTheDocument()
  })

  it('shows the stat tiles: attempts, time, XP and the rating change', () => {
    show(endedState(), { xp: 120, rating: { from: 1240, to: 1258, delta: 18 } })
    expect(screen.getAllByText('02:11')).toHaveLength(2)
    for (const text of ['опита', 'време', '+120', 'т. опит', '+18', 'рейтинг 1258']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('celebrates a win with confetti and none on a loss', () => {
    const { unmount } = show()
    expect(document.querySelector('.confetti, .confetti-banner')).not.toBeNull()
    unmount()
    show(endedState({ outcome: { winner: 'b', reason: 'solved' } }))
    expect(screen.getByRole('heading', { name: 'Загуба' })).toBeInTheDocument()
    expect(document.querySelector('.confetti, .confetti-banner')).toBeNull()
  })

  it('names the race number like the solo kicker and the bot level in the chip', () => {
    show(endedState({ format: 'race', opponentKind: 'bot', botLevel: 1 }))
    const card = screen.getByRole('region', { name: 'Резултат' })
    expect(card).toHaveTextContent('ЧИСЛОТО Е 1234')
    expect(card).toHaveTextContent('Срещу Плашилото · Лесно')
  })

  it('offers a rematch, a new game and sharing', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Реванш' }))
    expect(send).toHaveBeenCalledWith({ t: 'rematch' })
    fireEvent.click(screen.getByRole('button', { name: 'Сподели' }))
    expect(screen.getByRole('dialog', { name: 'Сподели резултата' })).toBeInTheDocument()
  })

  it('starts a new duel from the setup', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Нова игра' }))
    expect(screen.getByText('duel setup')).toBeInTheDocument()
  })
})
