import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../../test/render'
import { ModeSwitch } from './SetupFields'

describe('ModeSwitch', () => {
  it('draws the prototype picture on each mode card: bull, bull with cow, scarecrow', () => {
    renderWithI18n(<ModeSwitch mode="solo" onPick={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Режим на игра' })
    const [solo, duel, bot] = within(group).getAllByRole('button')
    expect(solo).toHaveTextContent('Соло')
    expect(solo!.querySelectorAll('svg')).toHaveLength(1)
    expect(duel!.querySelectorAll('svg')).toHaveLength(2)
    expect(bot).toHaveTextContent('Срещу бот')
    expect(bot!.querySelectorAll('svg')).toHaveLength(1)
    expect(solo).toHaveAttribute('aria-pressed', 'true')
    expect(duel).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the picked mode', () => {
    const onPick = vi.fn()
    renderWithI18n(<ModeSwitch mode="solo" onPick={onPick} />)
    screen.getByRole('button', { name: /Срещу бот/ }).click()
    expect(onPick).toHaveBeenCalledWith('bot')
  })
})
