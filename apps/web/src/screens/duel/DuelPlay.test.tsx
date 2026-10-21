import { act, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureMe, fixtureOpp, fixtureState, myGuess } from '../../dev/duelFixtures'
import { useDuelStore } from '../../features/duel/store'
import { renderWithI18n } from '../../test/render'
import { DuelPlay } from './DuelPlay'

const send = vi.fn()

function show(state = fixtureState()) {
  useDuelStore.getState().apply({ t: 'state', state })
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/r1']}>
      <Routes>
        <Route path="/duel/:roomId" element={<DuelPlay roomId="r1" state={useDuelStore.getState().state ?? state} send={send} />} />
        <Route path="/duel/:roomId/result" element={<p>result screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const digit = (d: string) => screen.getByRole('button', { name: `Цифра ${d}` })

beforeEach(() => {
  send.mockClear()
  useDuelStore.getState().reset()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DuelPlay', () => {
  it('shows the opponent strip over the scene, outside the panel', () => {
    show()
    const strip = document.querySelector('.ostrip') as HTMLElement
    expect(strip).not.toBeNull()
    expect(strip.closest('main')).toBeNull()
    expect(screen.getByTestId('opp-progress')).toBeInTheDocument()
  })

  it('shows the PasDuel top row over the scene: back to the setup, the title, the sound toggle', () => {
    show()
    const back = screen.getByRole('button', { name: 'Към нова игра' })
    expect(back.closest('main')).toBeNull()
    expect(screen.getByText(/^Дуел · /)).toHaveClass('ps-hud')
    expect(screen.getByRole('button', { name: /звука/ })).toBeInTheDocument()
  })

  it('enables the keypad on my turn', () => {
    show()
    expect(digit('1')).toBeEnabled()
  })

  it('disables the keypad when it is the opponent turn', () => {
    show(fixtureState({ turn: 'b' }))
    expect(digit('1')).toBeDisabled()
    expect(screen.getByText(/Боби мисли/)).toBeInTheDocument()
  })

  it('disables the keypad when the match is not playing', () => {
    show(fixtureState({ phase: 'countdown' }))
    expect(digit('1')).toBeDisabled()
  })

  it('keeps the race keypad enabled regardless of turn', () => {
    show(fixtureState({ format: 'race', turn: null }))
    expect(digit('1')).toBeEnabled()
  })

  it('sends a complete guess and clears the input', () => {
    show()
    for (const d of ['1', '2', '3', '4']) fireEvent.click(digit(d))
    fireEvent.click(screen.getByRole('button', { name: 'Пусни стадото!' }))
    expect(send).toHaveBeenCalledWith({ t: 'guess', code: '1234' })
    expect(useDuelStore.getState().cur).toBe('')
  })

  it('rejects a repeated guess locally with a translated message', () => {
    show(fixtureState({ me: fixtureMe({ guesses: [myGuess('1234', 1, 1)] }) }))
    for (const d of ['1', '2', '3', '4']) fireEvent.click(digit(d))
    fireEvent.click(screen.getByRole('button', { name: 'Пусни стадото!' }))
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByText('Вече пробва това число.')).toBeInTheDocument()
  })

  it('shows the red timer after a warning event', () => {
    const deadline = Date.now() + 60_000
    show(fixtureState({ turnDeadline: deadline }))
    expect(screen.getByRole('timer')).not.toHaveAttribute('data-warning', 'true')
    act(() => useDuelStore.getState().apply({ t: 'warning', msLeft: 15_000 }))
    expect(screen.getByRole('timer')).toHaveAttribute('data-warning', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Остават 15 секунди за хода!')
  })

  it('announces opponent moves with a toast', () => {
    show(fixtureState({ format: 'race', turn: null, opp: fixtureOpp({ left: 900 }) }))
    act(() => useDuelStore.getState().apply({ t: 'oppMoved', attempts: 3, left: 900 }))
    expect(screen.getByText('Боби направи опит №3')).toBeInTheDocument()
  })

  it('goes to the result 1400 ms after the match ends', () => {
    vi.useFakeTimers()
    show()
    act(() => {
      useDuelStore.getState().apply({ t: 'ended', outcome: 'win', reason: 'solved', secrets: { mine: '1234', theirs: '4321' }, rating: null, xp: 120 })
    })
    act(() => vi.advanceTimersByTime(1399))
    expect(screen.queryByText('result screen')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('result screen')).toBeInTheDocument()
  })

  it('gives up on request', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Предавам се' }))
    expect(send).toHaveBeenCalledWith({ t: 'giveUp' })
  })
})
