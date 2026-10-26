import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Confetti } from './Confetti'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }))

describe('Confetti', () => {
  beforeEach(() => {
    reduced.value = false
  })

  it('renders animated pieces by default', () => {
    const { container } = renderWithI18n(<Confetti active />)
    expect(container.querySelectorAll('.confetti').length).toBeGreaterThan(0)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renders a static banner instead of pieces under reduced motion', () => {
    reduced.value = true
    const { container } = renderWithI18n(<Confetti active />)
    expect(container.querySelectorAll('.confetti')).toHaveLength(0)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders nothing when inactive', () => {
    const { container } = renderWithI18n(<Confetti active={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
