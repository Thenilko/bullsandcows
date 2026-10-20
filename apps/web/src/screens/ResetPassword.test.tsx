import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const completeRecovery = vi.fn()
vi.mock('../features/auth/recovery', async (orig) => ({
  ...(await orig<typeof import('../features/auth/recovery')>()),
  completeRecovery: (...a: unknown[]) => completeRecovery(...a),
}))

const { ResetPassword } = await import('./ResetPassword')
const { useSession } = await import('../features/auth/session')
const { RecoveryError } = await import('../features/auth/recovery')

const AUTH = {
  session: { accessToken: 'acc', refreshToken: 'ref', expiresAt: 1, user: { id: 'u1', isGuest: false } },
  me: { profile: { username: 'pastir' } },
}

function show() {
  return renderWithI18n(
    <MemoryRouter initialEntries={['/reset']}>
      <Routes>
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fill(a: string, b: string) {
  fireEvent.change(screen.getByLabelText('Нова парола'), { target: { value: a } })
  fireEvent.change(screen.getByLabelText('Повтори паролата'), { target: { value: b } })
  fireEvent.click(screen.getByRole('button', { name: 'Запази паролата' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_AUTH_MODE', 'supabase')
  useSession.setState({ session: null, me: null, recoverySession: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

describe('ResetPassword', () => {
  it('rejects a short password and a mismatch without calling supabase', () => {
    show()
    fill('abc', 'abc')
    expect(screen.getByRole('status')).toHaveTextContent('Паролата трябва да е поне 6 символа')
    fill('secret1', 'secret2')
    expect(screen.getByRole('status')).toHaveTextContent('Паролите не съвпадат')
    expect(completeRecovery).not.toHaveBeenCalled()
  })

  it('saves the password, signs in and goes home', async () => {
    completeRecovery.mockResolvedValue(AUTH)
    show()
    fill('secret1', 'secret1')
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(completeRecovery).toHaveBeenCalledWith('secret1')
  })

  it('shows the translated error when the update fails', async () => {
    completeRecovery.mockRejectedValue(new RecoveryError('reset.error.same'))
    show()
    fill('secret1', 'secret1')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Новата парола трябва да е различна от старата'))
  })

  it('asks for the link from the mail when there is no recovery session', () => {
    useSession.setState({ recoverySession: false })
    show()
    expect(screen.queryByLabelText('Нова парола')).toBeNull()
    expect(screen.getByText(/Отвори линка от писмото/)).toBeInTheDocument()
  })

  it('explains that reset is unavailable in fake mode', () => {
    vi.stubEnv('VITE_AUTH_MODE', 'fake')
    show()
    expect(screen.getByText(/не е налична в тестовата среда/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Нова парола')).toBeNull()
  })

  it('shows the expired message at once for a link that carries an error', () => {
    useSession.setState({ recoverySession: false })
    window.history.replaceState(null, '', '/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')
    show()
    expect(screen.getByRole('alert')).toHaveTextContent('Линкът е изтекъл')
    expect(screen.getByRole('link', { name: 'Към входа' })).toHaveAttribute('href', '/login')
  })

  it('gives up after 8 s without the recovery event', () => {
    vi.useFakeTimers()
    useSession.setState({ recoverySession: false })
    window.history.replaceState(null, '', '/reset#access_token=x&type=recovery')
    show()
    expect(screen.getByText('Проверяваме линка…')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(7_999))
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => void vi.advanceTimersByTime(1))
    expect(screen.getByRole('alert')).toHaveTextContent('Линкът е изтекъл')
  })

  it('shows the form when the recovery event arrives before the timeout', () => {
    vi.useFakeTimers()
    useSession.setState({ recoverySession: false })
    show()
    act(() => useSession.getState().setRecoverySession(true))
    act(() => void vi.advanceTimersByTime(10_000))
    expect(screen.getByLabelText('Нова парола')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
