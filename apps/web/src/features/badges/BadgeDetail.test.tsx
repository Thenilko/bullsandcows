import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../../test/render'
import { badgesFixture } from '../../test/fixtures'
import { badgeView, badgeViews } from './badgeModel'
import { BadgeDetail } from './BadgeDetail'

const view = (key: string) => badgeViews(badgesFixture).find((v) => v.key === key)!

describe('BadgeDetail', () => {
  it('shows the medallion, the three steps with thresholds (done in green) and the progress text', () => {
    renderWithI18n(<BadgeDetail view={view('noWaste')} onClose={() => undefined} />)
    const dialog = screen.getByRole('dialog', { name: 'Значка' })
    expect(dialog).toHaveTextContent('Без излишен ход')
    expect(dialog).toHaveTextContent('Победа без нито един нелогичен опит')
    expect(dialog.querySelector('.md')).toHaveClass('md-xl', 'md-silver')
    const steps = Array.from(dialog.querySelectorAll('.step'))
    expect(steps.map((s) => s.textContent)).toEqual(['мед1 път', 'сребро10 пъти', 'злато50 пъти'])
    expect(steps.map((s) => s.classList.contains('done'))).toEqual([true, true, false])
    expect(screen.getByTestId('badge-progress')).toHaveTextContent('14 от 50 до следващата степен')
    expect(screen.getByRole('progressbar', { name: 'Без излишен ход' })).toHaveAttribute('aria-valuenow', '28')
    expect(dialog).toHaveTextContent('+50 XP за всяка степен')
  })

  it('says every tier is collected for a finished single badge and counts days for the streak', () => {
    renderWithI18n(<BadgeDetail view={view('allCows')} onClose={() => undefined} />)
    expect(screen.getByTestId('badge-progress')).toHaveTextContent('Всички степени са събрани')
    expect(screen.getAllByRole('dialog')[0]?.querySelectorAll('.step')).toHaveLength(1)
  })

  it('shows days for the streak and formats for the collector', () => {
    const { unmount } = renderWithI18n(<BadgeDetail view={view('streak')} onClose={() => undefined} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('7 дни')
    unmount()
    renderWithI18n(<BadgeDetail view={view('formats')} onClose={() => undefined} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('6 формата')
    expect(screen.getByTestId('badge-progress')).toHaveTextContent('4 от 6 до следващата степен')
  })

  it('keeps a hidden badge secret and marks an unavailable one „скоро“', () => {
    const { unmount } = renderWithI18n(<BadgeDetail view={view('mirror')} onClose={() => undefined} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('???')
    expect(screen.getByRole('dialog')).toHaveTextContent('Скрита значка — открий я сама')
    expect(screen.queryByText('Огледало')).toBeNull()
    unmount()
    renderWithI18n(<BadgeDetail view={badgeView({ key: 'weekly', tier: 0, progress: 0, next: 1, earnedAt: null })} onClose={() => undefined} />)
    expect(screen.getByText('скоро')).toBeInTheDocument()
    expect(screen.getByText('Тази значка идва с бъдеща част от играта.')).toBeInTheDocument()
  })

  it('closes from the button', () => {
    const onClose = vi.fn()
    renderWithI18n(<BadgeDetail view={view('noWaste')} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
