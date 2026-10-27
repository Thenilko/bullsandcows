import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { weeklyAwardFixture, weeklyFixture } from '../dev/weeklyFixtures'
import { useSession } from '../features/auth/session'
import { meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import { IMMERSIVE, mockViewport, resetViewport } from '../test/viewport'

const get = vi.fn()
const post = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: {
    get: (p: string) => get(p),
    post: (p: string, b?: unknown) => post(p, b),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

const { Weekly } = await import('./Weekly')
const { NewGame } = await import('./NewGame')

let week = weeklyFixture

beforeEach(() => {
  week = weeklyFixture
  get.mockReset()
  post.mockReset()
  useSession.setState({
    session: {
      accessToken: 't',
      refreshToken: '',
      expiresAt: 0,
      user: { id: 'mira', isGuest: false },
    },
    me: { ...meFixture, profile: { ...meFixture.profile, username: 'Мира' } },
  })
  get.mockImplementation(async (p: string) => {
    if (p === '/api/weekly') return week
    if (p === '/api/me') return meFixture
    if (p === '/api/farms/me/nudge') return { nudge: null }
    throw new Error(`unexpected ${p}`)
  })
})

afterEach(() => resetViewport())

describe('Weekly (Р7)', () => {
  it('shows the plank, the rule chips, the time left, your result and the leaders', async () => {
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    expect(await screen.findByRole('heading', { name: 'Пет с нула' })).toBeInTheDocument()
    expect(screen.getByText('Седмица 43 · 19–25 окт')).toBeInTheDocument()
    const chips = screen.getByRole('list', { name: 'Седмично предизвикателство' })
    expect(
      within(chips)
        .getAllByRole('listitem')
        .map((c) => c.textContent),
    ).toEqual(['5 цифри', 'може и 0', 'до 8 опита', 'едно число за всички'])
    expect(screen.getAllByText('6 оп.')).toHaveLength(2)
    const leaders = screen.getByRole('region', { name: 'Водачи тази седмица' })
    expect(within(leaders).getAllByRole('listitem')).toHaveLength(4)
    expect(within(leaders).getByText('Мира (ти)')).toBeInTheDocument()
    expect(leaders.querySelectorAll('.rav.gold')).toHaveLength(1)
  })

  it('starts the game once a day and then waits with „Утре пак“', async () => {
    post.mockResolvedValue({
      id: 'g1',
      kind: 'weekly',
      len: 5,
      zero: true,
      practice: false,
      total: 30240,
      startedAt: null,
      finishedAt: null,
      won: null,
      score: null,
      attempts: 0,
      guesses: [],
    })
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    fireEvent.click(await screen.findByRole('button', { name: 'Играй предизвикателството' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/weekly/start', undefined))
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })

  it('disables the CTA after today’s game', async () => {
    week = { ...weeklyFixture, playedToday: true, today: { gameId: 'g1', finished: true } }
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    expect(await screen.findByRole('button', { name: 'Утре пак' })).toBeDisabled()
  })

  it('offers to continue an unfinished game of today', async () => {
    week = { ...weeklyFixture, today: { gameId: 'g1', finished: false } }
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    expect(
      await screen.findByRole('button', { name: 'Продължи предизвикателството' }),
    ).toBeEnabled()
  })

  it('shows the end of the last week once (П8) and marks it seen', async () => {
    week = {
      ...weeklyFixture,
      week: 44,
      rule: { key: 'threeNoZero', len: 3, zero: false, maxAttempts: 6, timeLimitSecs: null },
      award: weeklyAwardFixture,
    }
    post.mockResolvedValue({ done: true })
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    const modal = await screen.findByTestId('weekly-award')
    expect(modal).toHaveTextContent('Седмица 43 приключи')
    expect(modal).toHaveTextContent('Място 12 от 340')
    expect(modal).toHaveTextContent('по-добре от 96% от играчите')
    expect(modal).toHaveTextContent('+300')
    expect(modal).toHaveTextContent('2 места до златната рамка за топ 10.')
    fireEvent.click(within(modal).getByRole('button', { name: 'Към седмица 44 · Три без нула' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/weekly/award/seen', undefined))
    await waitFor(() => expect(screen.queryByTestId('weekly-award')).toBeNull())
  })

  it('sits in the framed right panel on desktop (ПД9)', async () => {
    mockViewport(...IMMERSIVE)
    renderRoute(<Weekly />, { path: '/weekly', at: '/weekly' })
    await screen.findByRole('heading', { name: 'Пет с нула' })
    expect(document.querySelector('.dk-imm.sc-weekly .dk-col .wk-plank')).not.toBeNull()
  })
})

describe('NewGame with the weekly card (П6)', () => {
  it('puts the card on top and plays from it', async () => {
    post.mockResolvedValue({ id: 'g1' })
    renderRoute(<NewGame />, { path: '/new', at: '/new' })
    const card = await screen.findByTestId('weekly-card')
    expect(card).toHaveTextContent('Седмица 43')
    expect(card).toHaveTextContent('Пет с нула')
    expect(card).toHaveTextContent('5 цифри · може и 0 · до 8 опита · 300 XP')
    expect(card).toHaveTextContent('Ти: 6 оп. · място 12')
    fireEvent.click(within(card).getByRole('button', { name: 'Играй' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/weekly/start', undefined))
  })

  it('has no card for guests', async () => {
    useSession.setState({
      session: {
        accessToken: 't',
        refreshToken: '',
        expiresAt: 0,
        user: { id: 'g', isGuest: true },
      },
      me: { ...meFixture, profile: { ...meFixture.profile, isGuest: true } },
    })
    renderRoute(<NewGame />, { path: '/new', at: '/new' })
    await screen.findByRole('heading', { name: 'Нова игра' })
    expect(screen.queryByTestId('weekly-card')).toBeNull()
    expect(get).not.toHaveBeenCalledWith('/api/weekly')
  })
})
