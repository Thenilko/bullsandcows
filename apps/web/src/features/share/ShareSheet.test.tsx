import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildResult } from '../../screens/result/resultModel'
import { renderWithI18n } from '../../test/render'
import { fallbackDistribution, wonGame } from '../../test/fixtures'
import { shareFromResult } from './shareModel'
import { ShareSheet } from './ShareSheet'

vi.mock('./api', () => ({ postShare: vi.fn(async () => ({ counted: false })), postShareLanding: vi.fn() }))

const model = shareFromResult(buildResult(wonGame, fallbackDistribution))

beforeEach(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => undefined) }, configurable: true })
})

describe('ShareSheet', () => {
  it('draws the card: heading, attempts, one cell per digit per attempt with the heads, the top badge', () => {
    renderWithI18n(<ShareSheet model={model} onClose={() => undefined} />)
    const card = screen.getByRole('img', { name: 'Картичка с резултата' })
    expect(card).toHaveTextContent('Бикове и крави')
    expect(card).toHaveTextContent('Число на деня #127 · 15 ное')
    expect(card).toHaveTextContent('6 опита')
    expect(card).toHaveTextContent('01:36')
    expect(card).toHaveTextContent('ТОП 37% днес')
    expect(card.querySelectorAll('.sh-cell')).toHaveLength(24)
    expect(card.querySelectorAll('.sh-cell.sh-b [data-head="bull"]')).toHaveLength(7)
    expect(card.querySelectorAll('.sh-cell.sh-c [data-head="cow"]')).toHaveLength(6)
  })

  it('shows the exact chat text and the three actions', () => {
    renderWithI18n(<ShareSheet model={model} onClose={() => undefined} />)
    expect(screen.getByTestId('share-text')).toHaveTextContent(model.text.split('\n')[0] ?? '')
    expect(screen.getByRole('button', { name: 'Сподели…' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Копирай текста' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Запази картинката' })).toBeInTheDocument()
  })

  it('closes from the button, the backdrop and Escape', () => {
    const onClose = vi.fn()
    renderWithI18n(<ShareSheet model={model} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    fireEvent.click(screen.getByTestId('share-sheet-backdrop'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('dialog', { name: 'Сподели резултата' })).toHaveFocus()
  })
})
