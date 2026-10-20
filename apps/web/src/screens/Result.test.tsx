import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fallbackDistribution, lostGame, wonGame } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'

const get = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { Result } = await import('./Result')

function route(game: unknown, id = 'g1') {
  get.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/games/')) return game
    if (path.startsWith('/api/stats/distribution')) return fallbackDistribution
    throw new Error(`unexpected ${path}`)
  })
  return renderRoute(<Result />, { path: '/result/:gameId', at: `/result/${id}` })
}

beforeEach(() => {
  get.mockReset()
})

describe('Result', () => {
  it('shows top 37%, three stars, the title and the approximate note for a win', async () => {
    const { container } = route(wonGame)
    expect(await screen.findByText('ТОП 37%')).toBeInTheDocument()
    expect(screen.getByLabelText('3 от 5 звезди')).toBeInTheDocument()
    expect(screen.getByText('Пастир')).toBeInTheDocument()
    expect(screen.getByText('ориентировъчно')).toBeInTheDocument()
    expect(screen.getByText('ЧИСЛОТО Е 5274')).toBeInTheDocument()
    expect(screen.getByText('Денят изгря!')).toBeInTheDocument()
    expect(container.querySelector('.confetti')).not.toBeNull()
  })

  it('renders as a dimmed overlay with a bottom sheet above the scene', async () => {
    const { container } = route(wonGame)
    const sheet = await screen.findByRole('region', { name: 'Резултат' })
    expect(sheet).toHaveClass('sheetup')
    expect(sheet.tagName).toBe('SECTION')
    expect(sheet.querySelector('h2')).toHaveTextContent('Денят изгря!')
    expect(screen.getByTestId('result-overlay')).toHaveClass('fadein')
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Виж класацията' })).toBeInTheDocument()
  })

  it('computes time, points and logic', async () => {
    route(wonGame)
    await screen.findByText('ТОП 37%')
    expect(screen.getByText('1:36')).toBeInTheDocument()
    expect(screen.getByText('1060')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('shows zero stars, no confetti and still the number after a loss', async () => {
    const { container } = route(lostGame, 'g2')
    expect(await screen.findByText('ЧИСЛОТО БЕШЕ 5274')).toBeInTheDocument()
    expect(screen.getByLabelText('0 от 5 звезди')).toBeInTheDocument()
    expect(screen.getByText('Мъглата остана…')).toBeInTheDocument()
    expect(screen.queryByText(/^ТОП/)).toBeNull()
    expect(container.querySelector('.confetti')).toBeNull()
  })

  it('marks practice games with a chip and zero points', async () => {
    route({ ...wonGame, practice: true, score: 0 })
    expect(await screen.findByText('упражнение')).toBeInTheDocument()
  })

  it('sends an unfinished game back to play', async () => {
    route({ ...wonGame, finishedAt: null, won: null, secret: undefined })
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })

  it('copies the share text and shows the copied label for a moment', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    route(wonGame)
    const share = await screen.findByRole('button', { name: 'Сподели' })
    fireEvent.click(share)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Копирано!' })).toBeInTheDocument(),
    )
    expect(writeText).toHaveBeenCalledWith('Бикове и крави · 4 цифри · 6 опита · топ 37%')
  })
})
