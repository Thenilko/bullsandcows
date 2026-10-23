import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../features/auth/session'
import { sfx } from '../lib/sound'
import { badgesFixture, meFixture } from '../test/fixtures'
import { renderRoute } from '../test/renderRoute'
import { resetViewport } from '../test/viewport'

const get = vi.fn()
const patch = vi.fn()
vi.mock('../features/auth/client', () => ({
  api: { get: (p: string) => get(p), patch: (p: string, b: unknown) => patch(p, b), post: vi.fn() },
}))

const { Profile } = await import('./Profile')

function show(at = '/profile') {
  return renderRoute(<Profile />, { path: '/profile', at })
}

/** `/api/me` and `/api/me/badges`; `me` overrides the profile. */
function answer(me: unknown = meFixture, badges: unknown = badgesFixture) {
  get.mockImplementation(async (path: string) => (path === '/api/me/badges' ? badges : me))
}

afterEach(() => {
  resetViewport()
})

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  answer()
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
  it('uses long stat labels and shows the badge collection in the right column on desktop', async () => {
    desktopViewport()
    const { container } = show()
    expect(await screen.findByText('изиграни игри')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Значки' })).toBeInTheDocument()
    expect(container.querySelectorAll('.bdg')).toHaveLength(29)
    fireEvent.click(await screen.findByRole('button', { name: 'Без излишен ход: сребро' }))
    expect(screen.getByRole('dialog', { name: 'Значка' })).toHaveTextContent('Победа без нито един нелогичен опит')
  })

  it('shows level, title, xp and stats', async () => {
    show()
    expect(await screen.findByText('Говедар · ниво 2')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Бик, Говедар' })).toBeInTheDocument()
    expect(screen.getByText('150 / 750 т. до ниво 3')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(screen.getByText('рейтинг 1240')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Профил' })).toHaveAttribute('aria-checked', 'true')
  })

  it('opens the badges tab from the URL with the 29 tiles and their tiers', async () => {
    const { container } = show('/profile?tab=badges')
    expect(await screen.findByText('16 значки · 19 степени · 13 предстоят')).toBeInTheDocument()
    expect(screen.getByText('Колекция')).toBeInTheDocument()
    expect(container.querySelectorAll('.bdg')).toHaveLength(29)
    expect(container.querySelectorAll('.bdg.locked')).toHaveLength(13)
    expect(screen.getAllByRole('button', { name: '???: не е спечелена' })).toHaveLength(3)
    expect(screen.queryByText('Говедар · ниво 2')).toBeNull()
  })

  it('switches to the badges tab and opens a detail from a tile', async () => {
    show()
    fireEvent.click(await screen.findByRole('radio', { name: 'Значки' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Шерлок: мед' }))
    const dialog = screen.getByRole('dialog', { name: 'Значка' })
    expect(dialog).toHaveTextContent('3 от 5 до следващата степен')
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }))
    expect(screen.queryByRole('dialog')).toBeNull()
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
    answer({ ...meFixture, profile: { ...meFixture.profile, isGuest: true } })
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
