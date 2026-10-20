import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Seg } from './Seg'

const options = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
] as const

describe('Seg', () => {
  it('is a radiogroup with the selected radio checked', () => {
    renderWithI18n(<Seg value="week" options={options} onChange={() => {}} label="Period" />)
    expect(screen.getByRole('radiogroup', { name: 'Period' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Today' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the clicked value', () => {
    const onChange = vi.fn()
    renderWithI18n(<Seg value="week" options={options} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Today' }))
    expect(onChange).toHaveBeenCalledWith('today')
  })
})
