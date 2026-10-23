import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { badgesFixture } from '../../test/fixtures'
import { BadgesTab } from './BadgesTab'

const DATA = { states: badgesFixture, loading: false, error: false }

describe('BadgesTab', () => {
  it('renders the collection card and the 29 tiles in 8 groups with their tier pips', () => {
    const { container } = renderWithI18n(<BadgesTab badges={DATA} guest={false} onOpen={() => undefined} />)
    expect(screen.getByText('16 значки · 19 степени · 13 предстоят')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Колекция' })).toHaveAttribute('aria-valuenow', '16')
    const groups = screen.getAllByRole('region')
    expect(groups.map((g) => g.getAttribute('aria-labelledby'))).toEqual([
      'badges-logic', 'badges-speed', 'badges-consistency', 'badges-duel', 'badges-bot', 'badges-collector', 'badges-together', 'badges-hidden',
    ])
    expect(groups[0]?.querySelectorAll('.bdg')).toHaveLength(6)
    expect(container.querySelectorAll('.bdg')).toHaveLength(29)
    expect(screen.getByText('Логика').parentElement).toHaveTextContent('4 / 6')
    const noWaste = screen.getByRole('button', { name: 'Без излишен ход: сребро' })
    expect(noWaste.querySelector('.md')).toHaveClass('md-silver')
    expect(Array.from(noWaste.querySelectorAll('.pips i')).map((i) => i.className)).toEqual(['on1', 'on2', ''])
    const allCows = screen.getByRole('button', { name: 'Всички крави: злато' })
    expect(allCows.querySelector('.md')).toHaveClass('md-gold')
    expect(allCows.querySelector('[data-head="cow"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Плашило · Трудно: не е спечелена' })).toHaveClass('locked')
  })

  it('shows „???“ for the hidden badges until earned and the Scarecrow for the bots', () => {
    renderWithI18n(<BadgesTab badges={DATA} guest={false} onOpen={() => undefined} />)
    const hidden = screen.getAllByRole('button', { name: '???: не е спечелена' })
    expect(hidden).toHaveLength(3)
    expect(hidden[0]).toHaveClass('hidden')
    const bot = screen.getByRole('button', { name: 'Плашило · Лесно: злато' })
    expect(bot.querySelector('[data-glyph="scarecrow"] svg')).not.toBeNull()
  })

  it('names an earned hidden badge', () => {
    const states = badgesFixture.map((b) => (b.key === 'mirror' ? { ...b, tier: 1, progress: 1, next: null } : b))
    renderWithI18n(<BadgesTab badges={{ ...DATA, states }} guest={false} onOpen={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Огледало: злато' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '???: не е спечелена' })).toHaveLength(2)
  })

  it('opens a tile and tells guests to sign in', () => {
    const onOpen = vi.fn()
    renderWithI18n(<BadgesTab badges={{ states: undefined, loading: false, error: false }} guest onOpen={onOpen} />)
    expect(screen.getByText('Влез, за да събираш значки')).toBeInTheDocument()
    expect(document.querySelectorAll('.bdg.locked')).toHaveLength(29)
    fireEvent.click(screen.getByRole('button', { name: 'Шерлок: не е спечелена' }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ key: 'sherlock', tier: 0 }))
  })

  it('shows loading and error lines while the tiles stay in place', () => {
    const { rerender } = renderWithI18n(<BadgesTab badges={{ states: undefined, loading: true, error: false }} guest={false} onOpen={() => undefined} />)
    expect(screen.getByRole('status')).toHaveTextContent('Зареждане…')
    rerender(<BadgesTab badges={{ states: undefined, loading: false, error: true }} guest={false} onOpen={() => undefined} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(document.querySelectorAll('.bdg')).toHaveLength(29)
  })
})
