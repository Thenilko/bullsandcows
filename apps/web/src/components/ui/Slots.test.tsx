import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Slots } from './Slots'

describe('Slots', () => {
  it('lets a slot be chosen and shows digits placed out of order', () => {
    const onSelect = vi.fn()
    renderWithI18n(
      <Slots len={4} current="__7" active shake={0} selected={0} onSelect={onSelect} />,
    )
    expect(screen.getByRole('button', { name: 'Поле 3: 7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Поле 1, празно' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Поле 4, празно' }))
    expect(onSelect).toHaveBeenCalledWith(3)
  })

  it('stays plain signs without a handler (the secret in a duel)', () => {
    renderWithI18n(<Slots len={4} current="12" active shake={0} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
