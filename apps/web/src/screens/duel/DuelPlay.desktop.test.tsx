import { screen } from '@testing-library/react'
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
        <Route path="/duel/:roomId" element={<DuelPlay roomId="r1" state={useDuelStore.getState().state ?? state} send={vi.fn()} />} />
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

  it('shows the duel title after the logo, „Нова игра“ and the sound toggle; no phone top row', () => {
    mockViewport(...IMMERSIVE)
    const { container } = show()
    const title = container.querySelector('.dk-title') as HTMLElement
    expect(title.textContent).toMatch(/^· Дуел · /)
    expect(title.closest('header')).not.toBeNull()
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
