import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LANG_STORAGE_KEY } from '../i18n/detectLang'
import i18n from '../i18n'
import { renderWithI18n } from '../test/render'

const auth = {
  me: null,
  isGuest: false,
  isAuthenticated: false,
  status: 'idle' as 'idle' | 'loading',
  error: null as string | null,
  offline: false,
  login: vi.fn(async () => undefined),
  register: vi.fn(async () => undefined),
  guest: vi.fn(async () => undefined),
  upgrade: vi.fn(async () => undefined),
  reset: vi.fn(async () => true),
  logout: vi.fn(),
}
vi.mock('../features/auth/useAuth', () => ({ useAuth: () => auth }))

const { Login } = await import('./Login')

function show() {
  return renderWithI18n(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.error = null
  auth.status = 'idle'
})

describe('Login', () => {
  it('shows the translated validation error and does not call the API for a short name', () => {
    show()
    fireEvent.change(screen.getByLabelText('Име в играта'), { target: { value: 'M' } })
    fireEvent.change(screen.getByLabelText('Парола'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез' }))
    expect(screen.getByRole('status')).toHaveTextContent('Въведи име (поне 2 символа)')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('rejects a short password on register without calling the API', () => {
    show()
    fireEvent.click(screen.getByRole('radio', { name: 'Нов профил' }))
    fireEvent.change(screen.getByLabelText('Име в играта'), { target: { value: 'Mira' } })
    fireEvent.change(screen.getByLabelText('Имейл'), { target: { value: 'm@x.bg' } })
    fireEvent.change(screen.getByLabelText('Парола'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Създай профил' }))
    expect(screen.getByRole('status')).toHaveTextContent('Паролата трябва да е поне 6 символа')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('calls login with valid credentials', async () => {
    show()
    fireEvent.change(screen.getByLabelText('Име в играта'), { target: { value: 'Mira' } })
    fireEvent.change(screen.getByLabelText('Парола'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Влез' }))
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('Mira', 'secret1'))
  })

  it('calls register with name, email and password', async () => {
    show()
    fireEvent.click(screen.getByRole('radio', { name: 'Нов профил' }))
    fireEvent.change(screen.getByLabelText('Име в играта'), { target: { value: 'Mira' } })
    fireEvent.change(screen.getByLabelText('Имейл'), { target: { value: 'm@x.bg' } })
    fireEvent.change(screen.getByLabelText('Парола'), { target: { value: 'secret1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Създай профил' }))
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('Mira', 'm@x.bg', 'secret1'))
  })

  it('plays as a guest', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Играй като гост' }))
    await waitFor(() => expect(auth.guest).toHaveBeenCalledOnce())
  })

  it('translates a server error code', () => {
    auth.error = 'ERR_CREDENTIALS'
    show()
    expect(screen.getByRole('status')).toHaveTextContent('Грешно име или парола.')
  })

  it('LangSwitch changes the language and stores it', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en')
  })
})
