import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { Keypad } from './Keypad'

const base = {
  len: 4 as const,
  zero: true,
  current: '',
  marks: {},
  disabled: false,
  onPress: () => {},
  onBack: () => {},
  onSubmit: () => {},
}

const digit = (d: string) => screen.getByRole('button', { name: `Цифра ${d}` })

describe('Keypad', () => {
  it('calls onPress with the digit', () => {
    const onPress = vi.fn()
    renderWithI18n(<Keypad {...base} onPress={onPress} />)
    fireEvent.click(digit('5'))
    expect(onPress).toHaveBeenCalledWith('5')
  })

  it('disables a digit already in the current guess', () => {
    renderWithI18n(<Keypad {...base} current="5" />)
    expect(digit('5')).toBeDisabled()
    expect(digit('4')).toBeEnabled()
  })

  it('disables 0 when zero is off', () => {
    renderWithI18n(<Keypad {...base} zero={false} />)
    expect(digit('0')).toBeDisabled()
  })

  it('disables every digit when the guess is full, but not submit', () => {
    renderWithI18n(<Keypad {...base} current="1234" />)
    for (const d of '0123456789') expect(digit(d)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Пусни стадото!' })).toBeEnabled()
  })

  it('disables submit until the guess is complete and back when empty', () => {
    renderWithI18n(<Keypad {...base} current="12" />)
    expect(screen.getByRole('button', { name: 'Пусни стадото!' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Изтрий' })).toBeEnabled()
  })

  it('disables back when the guess is empty', () => {
    renderWithI18n(<Keypad {...base} />)
    expect(screen.getByRole('button', { name: 'Изтрий' })).toBeDisabled()
  })

  it('applies nx / nok marks as classes', () => {
    renderWithI18n(<Keypad {...base} marks={{ '1': 1, '2': 2 }} />)
    expect(digit('1')).toHaveClass('key', 'nx')
    expect(digit('2')).toHaveClass('key', 'nok')
  })

  it('disables everything while disabled', () => {
    renderWithI18n(<Keypad {...base} current="1234" disabled />)
    expect(digit('5')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Пусни стадото!' })).toBeDisabled()
  })

  it('renders the ten digits in one grid in order 1..9,0', () => {
    renderWithI18n(<Keypad {...base} />)
    const grid = digit('1').parentElement!
    expect(grid.style.gridTemplateColumns).toBe('repeat(5, minmax(0, 1fr))')
    expect(Array.from(grid.children).map((c) => c.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])
  })

  it('renders an icon-only back button and a cta submit in a 1fr 2.2fr row', () => {
    renderWithI18n(<Keypad {...base} current="1" />)
    const back = screen.getByRole('button', { name: 'Изтрий' })
    expect(back).toHaveClass('soft', 'icobtn')
    expect(back.textContent).toBe('')
    expect(back.querySelector('svg')).not.toBeNull()
    expect(back.parentElement!.style.gridTemplateColumns).toBe('1fr 2.2fr')
    expect(screen.getByRole('button', { name: 'Пусни стадото!' })).toHaveClass('cta')
  })

  it('uses 56px keys and 10px gap in the desktop layout', () => {
    renderWithI18n(<Keypad {...base} layout="desktop" />)
    expect(digit('1').style.height).toBe('56px')
    expect(digit('1').parentElement!.style.gap).toBe('10px')
  })
})
