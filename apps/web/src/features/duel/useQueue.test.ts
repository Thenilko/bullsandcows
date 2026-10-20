import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockWebSocket } from '../../test/mockWebSocket'
import { useSession } from '../auth/session'
import { useQueue } from './useQueue'

const OPTS = { len: 4 as const, zero: false, format: 'race' as const }
const JOIN = JSON.stringify({ t: 'join', ...OPTS })

beforeEach(() => {
  vi.useFakeTimers()
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
  useSession.setState({ session: { accessToken: 'jwt', refreshToken: 'r', expiresAt: 9e12, user: { id: 'u', isGuest: false } } } as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useSession.setState({ session: null, me: null })
})

describe('useQueue', () => {
  it('joins once the socket opens', () => {
    renderHook(() => useQueue(OPTS))
    expect(MockWebSocket.last().sent).toEqual([])
    act(() => MockWebSocket.last().open())
    expect(MockWebSocket.last().sent).toEqual([JOIN])
  })

  it('joins again after a dropped connection is reopened', () => {
    renderHook(() => useQueue(OPTS))
    act(() => MockWebSocket.last().open())
    act(() => MockWebSocket.last().drop())
    act(() => void vi.advanceTimersByTime(500))
    expect(MockWebSocket.instances).toHaveLength(2)
    act(() => MockWebSocket.last().open())
    expect(MockWebSocket.last().sent).toEqual([JOIN])
  })

  it('never re-joins after a match, and a normal close is not an error', () => {
    const { result } = renderHook(() => useQueue(OPTS))
    act(() => MockWebSocket.last().open())
    act(() => MockWebSocket.last().receive({ t: 'matched', roomId: 'r1', token: 't1' }))
    expect(result.current.matched).toEqual({ roomId: 'r1', token: 't1' })
    act(() => MockWebSocket.last().close(1000))
    act(() => void vi.advanceTimersByTime(10_000))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.last().sent).toEqual([JOIN])
    expect(result.current.error).toBeNull()
  })

  it('does not connect for guests', () => {
    useSession.setState({ session: { accessToken: 'jwt', refreshToken: 'r', expiresAt: 9e12, user: { id: 'u', isGuest: true } } } as never)
    const { result } = renderHook(() => useQueue(OPTS))
    expect(MockWebSocket.instances).toHaveLength(0)
    expect(result.current.error).toBe('guest')
  })
})
