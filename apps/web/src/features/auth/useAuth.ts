import { isErrorCode, type AuthResponseDto, type ErrorCode, type GuestProfileResponseDto } from '@bc/protocol'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, createApi } from '../../lib/api'
import { RETURN_TO_KEY } from '../../app/RequireAuth'
import { api } from './client'
import { useSession } from './session'
import { adoptSession, signInGuestOnClient, signOutSupabase } from './SupabaseSession'

export interface AuthApi {
  me: ReturnType<typeof useSession.getState>['me']
  isGuest: boolean
  isAuthenticated: boolean
  status: 'idle' | 'loading'
  error: ErrorCode | null
  /** True when the last request failed without reaching the server (use `error.network`). */
  offline: boolean
  login(identifier: string, password: string): Promise<void>
  register(username: string, email: string, password: string): Promise<void>
  guest(): Promise<void>
  upgrade(username: string, email: string, password: string): Promise<void>
  /** Resolves true when the reset mail was accepted. */
  reset(email: string): Promise<boolean>
  logout(): void
}

function takeReturnTo(): string {
  try {
    const to = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    return to && to.startsWith('/') && !to.startsWith('//') ? to : '/'
  } catch {
    return '/'
  }
}

/** Supabase mode signs the guest in on the client and only ensures the profile on the server. */
async function startGuest(): Promise<AuthResponseDto> {
  const session = await signInGuestOnClient()
  if (!session) return api.post<AuthResponseDto>('/api/auth/guest', {})
  const res = await createApi(() => session.accessToken).post<GuestProfileResponseDto>('/api/auth/guest', {})
  return { session, me: res.me }
}

function toCode(e: unknown): ErrorCode {
  return e instanceof ApiError && isErrorCode(e.code) ? e.code : 'ERR_INTERNAL'
}

export function useAuth(): AuthApi {
  const navigate = useNavigate()
  const session = useSession((s) => s.session)
  const me = useSession((s) => s.me)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState<ErrorCode | null>(null)
  const [offline, setOffline] = useState(false)

  /** Runs one request; every failure is turned into `error` instead of a throw. */
  const run = useCallback(async <T>(task: () => Promise<T>, onOk: (v: T) => void): Promise<boolean> => {
    setStatus('loading')
    setError(null)
    setOffline(false)
    try {
      onOk(await task())
      return true
    } catch (e) {
      setError(toCode(e))
      setOffline(e instanceof ApiError && e.status === 0)
      return false
    } finally {
      setStatus('idle')
    }
  }, [])

  const signIn = useCallback(
    async (task: () => Promise<AuthResponseDto>): Promise<void> => {
      await run(task, (res) => {
        useSession.getState().setAuth(res)
        void adoptSession(res.session)
        void navigate(takeReturnTo(), { replace: true })
      })
    },
    [navigate, run],
  )
  const authenticate = useCallback(
    (path: string, body: unknown) => signIn(() => api.post<AuthResponseDto>(path, body)),
    [signIn],
  )

  return {
    me,
    isGuest: session?.user.isGuest ?? false,
    isAuthenticated: session !== null,
    status,
    error,
    offline,
    login: (identifier, password) => authenticate('/api/auth/login', { identifier, password }),
    register: (username, email, password) => authenticate('/api/auth/register', { username, email, password }),
    guest: () => signIn(startGuest),
    upgrade: (username, email, password) => authenticate('/api/auth/upgrade', { username, email, password }),
    reset: (email) => run(() => api.post('/api/auth/reset', { email }), () => undefined),
    logout: () => {
      useSession.getState().clear()
      void signOutSupabase()
      void navigate('/login', { replace: true })
    },
  }
}
