import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RETURN_TO_KEY } from '../../app/RequireAuth'
import { useSession } from './session'
import { useAuth } from './useAuth'

const AUTH = {
  session: {
    accessToken: 'tok',
    refreshToken: 'r',
    expiresAt: 1,
    user: { id: 'u1', isGuest: false },
  },
  me: { profile: { id: 'u1', username: 'Mira' } },
}

function stubFetch(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', f)
  return f
}

function mount() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ auth: useAuth(), path: useLocation().pathname }), { wrapper })
}

beforeEach(() => {
  useSession.getState().clear()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('useAuth', () => {
  it('posts login, stores session and me, then goes home', async () => {
    const f = stubFetch(200, { ok: true, data: AUTH })
    const { result } = mount()
    await act(() => result.current.auth.login('Mira', 'secret1'))
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ identifier: 'Mira', password: 'secret1' })
    expect(useSession.getState().session?.accessToken).toBe('tok')
    expect(useSession.getState().me).toEqual(AUTH.me)
    expect(result.current.auth.isAuthenticated).toBe(true)
    await waitFor(() => expect(result.current.path).toBe('/'))
  })

  it('navigates to returnTo once and clears it', async () => {
    stubFetch(200, { ok: true, data: AUTH })
    sessionStorage.setItem(RETURN_TO_KEY, '/rules')
    const { result } = mount()
    await act(() => result.current.auth.login('Mira', 'secret1'))
    await waitFor(() => expect(result.current.path).toBe('/rules'))
    expect(sessionStorage.getItem(RETURN_TO_KEY)).toBeNull()
  })

  it('ignores an off-site returnTo', async () => {
    stubFetch(200, { ok: true, data: AUTH })
    sessionStorage.setItem(RETURN_TO_KEY, '//evil.example')
    const { result } = mount()
    await act(() => result.current.auth.login('Mira', 'secret1'))
    await waitFor(() => expect(result.current.path).toBe('/'))
  })

  it('maps a server error code and keeps the session empty', async () => {
    stubFetch(401, { ok: false, error: { code: 'ERR_CREDENTIALS' } })
    const { result } = mount()
    await act(() => result.current.auth.login('Mira', 'bad'))
    expect(result.current.auth.error).toBe('ERR_CREDENTIALS')
    expect(result.current.auth.offline).toBe(false)
    expect(result.current.auth.status).toBe('idle')
    expect(useSession.getState().session).toBeNull()
    expect(result.current.path).toBe('/login')
  })

  it('flags a network failure as offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('down'))),
    )
    const { result } = mount()
    await act(() => result.current.auth.guest())
    expect(result.current.auth.error).toBe('ERR_INTERNAL')
    expect(result.current.auth.offline).toBe(true)
  })

  it('reset resolves true on success and logout clears the store', async () => {
    stubFetch(200, { ok: true, data: { sent: true } })
    useSession.setState({ session: AUTH.session })
    const { result } = mount()
    let sent = false
    await act(async () => {
      sent = await result.current.auth.reset('m@x.bg')
    })
    expect(sent).toBe(true)
    act(() => result.current.auth.logout())
    expect(useSession.getState().session).toBeNull()
  })
})
