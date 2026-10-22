import { rankKeyForLevel } from '@bc/game-core'
import { act, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureMe, fixtureOpp, fixtureState } from '../../dev/duelFixtures'
import { useDuelStore } from '../../features/duel/store'
import { renderWithI18n } from '../../test/render'
import { Found } from './Found'

beforeEach(() => {
  vi.useFakeTimers()
  useDuelStore.getState().reset()
})
afterEach(() => void vi.useRealTimers())

describe('Found countdown fallback', () => {
  it('derives the start instant from countdownAt + 2100 ms', () => {
    // countdown began 1000 ms from now -> 3-2-1 must start at +1000, play at +3100
    const state = fixtureState({ phase: 'countdown', countdownAt: Date.now() + 1000 })
    renderWithI18n(
      <MemoryRouter>
        <Found state={state} send={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Готови…')).not.toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(1000))
    expect(screen.getByText('Готови…')).toBeInTheDocument()
  })
})

describe('Found avatars', () => {
  it('shows me as a bull and a human opponent as a cow, each with the title of their level', () => {
    const state = fixtureState({ phase: 'lobby', me: fixtureMe({ level: 7 }), opp: fixtureOpp({ level: 6 }) })
    const { container } = renderWithI18n(
      <MemoryRouter>
        <Found state={state} send={vi.fn()} />
      </MemoryRouter>,
    )
    const bull = screen.getByRole('img', { name: /^Бик, / })
    const cow = screen.getByRole('img', { name: /^Крава, / })
    expect(bull.querySelector('[data-rank]')).toHaveAttribute('data-rank', rankKeyForLevel(7))
    expect(cow.querySelector('[data-rank]')).toHaveAttribute('data-rank', rankKeyForLevel(6))
    expect(container.querySelector('[data-head="calf"]')).toBeNull()
  })

  it('shows a guest opponent as a calf', () => {
    const state = fixtureState({ phase: 'lobby', opp: fixtureOpp({ isGuest: true, level: 9 }) })
    renderWithI18n(
      <MemoryRouter>
        <Found state={state} send={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: 'Крава, Теленце' })).toBeInTheDocument()
  })
})
