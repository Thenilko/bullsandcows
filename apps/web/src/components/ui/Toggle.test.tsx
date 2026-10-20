import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('is a switch exposing its state', () => {
    renderWithI18n(<Toggle on label="Sounds" onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Sounds' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveClass('toggle', 'on')
  })

  it('reports the inverted value on click', () => {
    const onChange = vi.fn()
    renderWithI18n(<Toggle on={false} label="Sounds" onChange={onChange} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
