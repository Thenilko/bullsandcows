import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { BADGE_TOAST_MS, BadgeToastHost } from './BadgeToastHost'
import { useBadgeToasts } from './toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useBadgeToasts.setState({ queue: [], shown: 0 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BadgeToastHost', () => {
  it('shows nothing until a tier arrives, then the toasts one by one in order', () => {
    renderWithI18n(<BadgeToastHost />)
    expect(screen.queryByRole('status')).toBeNull()
    act(() => useBadgeToasts.getState().push([{ key: 'sherlock', tier: 2 }, { key: 'allCows', tier: 1 }]))
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Нова значка!')
    expect(toast).toHaveTextContent('Шерлок · сребро')
    expect(toast.querySelector('.md')).toHaveClass('md-silver', 'boing')
    act(() => vi.advanceTimersByTime(BADGE_TOAST_MS))
    expect(screen.getByRole('status')).toHaveTextContent('Всички крави · злато')
    act(() => vi.advanceTimersByTime(BADGE_TOAST_MS))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('can be dismissed, and tapping opens the detail of that badge', () => {
    renderWithI18n(<BadgeToastHost />)
    act(() => useBadgeToasts.getState().push([{ key: 'bolt', tier: 1 }, { key: 'teller', tier: 1 }]))
    fireEvent.click(screen.getByRole('button', { name: 'Скрий' }))
    expect(screen.getByRole('status')).toHaveTextContent('Разказвач · мед')
    fireEvent.click(screen.getByRole('button', { name: 'Виж значката' }))
    expect(screen.queryByRole('status')).toBeNull()
    const dialog = screen.getByRole('dialog', { name: 'Значка' })
    expect(dialog).toHaveTextContent('Разказвач')
    expect(dialog).toHaveTextContent('5 от 25 до следващата степен')
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays when sticky', () => {
    renderWithI18n(<BadgeToastHost sticky />)
    act(() => useBadgeToasts.getState().push([{ key: 'bolt', tier: 1 }]))
    act(() => vi.advanceTimersByTime(BADGE_TOAST_MS * 2))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
