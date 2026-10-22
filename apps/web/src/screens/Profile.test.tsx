import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../features/auth/session'
import { sfx } from '../lib/sound'
import { meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'

const get = vi.fn()
const patch = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: (p: string, b: unknown) => patch(p, b), post: vi.fn() },
}))

const { Profile } = await import('./Profile')

function show() {
  return renderRoute(<Profile />, { path: '/profile', at: '/profile' })
}

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  get.mockResolvedValue(meFixture)
  vi.restoreAllMocks()
  useSession.setState({
    session: {
      accessToken: 't',
      refreshToken: '',
      expiresAt: 0,
      user: { id: 'u1', isGuest: false },
    },
  })
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

describe('Profile', () => {
  it('uses long stat labels and badge descriptions on desktop', async () => {
    desktopViewport()
    show()
    expect(await screen.findByText('изиграни игри')).toBeInTheDocument()
    expect(screen.getByText('Победа без нито един нелогичен опит')).toBeInTheDocument()
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('shows level, title, xp, stats and badges', async () => {
    const { container } = show()
    expect(await screen.findByText('Говедар · ниво 2')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Бик, Говедар' })).toBeInTheDocument()
    expect(screen.getByText('150 / 750 т. до ниво 3')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(screen.getByText('рейтинг 1240')).toBeInTheDocument()
    expect(container.querySelectorAll('.badge')).toHaveLength(29)
    expect(container.querySelectorAll('.badge.locked')).toHaveLength(28)
  })

  it('turns the sound off through PATCH and mutes the player', async () => {
    const mute = vi.spyOn(sfx, 'setMuted')
    patch.mockResolvedValue({ ...meFixture, profile: { ...meFixture.profile, sound: false } })
    show()
    fireEvent.click(await screen.findByRole('switch', { name: 'Звуци' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { sound: false }))
    expect(mute).toHaveBeenCalledWith(true)
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Звуци' })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    )
  })

  it('rolls the toggle back when saving fails', async () => {
    patch.mockRejectedValue(new Error('boom'))
    show()
    const sw = await screen.findByRole('switch', { name: 'Вибрация' })
    fireEvent.click(sw)
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { vibrate: false }))
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Вибрация' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    )
  })

  it('saves the default digits', async () => {
    patch.mockResolvedValue({ ...meFixture, profile: { ...meFixture.profile, defaultLen: 5 } })
    show()
    await screen.findByText('Говедар · ниво 2')
    fireEvent.click(screen.getByRole('radio', { name: '5 цифри' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { defaultLen: 5 }))
  })

  it('sends the language change', async () => {
    patch.mockResolvedValue(meFixture)
    show()
    await screen.findByText('Говедар · ниво 2')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { lang: 'en' }))
  })

  it('offers guests a way to create a profile', async () => {
    get.mockResolvedValue({ ...meFixture, profile: { ...meFixture.profile, isGuest: true } })
    show()
    expect(await screen.findByRole('button', { name: 'Направи си профил' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Бик, Теленце' })).toBeInTheDocument()
  })

  it('lets me pick the cow as my avatar and redraws the header with it', async () => {
    patch.mockResolvedValue({ ...meFixture, profile: { ...meFixture.profile, avatarSpecies: 'cow' } })
    show()
    expect(await screen.findByRole('img', { name: 'Бик, Говедар' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Крава' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/api/me/settings', { avatarSpecies: 'cow' }))
    expect(await screen.findByRole('img', { name: 'Крава, Говедар' })).toBeInTheDocument()
  })
})
