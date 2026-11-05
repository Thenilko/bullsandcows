import type { ClientMsg } from '@bc/protocol'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureState } from '../../dev/duelFixtures'
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
  it('immersive: the opponent strip is bottom-left of the full-bleed scene and the panel is the column card', () => {
    mockViewport(...IMMERSIVE)
    const { container } = show()
    expect(container.querySelector('.dk')).toHaveClass('dk-imm', 'sc-duel')
    const strip = container.querySelector('.ostrip') as HTMLElement
    expect(strip.parentElement).toHaveClass('dk-strip')
    expect(strip.closest('.dk-scene')).toBeNull()
    expect(strip.closest('main')).toBeNull()
    expect(screen.getByRole('button', { name: 'Цифра 1' }).closest('main')).toHaveClass('dk-col')
  })

  it('split: the opponent strip sits at the bottom of the scene card', () => {
    mockViewport(...SPLIT)
    const { container } = show()
    expect(container.querySelector('.dk')).toHaveClass('dk-split', 'sc-duel')
    const strip = container.querySelector('.ostrip') as HTMLElement
    expect(strip.parentElement).toHaveClass('dk-strip')
    expect(strip.closest('.dk-scene')).not.toBeNull()
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
