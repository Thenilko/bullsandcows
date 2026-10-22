import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import { boardFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'

const get = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { Leaderboard } = await import('./Leaderboard')

function show() {
  return renderRoute(<Leaderboard />, { path: '/board', at: '/board' })
}

beforeEach(() => {
  get.mockReset()
})

function desktopViewport() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

describe('Leaderboard', () => {
  it('shows the table header and the place aside on desktop', async () => {
    desktopViewport()
    get.mockResolvedValue(boardFixture)
    show()
    expect(await screen.findByText('МЯСТО')).toBeInTheDocument()
    expect(screen.getByText('ТОЧКИ')).toBeInTheDocument()
    expect(screen.queryByText('ВРЕМЕ')).toBeNull()
    expect(screen.getByText('Твоето място')).toBeInTheDocument()
    expect(screen.getByText('№5')).toBeInTheDocument()
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('renders the podium as 2-1-3 and highlights my row', async () => {
    get.mockResolvedValue(boardFixture)
    const { container } = show()
    await screen.findByText('Ани')
    const order = screen.getAllByText(/^(Ани|Боби|Цвети)$/).map((n) => n.textContent)
    expect(order).toEqual(['Боби', 'Ани', 'Цвети'])
    expect(screen.getByRole('img', { name: 'Бик, Стопанин' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Бик, Пастир' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Бик, Говедар' })).toHaveLength(2)
    const mine = container.querySelector('.lbrow.you')
    expect(mine).not.toBeNull()
    expect(mine).toHaveTextContent('Мира')
    expect(screen.getByText('Ти си №5')).toBeInTheDocument()
    expect(screen.getByText('топ 40% от всички')).toBeInTheDocument()
  })

  it('asks for the right period and digits', async () => {
    get.mockResolvedValue(boardFixture)
    show()
    await screen.findByText('Ани')
    expect(get).toHaveBeenLastCalledWith('/api/leaderboard?period=today&len=4&zero=false')
    fireEvent.click(screen.getByRole('radio', { name: 'Седмица' }))
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/leaderboard?period=week&len=4&zero=false'),
    )
    fireEvent.click(screen.getByRole('radio', { name: '5' }))
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/leaderboard?period=week&len=5&zero=false'),
    )
  })

  it('offers a profile to guests after ERR_GUEST', async () => {
    get.mockRejectedValue(new ApiError('ERR_GUEST', 403))
    show()
    expect(await screen.findByText('Класацията е за регистрирани пастири.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
    expect(await screen.findByLabelText('Парола')).toBeInTheDocument()
    expect(sessionStorage.getItem('bc.returnTo')).toBe('/board')
  })

  it('shows an empty state with a way to play', async () => {
    get.mockResolvedValue({ rows: [], me: null })
    show()
    expect(await screen.findByText(/още няма/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Играй сега' })).toBeInTheDocument()
  })
})
