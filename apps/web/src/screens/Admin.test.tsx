import type { AdminGameDetailDto, AdminGameDto, AdminGamesDto, AdminOverviewDto } from '@bc/protocol'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../features/auth/session'
import { ApiError } from '../lib/api'
import { meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import { niceMax } from './admin/AdminChart'

const get = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { Admin } = await import('./Admin')

const days = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  newUsers: i === 29 ? 3 : 0,
  activeUsers: i === 29 ? 4 : 1,
  games: i === 29 ? 12 : 2,
}))

const overview: AdminOverviewDto = {
  generatedAt: Date.parse('2026-10-30T09:15:00Z'),
  users: { total: 1234, members: 200, guests: 1034, new7d: 17, new30d: 60, active1d: 42, active7d: 300, active30d: 700 },
  days,
  games: { total: 5000, finished: 4200, won: 3900 },
  kinds: [
    { kind: 'daily', total: 3000, finished: 2900, won: 2800, winRate: 97, avgAttempts: 5.4 },
    { kind: 'bot', total: 10, finished: 0, won: 0, winRate: 0, avgAttempts: null },
  ],
  social: {
    duels: 80,
    duels7d: 9,
    duelsByOpponent: { quick: 50, friend: 20, bot: 10 },
    farms: 6,
    farmMembers: 21,
    shares: 33,
    nudges: 14,
    weeklyPlayers7d: 25,
  },
  recentUsers: [
    { id: 'u1', username: 'Danail', email: 'd@x.bg', isGuest: false, level: 38, games: 400, createdAt: Date.parse('2026-10-01T10:00:00Z'), lastGameAt: Date.parse('2026-10-30T08:00:00Z') },
    { id: 'g1', username: 'guest-ab12', email: null, isGuest: true, level: 1, games: 0, createdAt: Date.parse('2026-10-29T10:00:00Z'), lastGameAt: null },
  ],
}

const AT = Date.parse('2026-10-30T08:00:00Z')
const baseGame: AdminGameDto = {
  id: 'g-solo',
  kind: 'daily',
  len: 4,
  zero: false,
  practice: false,
  secret: '5678',
  attempts: 2,
  won: true,
  score: 900,
  suspicious: false,
  usedNotes: false,
  createdAt: AT,
  finishedAt: AT + 60_000,
  player: { id: 'u1', username: 'Danail' },
  duel: null,
}
const duelGame: AdminGameDto = {
  ...baseGame,
  id: 'g-duel',
  kind: 'duel_classic',
  secret: '9012',
  attempts: 7,
  won: false,
  player: { id: 'u2', username: 'Mira' },
  duel: {
    id: 'd1',
    format: 'classic',
    opponentKind: 'friend',
    botLevel: null,
    outcome: 'solved',
    isRematch: false,
    opponent: { id: 'u1', username: 'Danail' },
    opponentGameId: 'g-other',
  },
}
const gamesPage: AdminGamesDto = { games: [duelGame, baseGame], nextOffset: null }
const soloDetail: AdminGameDetailDto = {
  side: {
    game: baseGame,
    guesses: [
      { guess: '1234', bulls: 0, cows: 0, consistent: true, at: AT },
      { guess: '5678', bulls: 4, cows: 0, consistent: true, at: AT + 1 },
    ],
  },
  opponent: null,
}

function answer(me: unknown, admin: () => unknown = () => overview) {
  get.mockImplementation(async (path: string) => {
    if (path === '/api/admin/overview') return admin()
    if (path.startsWith('/api/admin/games?')) return path.includes('user=u2') ? { games: [duelGame], nextOffset: null } : gamesPage
    if (path === '/api/admin/games/g-solo') return soloDetail
    return me
  })
}

const show = () => renderRoute(<Admin />, { path: '/admin', at: '/admin' })

beforeEach(() => {
  get.mockReset()
  useSession.setState({
    session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'u1', isGuest: false } },
  })
})

describe('Admin', () => {
  it('shows the headline numbers, modes, social counts and the recent players', async () => {
    answer({ ...meFixture, isAdmin: true })
    show()
    expect(await screen.findByRole('heading', { level: 1, name: 'Админ панел' })).toBeInTheDocument()
    expect(await screen.findByText('1234')).toBeInTheDocument()
    expect(screen.getByText('200 с профил · 1034 гости')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Игри, активни играчи/ })).toBeInTheDocument()
    const modes = within(screen.getByRole('region', { name: 'Игри' }))
    expect(modes.getByRole('row', { name: /Число на деня 3000 97% 5,4|Число на деня 3000 97% 5.4/ })).toBeInTheDocument()
    expect(modes.getByRole('row', { name: /Срещу бот 10 — —/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Заедно' })).getByText('9 за 7 дни · 50 бързи, 20 с приятел, 10 с бот')).toBeInTheDocument()
    const people = within(screen.getByRole('region', { name: 'Последно активни' }))
    expect(people.getByRole('rowheader', { name: 'Danail' })).toBeInTheDocument()
    expect(people.getByRole('rowheader', { name: /guest-ab12\s*гост/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/admin/overview')
  })

  it('lists every game with who played whom, opens the guesses and filters by player', async () => {
    answer({ ...meFixture, isAdmin: true })
    show()
    const feed = within(await screen.findByRole('region', { name: 'Всички игри' }))
    expect(await feed.findByRole('row', { name: /Mira Дуел · класически Danail 9012 7 Не позна · позна/ })).toBeInTheDocument()
    const solo = feed.getByRole('row', { name: /Danail Число на деня — 5678 2 Позна/ })
    fireEvent.click(within(solo).getByRole('button', { name: 'Ходове' }))
    expect(await feed.findByText('4 бика 0 крави')).toBeInTheDocument()
    expect(feed.getByText('0 бика 0 крави')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/admin/games/g-solo')

    fireEvent.click(feed.getByRole('button', { name: 'Mira' }))
    expect(await feed.findByText('Само игрите на Mira')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/admin/games?offset=0&user=u2')
    await vi.waitFor(() => expect(feed.queryByRole('button', { name: 'Danail' })).toBeNull())
  })

  it('does not ask for the numbers without the admin role', async () => {
    answer(meFixture)
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Тази страница е само за администратора.')
    expect(get).not.toHaveBeenCalledWith('/api/admin/overview')
    expect(get).not.toHaveBeenCalledWith('/api/admin/games?offset=0')
  })

  it('says so when the server refuses (403)', async () => {
    answer({ ...meFixture, isAdmin: true }, () => {
      throw new ApiError('ERR_FORBIDDEN', 403)
    })
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Тази страница е само за администратора.')
  })
})

describe('niceMax', () => {
  it('rounds the chart axis up to 1, 2 or 5 × 10ᵏ', () => {
    expect([0, 1, 3, 7, 12, 48, 51, 999].map(niceMax)).toEqual([1, 1, 5, 10, 20, 50, 100, 1000])
  })
})
