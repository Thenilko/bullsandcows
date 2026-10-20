import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../../features/auth/session'
import { renderWithI18n } from '../../test/render'

const createBot = vi.fn()
const createInvite = vi.fn()
vi.mock('../../features/duel/api', async (orig) => ({
  ...(await orig<typeof import('../../features/duel/api')>()),
  duelApi: { createBot: (...a: unknown[]) => createBot(...a), createInvite: (...a: unknown[]) => createInvite(...a) },
}))

const { DuelSetup } = await import('./DuelSetup')

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}

function show(path: string, mode: 'duel' | 'bot') {
  return renderWithI18n(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split('?')[0]} element={<DuelSetup mode={mode} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

function signIn(isGuest: boolean) {
  useSession.setState({ session: { accessToken: 'jwt', refreshToken: 'r', expiresAt: 9e12, user: { id: 'u', isGuest } }, me: null } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn(false)
})

describe('DuelSetup', () => {
  it('bot mode posts the chosen level and goes to the room with its token', async () => {
    createBot.mockResolvedValue({ roomId: 'r1', token: 't1' })
    show('/bot/new', 'bot')
    fireEvent.click(screen.getByRole('button', { name: 'Трудно' }))
    expect(screen.getByText(/Мисли като стар пастир/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Срещу Плашилото' }))
    await waitFor(() => expect(createBot).toHaveBeenCalledWith({ len: 4, zero: false, format: 'race', level: 3 }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/duel/r1?token=t1')
  })

  it('disables quick match for guests and explains why', () => {
    signIn(true)
    show('/duel/new', 'duel')
    const quick = screen.getByRole('radio', { name: /Бърз мач/ })
    expect(quick).toBeDisabled()
    expect(screen.getByText('Това е за регистрирани пастири — направи си профил')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Покани приятел/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('quick match goes to the queue with the settings in the URL', () => {
    show('/duel/new', 'duel')
    fireEvent.click(screen.getByRole('radio', { name: /Класически/ }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Търси противник' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/queue?len=5&zero=0&format=classic')
  })

  it('friend invite creates the invite and opens the waiting screen', async () => {
    createInvite.mockResolvedValue({ code: 'AB2CD', url: 'https://x/d/AB2CD', roomId: 'r2', token: 't2' })
    show('/duel/new', 'duel')
    fireEvent.click(screen.getByRole('radio', { name: /Покани приятел/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Създай покана' }))
    await waitFor(() => expect(createInvite).toHaveBeenCalledWith({ len: 4, zero: false, format: 'race' }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/duel/invite/AB2CD')
  })

  it('shows a translated error when the request fails', async () => {
    const { ApiError } = await import('../../lib/api')
    createBot.mockRejectedValue(new ApiError('ERR_RATE_LIMIT', 429))
    show('/bot/new', 'bot')
    fireEvent.click(screen.getByRole('button', { name: 'Срещу Плашилото' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Много бързаш')
  })

  it('the solo tab goes back to the solo setup', () => {
    show('/duel/new', 'duel')
    fireEvent.click(screen.getByRole('button', { name: /^Соло/ }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/new$/)
  })

  it('the duel tab from the bot setup opens the duel setup', () => {
    show('/bot/new', 'bot')
    fireEvent.click(screen.getByRole('button', { name: /^Дуел/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/duel/new')
  })
})
