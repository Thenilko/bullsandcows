import { act, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureState } from '../../dev/duelFixtures'
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
