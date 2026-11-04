import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn(async () => ({}))
vi.mock('../auth/client', () => ({ api: { post: (...args: unknown[]) => post(...(args as [])) } }))

const { activityOf, PING_MS, startPresence } = await import('./presence')
const { useSession } = await import('../auth/session')

function fakeRouter(pathname: string) {
  let listener: ((s: { location: { pathname: string } }) => void) | null = null
  return {
    state: { location: { pathname } },
    subscribe: (fn: typeof listener) => {
      listener = fn
      return () => {
        listener = null
      }
    },
    go: (to: string) => listener?.({ location: { pathname: to } }),
  }
}

describe('activityOf', () => {
  it('maps routes to what the player is doing, without ids', () => {
    expect(
      ['/', '/new', '/play/abc', '/weekly/play', '/result/abc', '/duel/queue', '/d/ABC12', '/duel/room1', '/board', '/farm', '/admin'].map(activityOf),
    ).toEqual(['home', 'setup', 'play', 'play', 'result', 'queue', 'invite', 'duel', 'board', 'farm', 'other'])
  })
})

describe('startPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    post.mockClear()
    useSession.setState({ session: { accessToken: 't', refreshToken: '', expiresAt: 0, user: { id: 'u1', isGuest: true } } })
  })
  afterEach(() => vi.useRealTimers())

  it('pings at once, on a route change and every minute', () => {
    const router = fakeRouter('/')
    const stop = startPresence(router)
    expect(post).toHaveBeenLastCalledWith('/api/me/ping', { activity: 'home' })
    vi.advanceTimersByTime(11_000)
    router.go('/play/g1')
    expect(post).toHaveBeenLastCalledWith('/api/me/ping', { activity: 'play' })
    vi.advanceTimersByTime(PING_MS)
    expect(post).toHaveBeenCalledTimes(3)
    stop()
    vi.advanceTimersByTime(PING_MS)
    expect(post).toHaveBeenCalledTimes(3)
  })

  it('stays quiet when signed out', () => {
    useSession.setState({ session: null })
    const stop = startPresence(fakeRouter('/'))
    vi.advanceTimersByTime(PING_MS)
    expect(post).not.toHaveBeenCalled()
    stop()
  })
})
