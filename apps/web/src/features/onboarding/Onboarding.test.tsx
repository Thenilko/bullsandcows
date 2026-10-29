import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { OnboardingHost } from './Onboarding'
import { ONBOARDING_KEY, isQuietPath, onboardingSeen, openOnFirstVisit, useOnboarding } from './store'

const TOTAL_STEPS = 6

beforeEach(() => {
  window.localStorage.clear()
  useOnboarding.setState({ open: false, step: 0 })
})

function firstVisit(pathname = '/login') {
  renderWithI18n(<OnboardingHost />)
  act(() => openOnFirstVisit(pathname))
}

describe('first-visit tour', () => {
  it('greets a new visitor with a choice: show me or skip', () => {
    firstVisit()
    const dialog = screen.getByRole('dialog', { name: 'Въведение в играта' })
    expect(dialog).toHaveTextContent('Добре дошъл на пасището')
    expect(screen.getByRole('button', { name: 'Покажи ми' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Пропусни, ще се оправя' })).toBeInTheDocument()
  })

  it('skipping closes it and remembers the visitor', () => {
    firstVisit()
    fireEvent.click(screen.getByRole('button', { name: 'Пропусни, ще се оправя' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onboardingSeen()).toBe(true)
    act(() => openOnFirstVisit('/login'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('walks through every step forward and back, then ends with „Да играем!“', () => {
    firstVisit()
    fireEvent.click(screen.getByRole('button', { name: 'Покажи ми' }))
    expect(screen.getByRole('heading', { name: 'Познай скритото число' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Стъпка 1 от ${TOTAL_STEPS}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Напред' }))
    expect(screen.getByRole('heading', { name: 'Бикове и крави' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(screen.getByRole('heading', { name: 'Познай скритото число' })).toBeInTheDocument()

    for (let i = 1; i < TOTAL_STEPS; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Напред' }))
    expect(screen.getByRole('heading', { name: 'Къде какво има' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Напред' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Да играем!' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_KEY)).not.toBeNull()
  })

  it('can be skipped from the middle of the tour', () => {
    firstVisit()
    fireEvent.click(screen.getByRole('button', { name: 'Покажи ми' }))
    fireEvent.click(screen.getByRole('button', { name: 'Напред' }))
    fireEvent.click(screen.getByRole('button', { name: 'Пропусни' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onboardingSeen()).toBe(true)
  })

  it('does not open over legal pages, the reset link or the dev gallery', () => {
    for (const path of ['/privacy', '/terms', '/reset', '/dev/screens', '/story']) expect(isQuietPath(path)).toBe(true)
    for (const path of ['/', '/login', '/rules', '/d/ABC12']) expect(isQuietPath(path)).toBe(false)
    firstVisit('/privacy')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('replays from the first step after it was seen', () => {
    window.localStorage.setItem(ONBOARDING_KEY, 'seen')
    renderWithI18n(<OnboardingHost />)
    act(() => useOnboarding.getState().show(1))
    expect(screen.getByRole('heading', { name: 'Познай скритото число' })).toBeInTheDocument()
  })
})
