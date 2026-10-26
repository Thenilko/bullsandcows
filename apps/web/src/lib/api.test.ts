import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './api'

function reply(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

describe('createApi', () => {
  it('unwraps ok envelopes', async () => {
    const api = createApi(() => null, reply(200, { ok: true, data: { n: 1 } }))
    await expect(api.get<{ n: number }>('/api/me')).resolves.toEqual({ n: 1 })
  })

  it('throws ApiError with code and status on ok:false', async () => {
    const api = createApi(() => null, reply(400, { ok: false, error: { code: 'ERR_CODE' } }))
    const err = await api.post('/api/x', {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: 'ERR_CODE', status: 400 })
  })

  it('adds the Bearer header only when a token exists', async () => {
    const f = reply(200, { ok: true, data: null })
    await createApi(() => 'tok', f).get('/api/me')
    await createApi(() => null, f).get('/api/me')
    const calls = (f as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][]
    expect(new Headers(calls[0]?.[1].headers).get('authorization')).toBe('Bearer tok')
    expect(new Headers(calls[1]?.[1].headers).get('authorization')).toBeNull()
  })

  it('sends JSON bodies and the right method', async () => {
    const f = reply(200, { ok: true, data: null })
    await createApi(() => null, f).patch('/api/me/settings', { sound: false })
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/me/settings')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe('{"sound":false}')
    expect(new Headers(init.headers).get('content-type')).toBe('application/json')
  })

  it('calls onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn()
    const api = createApi(() => 't', reply(401, { ok: false, error: { code: 'ERR_AUTH' } }), { onUnauthorized })
    await expect(api.get('/api/me')).rejects.toMatchObject({ code: 'ERR_AUTH', status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('maps network failure to ERR_INTERNAL with status 0', async () => {
    const api = createApi(() => null, vi.fn(async () => Promise.reject(new TypeError('x'))) as unknown as typeof fetch)
    await expect(api.get('/api/me')).rejects.toMatchObject({ code: 'ERR_INTERNAL', status: 0 })
  })

  it('maps a malformed body to ERR_INTERNAL', async () => {
    const f = vi.fn(async () => new Response('<html>', { status: 502 })) as unknown as typeof fetch
    await expect(createApi(() => null, f).get('/api/me')).rejects.toMatchObject({ code: 'ERR_INTERNAL', status: 502 })
  })

  describe('session renewal', () => {
    const sequence = (...statuses: number[]) => {
      const queue = [...statuses]
      return vi.fn(async () => {
        const status = queue.shift() ?? 200
        const body = status === 200 ? { ok: true, data: 'fine' } : { ok: false, error: { code: 'ERR_AUTH' } }
        return new Response(JSON.stringify(body), { status })
      }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
    }

    it('refreshes once after a 401 and retries with the new token', async () => {
      let token = 'old'
      const f = sequence(401, 200)
      const onUnauthorized = vi.fn()
      const refresh = vi.fn(async () => {
        token = 'new'
        return 'refreshed' as const
      })
      const api = createApi(() => token, f, { onUnauthorized, refresh })
      await expect(api.get('/api/me')).resolves.toBe('fine')
      const calls = f.mock.calls as [string, RequestInit][]
      expect(calls.map(([, init]) => new Headers(init.headers).get('authorization'))).toEqual([
        'Bearer old',
        'Bearer new',
      ])
      expect(refresh).toHaveBeenCalledOnce()
      expect(onUnauthorized).not.toHaveBeenCalled()
    })

    it('clears when the retry is rejected too', async () => {
      const onUnauthorized = vi.fn()
      const api = createApi(() => 't', sequence(401, 401), { onUnauthorized, refresh: async () => 'refreshed' })
      await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 })
      expect(onUnauthorized).toHaveBeenCalledOnce()
    })

    it('clears when the refresh token is rejected, keeps the session when Supabase is unreachable', async () => {
      const cleared = vi.fn()
      await createApi(() => 't', sequence(401), { onUnauthorized: cleared, refresh: async () => 'invalid' })
        .get('/api/me')
        .catch(() => undefined)
      expect(cleared).toHaveBeenCalledOnce()
      const kept = vi.fn()
      await createApi(() => 't', sequence(401), { onUnauthorized: kept, refresh: async () => 'unavailable' })
        .get('/api/me')
        .catch(() => undefined)
      expect(kept).not.toHaveBeenCalled()
    })

    it('never refreshes or clears on a 401 from /api/auth/*', async () => {
      const onUnauthorized = vi.fn()
      const refresh = vi.fn(async () => 'refreshed' as const)
      const api = createApi(() => 't', sequence(401), { onUnauthorized, refresh })
      await expect(api.post('/api/auth/upgrade', {})).rejects.toMatchObject({ status: 401 })
      expect(refresh).not.toHaveBeenCalled()
      expect(onUnauthorized).not.toHaveBeenCalled()
    })

    it('awaits beforeRequest so a token about to expire is renewed first', async () => {
      let token = 'stale'
      const f = sequence(200)
      const beforeRequest = vi.fn(async () => {
        token = 'fresh'
      })
      await createApi(() => token, f, { beforeRequest }).get('/api/me')
      const [, init] = f.mock.calls[0] as [string, RequestInit]
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer fresh')
    })

    it('still sends the request when beforeRequest fails', async () => {
      const f = sequence(200)
      const api = createApi(() => 't', f, { beforeRequest: async () => Promise.reject(new Error('x')) })
      await expect(api.get('/api/me')).resolves.toBe('fine')
    })
  })
})
