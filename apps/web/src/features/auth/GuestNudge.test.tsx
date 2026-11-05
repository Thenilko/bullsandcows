import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { meFixture } from '../../test/fixtures'
import { renderRoute } from '../../test/renderRoute'

const get = vi.fn()
vi.mock('./client', () => ({
  api: { get: (p: string) => get(p), patch: vi.fn(), post: vi.fn() },
}))

const { GuestNudge, NUDGE_DISMISSED_KEY } = await import('./GuestNudge')

const guest = (played: number) => ({
  ...meFixture,
  xp: 420,
  profile: { ...meFixture.profile, isGuest: true },
  stats: { ...meFixture.stats, played },
})

function show(board?: { period: 'today' | 'week'; len: number; zero: boolean }) {
  return renderRoute(<GuestNudge board={board} />, { path: '/result/:id', at: '/result/g1' })
}

/** `/api/me` → the profile, the board → `phantom`, the pioneer count → `left`. */
function serve(me: unknown, phantom: unknown, left = 0) {
  get.mockImplementation((p: string) => {
    if (p.startsWith('/api/leaderboard')) return Promise.resolve({ rows: [], me: null, phantom })
    if (p === '/api/auth/pioneer') return Promise.resolve({ left, limit: 100 })
    return Promise.resolve(me)
  })
}

const TODAY = { period: 'today', len: 4, zero: false } as const

beforeEach(() => {
  get.mockReset()
  sessionStorage.clear()
})

describe('GuestNudge', () => {
  it('asks a guest with more than five games to keep their points', async () => {
    get.mockResolvedValue(guest(6))
    show()
    expect(await screen.findByText('Изигра 6 игри като гост')).toBeInTheDocument()
    expect(screen.getByText(/всичките си 420 точки/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Направи си профил' }))
    expect(screen.getByRole('form', { name: 'Направи си профил' })).toBeInTheDocument()
  })

  it('stays away from new guests and registered players', async () => {
    get.mockResolvedValueOnce(guest(5))
    const first = show()
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole('complementary')).toBeNull()
    first.unmount()
    get.mockResolvedValue({ ...meFixture, stats: { ...meFixture.stats, played: 40 } })
    show()
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('hides for the rest of the session after „По-късно“', async () => {
    get.mockResolvedValue(guest(9))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'По-късно' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(sessionStorage.getItem(NUDGE_DISMISSED_KEY)).toBe('1')
  })

  it('tells any guest who just won where they would be today, even with few games', async () => {
    serve(guest(2), { rank: 7, score: 810, attempts: 5 }, 64)
    show(TODAY)
    expect(await screen.findByText('Днес щеше да си №7 в класацията')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/leaderboard?period=today&len=4&zero=false')
    expect(screen.queryByText(/Изигра/)).toBeNull()
    expect(screen.getByText(/мястото остава твое/)).toBeInTheDocument()
    expect(
      await screen.findByText('Остават 64 места за значка „Пионер“ + 100 XP'),
    ).toBeInTheDocument()
  })

  it('names the week for a free game and joins the regular nudge', async () => {
    serve(guest(8), { rank: 3, score: 990, attempts: 4 })
    show({ period: 'week', len: 5, zero: true })
    expect(await screen.findByText('Тази седмица щеше да си №3 в класацията')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/leaderboard?period=week&len=5&zero=true')
    expect(screen.getByText('Изигра 8 игри като гост')).toBeInTheDocument()
    expect(screen.queryByTestId('pioneer-line')).toBeNull()
  })

  it('stays away without a phantom place for a new guest, and keeps „По-късно“ for the session', async () => {
    serve(guest(2), null)
    const first = show(TODAY)
    await vi.waitFor(() =>
      expect(get).toHaveBeenCalledWith('/api/leaderboard?period=today&len=4&zero=false'),
    )
    expect(screen.queryByRole('complementary')).toBeNull()
    first.unmount()
    serve(guest(2), { rank: 1, score: 1200, attempts: 3 })
    show(TODAY)
    fireEvent.click(await screen.findByRole('button', { name: 'По-късно' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(sessionStorage.getItem(NUDGE_DISMISSED_KEY)).toBe('1')
  })

  it('never asks the board for a member', async () => {
    serve(
      { ...meFixture, stats: { ...meFixture.stats, played: 40 } },
      { rank: 1, score: 1, attempts: 1 },
    )
    show(TODAY)
    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining('/api/leaderboard'))
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
