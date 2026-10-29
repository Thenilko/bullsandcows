import type { AdminOverviewDto } from '@bc/protocol'
import { screen, within } from '@testing-library/react'
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

function answer(me: unknown, admin: () => unknown = () => overview) {
  get.mockImplementation(async (path: string) => (path === '/api/admin/overview' ? admin() : me))
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

  it('does not ask for the numbers without the admin role', async () => {
    answer(meFixture)
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Тази страница е само за администратора.')
    expect(get).not.toHaveBeenCalledWith('/api/admin/overview')
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
