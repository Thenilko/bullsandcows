import { ServerMsg } from '@bc/protocol'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockWebSocket } from '../test/mockWebSocket'
import { connectRealtime } from './realtime'

const OPTS = { token: 'seat-token', jwt: 'jwt-value' }

beforeEach(() => {
  vi.useFakeTimers()
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('connectRealtime', () => {
  it('builds a same-origin URL with auth and token', () => {
    connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    const url = new URL(MockWebSocket.last().url)
    expect(url.protocol).toBe('ws:')
    expect(url.host).toBe(location.host)
    expect(url.pathname).toBe('/ws/duel/r1')
    expect(url.searchParams.get('auth')).toBe('jwt-value')
    expect(url.searchParams.get('token')).toBe('seat-token')
  })

  it('omits the token parameter when there is none', () => {
    connectRealtime('/ws/queue', { jwt: 'j' }, ServerMsg)
    expect(new URL(MockWebSocket.last().url).searchParams.has('token')).toBe(false)
  })

  it('reopens after 500 ms, then after 1000 ms', () => {
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    MockWebSocket.last().open()
    MockWebSocket.last().drop()
    expect(rt.status).toBe('reconnecting')
    vi.advanceTimersByTime(499)
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(MockWebSocket.instances).toHaveLength(2)
    MockWebSocket.last().drop()
    vi.advanceTimersByTime(999)
    expect(MockWebSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(MockWebSocket.instances).toHaveLength(3)
  })

  it('resets the backoff once a socket opens again', () => {
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    MockWebSocket.last().drop()
    vi.advanceTimersByTime(500)
    MockWebSocket.last().open()
    expect(rt.status).toBe('open')
    MockWebSocket.last().drop()
    vi.advanceTimersByTime(500)
    expect(MockWebSocket.instances).toHaveLength(3)
  })

  it('gives up with status closed and a callback after 30 s of failures', () => {
    const onStatus = vi.fn()
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    rt.onStatus(onStatus)
    MockWebSocket.last().drop()
    for (let i = 0; i < 40 && rt.status !== 'closed'; i++) {
      vi.advanceTimersByTime(4000)
      if (rt.status === 'reconnecting') MockWebSocket.last().drop()
    }
    expect(rt.status).toBe('closed')
    expect(onStatus).toHaveBeenLastCalledWith('closed')
    const count = MockWebSocket.instances.length
    vi.advanceTimersByTime(60_000)
    expect(MockWebSocket.instances).toHaveLength(count)
  })

  it('queues sends while reconnecting and flushes them on open', () => {
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    MockWebSocket.last().open()
    MockWebSocket.last().drop()
    rt.send({ t: 'ready' })
    vi.advanceTimersByTime(500)
    expect(MockWebSocket.last().sent).toHaveLength(0)
    MockWebSocket.last().open()
    expect(MockWebSocket.last().sent).toEqual([JSON.stringify({ t: 'ready' })])
  })

  it('delivers valid messages and ignores invalid ones with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    const handler = vi.fn()
    rt.on(handler)
    const ws = MockWebSocket.last()
    ws.open()
    ws.receive({ t: 'started', startedAt: 5 })
    ws.receive({ t: 'nope' })
    ws.receive('not json')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ t: 'started', startedAt: 5 })
    expect(warn).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(warn.mock.calls)).not.toContain('jwt-value')
  })

  it('close() stops reconnecting', () => {
    const rt = connectRealtime('/ws/duel/r1', OPTS, ServerMsg)
    MockWebSocket.last().open()
    rt.close()
    vi.advanceTimersByTime(10_000)
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(rt.status).toBe('closed')
  })
})
