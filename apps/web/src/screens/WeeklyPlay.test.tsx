import type { GameViewDto } from '@bc/protocol'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { weeklyFixture } from '../dev/weeklyFixtures'
import { useSession } from '../features/auth/session'
import { meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import { IMMERSIVE, mockViewport, resetViewport } from '../test/viewport'

const get = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const { WeeklyPlay } = await import('./WeeklyPlay')

const game = (over: Partial<GameViewDto> = {}): GameViewDto => ({
  id: 'g1',
  kind: 'weekly',
  len: 5,
  zero: true,
  practice: false,
  total: 30240,
  startedAt: Date.now() - 60_000,
  finishedAt: null,
  won: null,
  score: null,
  attempts: 3,
  guesses: [
    { guess: '01234', bulls: 1, cows: 1, consistent: true, left: 900 },
    { guess: '56789', bulls: 0, cows: 2, consistent: true, left: 200 },
    { guess: '05371', bulls: 1, cows: 2, consistent: true, left: 20 },
  ],
  weekly: { weekId: '2026-W43', week: 43, rule: weeklyFixture.rule, endsAt: weeklyFixture.endsAt },
  ...over,
})

let current = game()

beforeEach(() => {
  current = game()
  get.mockReset()
  useSession.setState({
    session: {
      accessToken: 't',
      refreshToken: '',
      expiresAt: 0,
      user: { id: 'mira', isGuest: false },
    },
    me: meFixture,
  })
  get.mockImplementation(async (p: string) => {
    if (p === '/api/weekly') return { ...weeklyFixture, today: { gameId: 'g1', finished: false } }
    if (p === '/api/games/g1') return current
    if (p.startsWith('/api/stats/distribution')) return { histogram: [], sample: 0, fallback: true }
    throw new Error(`unexpected ${p}`)
  })
})

afterEach(() => resetViewport())

describe('WeeklyPlay (П7)', () => {
  it('titles the game with the week and the rule and shows the tries as dots', async () => {
    renderRoute(<WeeklyPlay />, { path: '/weekly/play', at: '/weekly/play' })
    expect(await screen.findByText('Седмица 43 · Пет с нула')).toBeInTheDocument()
    expect(screen.getByText('Опит 4 от 8')).toBeInTheDocument()
    const dots = screen.getByRole('img', { name: 'Опити: 3 от 8' })
    expect(dots.querySelectorAll('i.used')).toHaveLength(3)
    expect(dots.querySelectorAll('i.cur')).toHaveLength(1)
    expect(
      screen.getByText('Тук 0 може да е и първа цифра. След 8 опита играта приключва.'),
    ).toBeInTheDocument()
  })

  it('goes back to the week once the server reports the game over', async () => {
    current = game({ finishedAt: Date.now(), won: false, secret: '01937' })
    renderRoute(<WeeklyPlay />, { path: '/weekly/play', at: '/weekly/play' })
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })

  it('hangs on the board with ropes on desktop (ПД11)', async () => {
    mockViewport(...IMMERSIVE)
    renderRoute(<WeeklyPlay />, { path: '/weekly/play', at: '/weekly/play' })
    await screen.findByText('Опит 4 от 8')
    await waitFor(() =>
      expect(document.querySelector('.dk-imm .dk-game.dk-weekly .wk-dots')).not.toBeNull(),
    )
    expect(document.querySelectorAll('.dk-rope')).toHaveLength(2)
  })
})
