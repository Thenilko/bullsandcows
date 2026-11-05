import type { ClientMsg } from '@bc/protocol'
import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureOpp, fixtureState, oppGuess } from '../../dev/duelFixtures'
import { useDuelStore } from '../../features/duel/store'
import { useNotebookStore } from '../../features/notebook/store'
import { renderWithI18n } from '../../test/render'
import { IMMERSIVE, mockViewport, resetViewport, SPLIT } from '../../test/viewport'

vi.mock('../../hooks/useIsDesktop', () => ({ useIsDesktop: () => true }))

const { DuelPlay } = await import('./DuelPlay')

function show(state = fixtureState()) {
  useDuelStore.getState().apply({ t: 'state', state })
  return renderWithI18n(
    <MemoryRouter initialEntries={['/duel/r1']}>
      <Routes>
        <Route
          path="/duel/:roomId"
          element={
            <DuelPlay roomId="r1" state={useDuelStore.getState().state ?? state} send={vi.fn()} />
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useDuelStore.getState().reset()
  sessionStorage.clear()
  localStorage.clear()
  useNotebookStore.setState({ games: {} })
})
afterEach(resetViewport)

describe('DuelPlay on the desktop', () => {
  it('immersive: the solo hanging board and notes sheet, the opponent strip bottom-left of the scene', () => {
    mockViewport(...IMMERSIVE)
    const { container } = show()
    expect(container.querySelector('.dk')).toHaveClass('dk-imm', 'sc-play')
    const strip = container.querySelector('.ostrip') as HTMLElement
    expect(strip.closest('.dk-strip')).not.toBeNull()
    expect(strip.closest('.dk-scene')).toBeNull()
    expect(strip.closest('main')).toBeNull()
    const key = screen.getByRole('button', { name: 'Цифра 1' })
    expect(key.closest('.dk-game')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Дуел · Класически' })).toBeInTheDocument()
    expect(
      screen.getByText('Можеш да пишеш и от клавиатурата: цифри, Backspace, Enter.'),
    ).toBeInTheDocument()
  })

  it('split: the opponent strip sits at the bottom of the scene card', () => {
    mockViewport(...SPLIT)
    const { container } = show()
    expect(container.querySelector('.dk')).toHaveClass('dk-split', 'sc-play')
    const strip = container.querySelector('.ostrip') as HTMLElement
    expect(strip.closest('.dk-strip')).not.toBeNull()
    expect(strip.closest('.dk-scene')).not.toBeNull()
  })

  it('shows the solo hud chips: the fog, the turn timer and „clock · опит N“', () => {
    mockViewport(...IMMERSIVE)
    const { container } = show(fixtureState({ turnDeadline: Date.now() + 60_000 }))
    const hud = container.querySelector('.dk-hud') as HTMLElement
    expect(hud).toHaveTextContent('Мъгла · 3024 възможни числа')
    expect(within(hud).getByRole('timer')).toBeInTheDocument()
    expect(hud).toHaveTextContent('· опит 1')
  })

  it('classic: the opponent attempts on a plank above the strip; a race has none', () => {
    mockViewport(...IMMERSIVE)
    const { container, unmount } = show(
      fixtureState({ opp: fixtureOpp({ guesses: [oppGuess('9021', 0, 2)] }) }),
    )
    const plank = screen.getByTestId('opp-board')
    expect(plank.closest('.dk-strip')).not.toBeNull()
    expect(plank).toHaveTextContent('9021')
    expect(container.querySelector('[data-testid="guess-board"]')).toBeNull()
    unmount()
    show(fixtureState({ format: 'race', turn: null }))
    expect(screen.queryByTestId('opp-board')).toBeNull()
  })

  it('gives up from the foot of the notebook sheet', () => {
    mockViewport(...IMMERSIVE)
    const send = vi.fn()
    useDuelStore.getState().apply({ t: 'state', state: fixtureState() })
    renderWithI18n(
      <MemoryRouter initialEntries={['/duel/r1']}>
        <DuelPlay roomId="r1" state={fixtureState()} send={send} />
      </MemoryRouter>,
    )
    const notes = screen.getByRole('region', { name: 'Тефтерче' })
    fireEvent.click(within(notes).getByRole('button', { name: 'Предавам се' }))
    expect(send).toHaveBeenCalledWith({ t: 'giveUp' })
  })

  it('shows no title after the logo, „Нова игра“ and the sound toggle; no phone top row', () => {
    mockViewport(...IMMERSIVE)
    const { container } = show()
    expect(container.querySelector('.dk-title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Нова игра' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /звука/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Към нова игра' })).toBeNull()
  })

  it('keeps the notebook card inside the panel', () => {
    mockViewport(...SPLIT)
    show()
    expect(screen.getByRole('region', { name: 'Тефтерче' }).closest('main')).toHaveClass('dk-col')
  })
})

describe('DuelPlay keyboard on the desktop', () => {
  function showWith(send: (msg: ClientMsg) => void, state = fixtureState()) {
    useDuelStore.getState().apply({ t: 'state', state })
    return renderWithI18n(
      <MemoryRouter initialEntries={['/duel/r1']}>
        <Routes>
          <Route
            path="/duel/:roomId"
            element={<DuelPlay roomId="r1" state={state} send={send} />}
          />
        </Routes>
      </MemoryRouter>,
    )
  }
  const type = (keys: string) => {
    for (const key of keys) fireEvent.keyDown(window, { key })
  }

  it('types digits, erases with Backspace and sends the guess with Enter on my turn', () => {
    mockViewport(...IMMERSIVE)
    const send = vi.fn()
    showWith(send, fixtureState({ me: { ...fixtureState().me, guesses: [] } }))
    type('5679')
    fireEvent.keyDown(window, { key: 'Backspace' })
    type('8')
    expect(useDuelStore.getState().cur).toBe('5678')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ t: 'guess', code: '5678' }))
  })

  it('ignores 0 in a game without zero', () => {
    mockViewport(...IMMERSIVE)
    showWith(vi.fn())
    type('0')
    expect(useDuelStore.getState().cur).toBe('')
  })

  it("ignores the keyboard while it is the opponent's turn in the classic format", () => {
    mockViewport(...IMMERSIVE)
    const send = vi.fn()
    showWith(send, fixtureState({ turn: 'b' }))
    type('1234')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(useDuelStore.getState().cur).toBe('')
    expect(send).not.toHaveBeenCalled()
  })
})
