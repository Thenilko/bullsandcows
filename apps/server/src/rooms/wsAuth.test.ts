import { env as workerEnv } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { parseEnv } from '../env'
import { authenticateWs, forwardWithIdentity, readIdentity } from './wsAuth'

const env = parseEnv(workerEnv)
const MEMBERS = { allowGuests: false }
const req = (auth?: string) =>
  new Request(
    `https://x/ws/queue${auth === undefined ? '' : `?auth=${encodeURIComponent(auth)}`}`,
    {
      headers: { Upgrade: 'websocket' },
    },
  )

describe('authenticateWs', () => {
  it('answers 401 ERR_AUTH without a token', async () => {
    const res = await authenticateWs(req(), env, MEMBERS)
    expect(res).toBeInstanceOf(Response)
    expect((res as Response).status).toBe(401)
    expect(await (res as Response).json()).toEqual({ ok: false, error: { code: 'ERR_AUTH' } })
  })

  it('answers 401 for an invalid token', async () => {
    const res = await authenticateWs(req('garbage'), env, MEMBERS)
    expect((res as Response).status).toBe(401)
  })

  it('answers 403 ERR_GUEST for a guest', async () => {
    const res = await authenticateWs(req('fake:g1:guesty:guest'), env, MEMBERS)
    expect((res as Response).status).toBe(403)
    expect(await (res as Response).json()).toEqual({ ok: false, error: { code: 'ERR_GUEST' } })
  })

  it('returns the member PlayerInfo with the stored profile', async () => {
    const res = await authenticateWs(req('fake:u1:alice'), env, MEMBERS)
    expect(res).not.toBeInstanceOf(Response)
    const { info } = res as { info: { id: string; isGuest: boolean; level: number } }
    expect(info).toMatchObject({ id: 'u1', isGuest: false, level: 1 })
  })

  it('admits a guest when the room allows guests', async () => {
    const res = await authenticateWs(req('fake:g2:guestina:guest'), env, { allowGuests: true })
    expect(res).not.toBeInstanceOf(Response)
    expect((res as { info: { id: string; isGuest: boolean } }).info).toMatchObject({
      id: 'g2',
      isGuest: true,
    })
  })
})

describe('identity headers', () => {
  const info = {
    id: 'u1',
    username: 'alice',
    level: 3,
    rating: { rating: 1612.4, rd: 80, vol: 0.06 },
    isGuest: false,
  }

  it('round-trips PlayerInfo through the forwarded request', () => {
    const fwd = forwardWithIdentity(req('x'), info)
    expect(readIdentity(fwd.headers)).toEqual(info)
  })

  it('overwrites identity headers the client sent', () => {
    const spoofed = new Request('https://x/ws/queue', {
      headers: { Upgrade: 'websocket', 'x-user-id': 'victim', 'x-guest': '1' },
    })
    expect(readIdentity(forwardWithIdentity(spoofed, info).headers)?.id).toBe('u1')
  })

  it('reads nothing from a request without identity', () => {
    expect(readIdentity(new Headers())).toBeNull()
  })
})
