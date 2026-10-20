import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../auth/session'
import { MockWebSocket } from '../../test/mockWebSocket'
import { useDuelStore } from './store'
import { clearRoomSession, readStoredRoom, ROOM_KEY, useRoom } from './useRoom'

beforeEach(() => {
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
  sessionStorage.clear()
  useDuelStore.getState().reset()
  useSession.setState({ session: { accessToken: 'jwt-1', refreshToken: 'r', expiresAt: 9e12, user: { id: 'u', isGuest: false } } } as never)
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ session: null, me: null })
})

describe('useRoom', () => {
  it('connects with the seat token and remembers the room for reloads', () => {
    renderHook(() => useRoom('room-1', 'tok-1'))
    const url = new URL(MockWebSocket.last().url)
    expect(url.pathname).toBe('/ws/duel/room-1')
    expect(url.searchParams.get('token')).toBe('tok-1')
    expect(url.searchParams.get('auth')).toBe('jwt-1')
    expect(JSON.parse(sessionStorage.getItem(ROOM_KEY) ?? 'null')).toEqual({ roomId: 'room-1', token: 'tok-1' })
    expect(readStoredRoom()).toEqual({ roomId: 'room-1', token: 'tok-1' })
  })

  it('sends nothing extra when remounted with the same values', () => {
    const first = renderHook(() => useRoom('room-1', 'tok-1'))
    MockWebSocket.last().open()
    first.unmount()
    renderHook(() => useRoom('room-1', 'tok-1'))
    MockWebSocket.last().open()
    expect(MockWebSocket.instances).toHaveLength(2)
    expect(MockWebSocket.instances.every((ws) => ws.sent.length === 0)).toBe(true)
  })

  it('exposes the latest server state and status', () => {
    const { result } = renderHook(() => useRoom('room-1', 'tok-1'))
    expect(result.current.state).toBeNull()
    act(() => MockWebSocket.last().open())
    expect(result.current.status).toBe('open')
    act(() => {
      result.current.send({ t: 'ready' })
    })
    expect(MockWebSocket.last().sent).toEqual([JSON.stringify({ t: 'ready' })])
  })

  it('forgets the room on clearRoomSession', () => {
    renderHook(() => useRoom('room-1', 'tok-1'))
    clearRoomSession()
    expect(readStoredRoom()).toBeNull()
  })
})
