import { env as workerEnv, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QueueServerMsg } from '@bc/protocol'
import type { PlayerInfo, Room, RoomClient } from '../duel/roomClient'
import { QueueRoom } from './QueueRoom'

const QUEUE_MS = 5000
/** Mocked clock far ahead of real time, so the real alarm never fires on its own. */
const FAR_FUTURE = Date.now() + 1e9
const lobby = () => workerEnv.QUEUE.get(workerEnv.QUEUE.idFromName('lobby'))

interface Client {
  ws: WebSocket
  msgs: QueueServerMsg[]
  closed: { code: number } | null
}

async function connect(token: string): Promise<Client> {
  const res = await exports.default.fetch(`https://x/ws/queue?auth=${encodeURIComponent(token)}`, {
    headers: { Upgrade: 'websocket' },
  })
  expect(res.status).toBe(101)
  const ws = res.webSocket!
  const client: Client = { ws, msgs: [], closed: null }
  ws.addEventListener('message', (e) => {
    client.msgs.push(JSON.parse(e.data as string))
  })
  ws.addEventListener('close', (e) => {
    client.closed = { code: e.code }
  })
  ws.accept()
  return client
}

const settle = () => new Promise((r) => setTimeout(r, 20))
const join = async (c: Client, over: object = {}) => {
  c.ws.send(JSON.stringify({ t: 'join', len: 4, zero: false, format: 'race', ...over }))
  await settle()
}

interface Calls {
  creates: { host: PlayerInfo; opts: unknown }[]
  joins: PlayerInfo[]
}

function fakeClient(opts: { fail?: boolean } = {}): { client: RoomClient; calls: Calls } {
  const calls: Calls = { creates: [], joins: [] }
  const room: Room = {
    id: 'room-1',
    create: async (req) => {
      if (opts.fail) throw new Error('boom')
      calls.creates.push(req)
      return { token: 'tok-host' }
    },
    join: async (req) => {
      calls.joins.push(req.info)
      return { token: 'tok-guest' }
    },
    info: async () => null,
  }
  return { client: { invite: () => room, fresh: () => room }, calls }
}

/** Drives the lobby's clock and room client from inside the DO. */
async function patch(clientImpl: RoomClient, clock: { t: number }): Promise<void> {
  await runInDurableObject(lobby(), (instance: QueueRoom) => {
    vi.spyOn(instance, 'now').mockImplementation(() => clock.t)
    vi.spyOn(instance, 'roomClient').mockReturnValue(clientImpl)
  })
}

const tick = async (clock: { t: number }) => {
  clock.t += QUEUE_MS
  await runDurableObjectAlarm(lobby())
  await settle()
}

afterEach(async () => {
  await runInDurableObject(lobby(), async (_i: QueueRoom, state) => {
    await state.storage.deleteAlarm()
    await state.storage.deleteAll()
    for (const ws of state.getWebSockets()) ws.close(1000)
  })
  vi.restoreAllMocks()
})

describe('/ws/queue admission', () => {
  it('rejects a guest with 403 ERR_GUEST before any upgrade', async () => {
    const res = await exports.default.fetch('https://x/ws/queue?auth=fake:g:gg:guest', {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(403)
    expect(res.webSocket).toBeNull()
    expect(await res.json()).toEqual({ ok: false, error: { code: 'ERR_GUEST' } })
  })

  it('rejects an unauthenticated request with 401', async () => {
    const res = await exports.default.fetch('https://x/ws/queue', {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(401)
  })
})

describe('QueueRoom', () => {
  it('matches two members with equal settings and close ratings', async () => {
    const clock = { t: FAR_FUTURE }
    const { client, calls } = fakeClient()
    await patch(client, clock)
    const a = await connect('fake:ua:anna')
    const b = await connect('fake:ub:boris')
    await join(a)
    await join(b)
    expect(a.msgs).toEqual([{ t: 'waiting', elapsedMs: 0, suggestInvite: false }])
    await tick(clock)
    const matchedA = a.msgs.find((m) => m.t === 'matched')
    const matchedB = b.msgs.find((m) => m.t === 'matched')
    expect(matchedA).toEqual({ t: 'matched', roomId: 'room-1', token: 'tok-host' })
    expect(matchedB).toEqual({ t: 'matched', roomId: 'room-1', token: 'tok-guest' })
    expect(calls.creates).toHaveLength(1)
    expect(calls.creates[0]?.opts).toEqual({
      format: 'race',
      len: 4,
      zero: false,
      opponentKind: 'quick',
    })
    const ids = [calls.creates[0]?.host.id, calls.joins[0]?.id].sort()
    expect(ids).toEqual(['ua', 'ub'])
    expect(a.closed?.code).toBe(1000)
    expect(b.closed?.code).toBe(1000)
  })

  it('keeps players with different settings waiting and suggests an invite after 20 s', async () => {
    const clock = { t: FAR_FUTURE }
    const { client } = fakeClient()
    await patch(client, clock)
    const a = await connect('fake:ua:anna')
    const b = await connect('fake:ub:boris')
    await join(a, { len: 3 })
    await join(b, { len: 5 })
    for (let i = 0; i < 6; i += 1) await tick(clock)
    const waits = a.msgs.filter((m) => m.t === 'waiting')
    expect(waits).toHaveLength(7)
    expect(a.msgs.some((m) => m.t === 'matched')).toBe(false)
    expect(waits[4]).toMatchObject({ elapsedMs: 20_000, suggestInvite: false })
    expect(waits[5]).toMatchObject({ elapsedMs: 25_000, suggestInvite: true })
    expect(waits[6]).toMatchObject({ elapsedMs: 30_000, suggestInvite: true })
  })

  it('does not match a player whose socket closed', async () => {
    const clock = { t: FAR_FUTURE }
    const { client, calls } = fakeClient()
    await patch(client, clock)
    const a = await connect('fake:ua:anna')
    const b = await connect('fake:ub:boris')
    await join(a)
    await join(b)
    a.ws.close(1000)
    await settle()
    await tick(clock)
    expect(calls.creates).toHaveLength(0)
    expect(b.msgs.some((m) => m.t === 'matched')).toBe(false)
    expect(b.msgs.at(-1)).toMatchObject({ t: 'waiting', elapsedMs: 5000 })
  })

  it('answers ERR_INPUT to an invalid message', async () => {
    const a = await connect('fake:ua:anna')
    a.ws.send('not json')
    a.ws.send(JSON.stringify({ t: 'join', len: 9, zero: false, format: 'race' }))
    await settle()
    expect(a.msgs).toEqual([
      { t: 'error', code: 'ERR_INPUT' },
      { t: 'error', code: 'ERR_INPUT' },
    ])
  })

  it('drops both players with ERR_INTERNAL when the room cannot be created', async () => {
    const clock = { t: FAR_FUTURE }
    const { client } = fakeClient({ fail: true })
    await patch(client, clock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const a = await connect('fake:ua:anna')
    const b = await connect('fake:ub:boris')
    await join(a)
    await join(b)
    await tick(clock)
    for (const c of [a, b]) {
      expect(c.msgs.at(-1)).toEqual({ t: 'error', code: 'ERR_INTERNAL' })
      expect(c.closed?.code).toBe(1011)
    }
    await runInDurableObject(lobby(), async (_i: QueueRoom, state) => {
      expect(await state.storage.getAlarm()).toBeNull()
    })
  })

  it('stops the alarm once the queue is empty', async () => {
    const a = await connect('fake:ua:anna')
    await join(a)
    a.ws.close(1000)
    await settle()
    await runDurableObjectAlarm(lobby())
    await runInDurableObject(lobby(), async (_i: QueueRoom, state) => {
      expect(await state.storage.getAlarm()).toBeNull()
    })
  })
})
