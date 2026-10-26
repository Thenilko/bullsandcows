import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nudgeFixture } from '../dev/farmFixtures'
import { useSession } from '../features/auth/session'
import { meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import { IMMERSIVE, mockViewport, resetViewport } from '../test/viewport'

const get = vi.fn()
const post = vi.fn()
const patch = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: {
    get: (p: string) => get(p),
    post: (p: string, b?: unknown) => post(p, b),
    patch: (p: string, b: unknown) => patch(p, b),
    del: vi.fn(),
  },
}))

const { Today } = await import('./Today')
const { NewGame } = await import('./NewGame')

beforeEach(() => {
  for (const m of [get, post, patch]) m.mockReset()
  useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'mira', isGuest: false } }, me: meFixture })
  get.mockImplementation(async (p: string) => {
    if (p === '/api/farms/me/nudge') return { nudge: nudgeFixture }
    if (p === '/api/me') return meFixture
    throw new Error(`unexpected ${p}`)
  })
})

afterEach(() => resetViewport())

describe('Today (П4)', () => {
  it('shows the nudge banner and hides it for good with ×', async () => {
    post.mockResolvedValue({ done: true })
    renderRoute(<Today />, { path: '/today', at: '/today' })
    const banner = await screen.findByTestId('nudge')
    expect(banner).toHaveTextContent('Тати те подсеща')
    expect(banner).toHaveTextContent('3 от 5 във фермата вече играха')
    fireEvent.click(screen.getByRole('button', { name: 'Скрий' }))
    await waitFor(() => expect(screen.queryByTestId('nudge')).toBeNull())
    expect(post).toHaveBeenCalledWith('/api/farms/me/nudge/read', undefined)
  })

  it('starts today’s number with „Играй сега“', async () => {
    post.mockResolvedValue({ id: 'g1' })
    renderRoute(<Today />, { path: '/today', at: '/today' })
    fireEvent.click(await screen.findByRole('button', { name: 'Играй сега' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/games', { len: 4, zero: false, kind: 'daily' }))
    expect(await screen.findByText('elsewhere')).toBeInTheDocument()
  })

  it('keeps the reminder time in the profile only', async () => {
    patch.mockResolvedValue({ ...meFixture, profile: { ...meFixture.profile, reminderTime: '20:30' } })
    renderRoute(<Today />, { path: '/today', at: '/today' })
    fireEvent.change(await screen.findByLabelText('Час за напомнянето'), { target: { value: '20:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Включи напомнянето' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { reminderTime: '20:30' }))
  })

  it('hangs on the board on desktop (ПД8)', async () => {
    mockViewport(...IMMERSIVE)
    renderRoute(<Today />, { path: '/today', at: '/today' })
    await screen.findByTestId('nudge')
    expect(document.querySelector('.dk.sc-today .dk-game.dk-today [data-testid="nudge"]')).not.toBeNull()
    expect(document.querySelectorAll('.dk-rope')).toHaveLength(2)
  })
})

describe('NewGame with a nudge', () => {
  it('puts the banner at the top of „Игра“', async () => {
    renderRoute(<NewGame />, { path: '/new', at: '/new' })
    const banner = await screen.findByTestId('nudge')
    const section = screen.getByRole('region', { name: 'Нова игра' })
    expect(section.firstElementChild).toBe(banner)
  })
})
