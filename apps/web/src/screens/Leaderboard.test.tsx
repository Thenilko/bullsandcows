import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import { useSession } from '../features/auth/session'
import { boardFixture, guestBoardFixture, meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'

const get = vi.fn()
const post = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: (p: string, b?: unknown) => post(p, b) },
}))

const { Leaderboard } = await import('./Leaderboard')

function show() {
  return renderRoute(<Leaderboard />, { path: '/board', at: '/board' })
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  sessionStorage.clear()
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
    expect(screen.getByText('ВРЕМЕ')).toBeInTheDocument()
    expect(screen.getByText('2:21')).toBeInTheDocument()
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
    expect(screen.getByRole('img', { name: 'Крава, Стопанин' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Бик, Пастир' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Крава, Овчар' })).toBeInTheDocument()
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

  describe('for a guest', () => {
    beforeEach(() => {
      useSession.setState({
        session: {
          accessToken: 't',
          refreshToken: '',
          expiresAt: 0,
          user: { id: 'g1', isGuest: true },
        },
        me: { ...meFixture, profile: { ...meFixture.profile, isGuest: true } },
      })
    })
    afterEach(() => useSession.setState({ session: null, me: null }))

    it('shows the real board with the dashed „Ти (гост)“ row at its place and the sticky card', async () => {
      get.mockImplementation((p: string) =>
        Promise.resolve(
          p.startsWith('/api/leaderboard') ? guestBoardFixture : { left: 82, limit: 100 },
        ),
      )
      const { container } = show()
      expect(await screen.findByText('Ти (гост)')).toBeInTheDocument()
      expect(get).toHaveBeenCalledWith('/api/leaderboard?period=today&len=4&zero=false')
      const items = Array.from(container.querySelectorAll('ol > li'))
      expect(items.map((li) => li.textContent)).toEqual([
        expect.stringContaining('Ники'),
        expect.stringContaining('Ти (гост)'),
        expect.stringContaining('Дари'),
      ])
      expect(screen.getByTestId('phantom-row')).toHaveTextContent('790')
      expect(container.querySelector('.lbrow.you')).toBeNull()
      expect(screen.queryByText(/Ти си №/)).toBeNull()
      expect(screen.queryByRole('button', { name: /Предизвикай/ })).toBeNull()
      const card = screen.getByTestId('guest-place')
      expect(card).toHaveTextContent('Щеше да си №5 — направи си профил и мястото остава твое')
      expect(
        await screen.findByText('Остават 82 места за значка „Пионер“ + 100 XP'),
      ).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
      expect(await screen.findByLabelText('Парола')).toBeInTheDocument()
    })

    it('puts a podium place on top of the list and keeps the invitation without a phantom', async () => {
      const board = (phantom: unknown) => (p: string) =>
        Promise.resolve(
          p.startsWith('/api/leaderboard')
            ? { ...guestBoardFixture, phantom }
            : { left: 0, limit: 100 },
        )
      get.mockImplementation(board({ rank: 2, score: 990, attempts: 4 }))
      const first = show()
      await screen.findByText('Ти (гост)')
      expect(first.container.querySelector('ol > li')).toHaveTextContent('Ти (гост)')
      first.unmount()
      get.mockImplementation(board(null))
      show()
      expect(await screen.findByText(/Спечели игра с тези настройки/)).toBeInTheDocument()
      expect(screen.queryByText('Ти (гост)')).toBeNull()
      expect(screen.getByRole('button', { name: 'Направи си профил' })).toBeInTheDocument()
    })
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

  it('challenges an online player: confirm with the board settings, then the waiting screen', async () => {
    const rows = boardFixture.rows.map((r) =>
      r.username === 'Ники' ? { ...r, online: true, id: 'u-niki' } : r,
    )
    get.mockResolvedValue({ ...boardFixture, rows })
    const created = {
      code: 'ABCDE',
      url: 'https://x/d/ABCDE',
      roomId: 'r1',
      token: 't1',
      challengeId: 'c1',
      toUsername: 'Ники',
    }
    post.mockResolvedValue(created)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Предизвикай Ники на дуел' }))
    const dialog = screen.getByRole('dialog', { name: 'Предизвикай Ники' })
    expect(dialog).toHaveTextContent('4 цифри')
    expect(dialog).toHaveTextContent('без 0')
    // The classic duel is the default; the race is one tap away.
    expect(screen.getByRole('radio', { name: 'Класически' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Надпревара' }))
    fireEvent.click(screen.getByRole('button', { name: 'Изпрати' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/challenges', {
        to: 'u-niki',
        len: 4,
        zero: false,
        format: 'race',
      }),
    )
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem('bc.invite') ?? '{}')).toMatchObject({
      challengeId: 'c1',
      toUsername: 'Ники',
    })
  })

  it('keeps the confirm open with the reason when the player went offline', async () => {
    const rows = boardFixture.rows.map((r) =>
      r.username === 'Ники' ? { ...r, online: true, id: 'u-niki' } : r,
    )
    get.mockResolvedValue({ ...boardFixture, rows })
    post.mockRejectedValue(new ApiError('ERR_OFFLINE', 409))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Предизвикай Ники на дуел' }))
    fireEvent.click(screen.getByRole('button', { name: 'Изпрати' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Играчът вече не е на линия.')
    fireEvent.click(screen.getByRole('button', { name: 'Отказ' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
