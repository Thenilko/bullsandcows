import { env as workerEnv, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServerMsg } from '@bc/protocol'
import { sharedMemoryRepo } from '../adapters/repo/memory'
import {
  durableRoomClient,
  RoomError,
  type PlayerInfo,
  type Room,
  type RoomOpts,
} from '../duel/roomClient'
import { COUNTDOWN_MS, RECONNECT_MS, TURN_MS, TURN_WARN_MS, type Secrets } from '../duel/types'
import type { DuelRoom } from './DuelRoom'
import { INVITE_MS, READY_MS } from './state'
import type { Timers } from './timers'

/** Mocked clock far ahead of real time, so a real alarm never fires on its own. */
const FAR_FUTURE = Date.now() + 1e9
const ns = workerEnv.DUEL as unknown as DurableObjectNamespace
const rooms = durableRoomClient(ns)
const repo = sharedMemoryRepo()

const RACE: RoomOpts = { format: 'race', len: 4, zero: false, opponentKind: 'quick' }
const CLASSIC: RoomOpts = { format: 'classic', len: 4, zero: false, opponentKind: 'human' }

interface Member {
  readonly info: PlayerInfo
  readonly auth: string
}

let seq = 0
async function member(name: string, isGuest = false): Promise<Member> {
  seq += 1
  const id = `${name}-${seq}-${crypto.randomUUID().slice(0, 8)}`
  const profile = await repo.profiles.create({ id, username: id, email: null, isGuest })
  return {
    info: { id, username: profile.username, level: 1, rating: profile.rating, isGuest },
    auth: `fake:${id}:${id}${isGuest ? ':guest' : ''}`,
  }
}

interface Client {
  readonly ws: WebSocket
  readonly msgs: ServerMsg[]
  closed: number | null
}

const wait = () => new Promise((r) => setTimeout(r, 25))

function wsUrl(roomId: string, token: string, auth: string): string {
  const q = new URLSearchParams({ token, auth })
  return `https://x/ws/duel/${roomId}?${q.toString()}`
}

async function connect(roomId: string, token: string, who: Member): Promise<Client> {
  const res = await exports.default.fetch(wsUrl(roomId, token, who.auth), {
    headers: { Upgrade: 'websocket' },
  })
  expect(res.status).toBe(101)
  const ws = res.webSocket!
  const client: Client = { ws, msgs: [], closed: null }
  ws.addEventListener('message', (e) => {
    client.msgs.push(JSON.parse(e.data as string))
  })
  ws.addEventListener('close', (e) => {
    client.closed = e.code
  })
  ws.accept()
  await wait()
  return client
}

const send = async (c: Client, msg: object) => {
  c.ws.send(JSON.stringify(msg))
  await wait()
}

const of = <T extends ServerMsg['t']>(c: Client, t: T) =>
  c.msgs.filter((m): m is Extract<ServerMsg, { t: T }> => m.t === t)
const last = <T extends ServerMsg['t']>(c: Client, t: T) => of(c, t).at(-1)

interface Setup {
  readonly room: Room
  readonly stub: DurableObjectStub
  readonly clock: { t: number }
  readonly a: Member
  readonly b: Member
  readonly ta: string
  readonly tb: string
}

const stubOf = (room: Room) => ns.get(ns.idFromString(room.id))

async function useClock(stub: DurableObjectStub, clock: { t: number }): Promise<void> {
  await runInDurableObject(stub, (instance: DuelRoom) => {
    vi.spyOn(instance, 'now').mockImplementation(() => clock.t)
  })
}

async function setup(opts: RoomOpts = RACE, room: Room = rooms.fresh()): Promise<Setup> {
  const clock = { t: FAR_FUTURE }
  const stub = stubOf(room)
  await useClock(stub, clock)
  const a = await member('anna')
  const b = await member('boris')
  const { token: ta } = await room.create({ opts, host: a.info })
  const { token: tb } = await room.join({ info: b.info })
  return { room, stub, clock, a, b, ta, tb }
}

const storage = <T>(stub: DurableObjectStub, key: string) =>
  runInDurableObject(stub, async (_i: DuelRoom, state) => state.storage.get<T>(key))

async function alarmAt(s: Pick<Setup, 'stub' | 'clock'>, t: number): Promise<void> {
  s.clock.t = t
  await runDurableObjectAlarm(s.stub)
  await wait()
}

async function startRace(s: Setup): Promise<{ ca: Client; cb: Client; secret: string }> {
  const ca = await connect(s.room.id, s.ta, s.a)
  const cb = await connect(s.room.id, s.tb, s.b)
  await send(ca, { t: 'ready' })
  await send(cb, { t: 'ready' })
  await alarmAt(s, s.clock.t + COUNTDOWN_MS)
  const secrets = await storage<Secrets>(s.stub, 'secrets')
  return { ca, cb, secret: secrets!.shared! }
}

/** A valid 4-digit code without zero that is not `secret`. */
const otherCode = (secret: string) => (secret === '1234' ? '5678' : '1234')

const openStubs: DurableObjectStub[] = []
afterEach(async () => {
  for (const stub of openStubs.splice(0)) {
    await runInDurableObject(stub, async (_i: DuelRoom, state) => {
      for (const ws of state.getWebSockets()) ws.close(1000)
      await state.storage.deleteAlarm()
    })
  }
  vi.restoreAllMocks()
})
const track = <T extends Pick<Setup, 'stub'>>(s: T): T => {
  openStubs.push(s.stub)
  return s
}

describe('Worker /ws/duel/:roomId', () => {
  it('answers 404 for a malformed room id', async () => {
    const m = await member('nobody')
    const res = await exports.default.fetch(wsUrl('not-a-room', 't', m.auth), {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(404)
    await res.text()
  })

  it('answers 401 without a valid access token', async () => {
    const s = track(await setup())
    const res = await exports.default.fetch(`https://x/ws/duel/${s.room.id}?token=${s.ta}`, {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(401)
    await res.text()
  })

  it('refuses a seat token presented by another user with 403', async () => {
    const s = track(await setup())
    const res = await exports.default.fetch(wsUrl(s.room.id, s.tb, s.a.auth), {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(403)
    await res.text()
  })

  it('admits a guest to a friend room', async () => {
    const room = rooms.fresh()
    const clock = { t: FAR_FUTURE }
    const stub = stubOf(room)
    track({ stub })
    await useClock(stub, clock)
    const host = await member('host')
    const guest = await member('guest', true)
    await room.create({ opts: CLASSIC, host: host.info })
    const { token } = await room.join({ info: guest.info })
    const c = await connect(room.id, token, guest)
    expect(last(c, 'state')?.state.me.isGuest).toBe(true)
  })
})

describe('DuelRoom race', () => {
  it('counts down after both are ready and starts when the countdown ends', async () => {
    const s = track(await setup())
    const ca = await connect(s.room.id, s.ta, s.a)
    const cb = await connect(s.room.id, s.tb, s.b)
    expect(last(ca, 'state')?.state.phase).toBe('lobby')
    await send(ca, { t: 'ready' })
    await send(cb, { t: 'ready' })
    const startAt = s.clock.t + COUNTDOWN_MS
    expect(of(ca, 'countdown')).toEqual([{ t: 'countdown', startAt }])
    expect(of(cb, 'countdown')).toEqual([{ t: 'countdown', startAt }])
    await alarmAt(s, startAt)
    expect(of(ca, 'started')).toEqual([{ t: 'started', startedAt: startAt }])
    expect(of(cb, 'started')).toEqual([{ t: 'started', startedAt: startAt }])
  })

  it('rejects an invalid code with ERR_CODE and changes nothing', async () => {
    const s = track(await setup())
    const { ca } = await startRace(s)
    const states = of(ca, 'state').length
    await send(ca, { t: 'guess', code: '1123' })
    expect(ca.msgs.at(-1)).toEqual({ t: 'error', code: 'ERR_CODE' })
    expect(of(ca, 'state')).toHaveLength(states)
    const match = await storage<{ players: { a: { guesses: unknown[] } } }>(s.stub, 'match')
    expect(match?.players.a.guesses).toEqual([])
  })

  it('answers malformed messages with ERR_INPUT', async () => {
    const s = track(await setup())
    const ca = await connect(s.room.id, s.ta, s.a)
    await send(ca, { t: 'dance' })
    expect(ca.msgs.at(-1)).toEqual({ t: 'error', code: 'ERR_INPUT' })
    ca.ws.send('not json')
    await wait()
    expect(ca.msgs.at(-1)).toEqual({ t: 'error', code: 'ERR_INPUT' })
  })

  it('sends the verdict to the guesser and only the progress to the opponent', async () => {
    const s = track(await setup())
    const { ca, cb, secret } = await startRace(s)
    const guess = otherCode(secret)
    await send(ca, { t: 'guess', code: guess })
    expect(last(ca, 'verdict')).toMatchObject({ t: 'verdict', guess, attempts: 1 })
    const moved = last(cb, 'oppMoved')
    expect(moved).toMatchObject({ t: 'oppMoved', attempts: 1 })
    expect(JSON.stringify(moved)).not.toContain(guess)
    for (const c of [ca, cb]) {
      for (const st of of(c, 'state')) expect(JSON.stringify(st)).not.toContain(secret)
    }
  })

  it('ends by disconnect when a seat stays away for 30 s', async () => {
    const s = track(await setup())
    const { ca, cb } = await startRace(s)
    const closedAt = s.clock.t
    ca.ws.close(1000)
    await wait()
    const timers = await storage<Timers>(s.stub, 'timers')
    expect(timers?.['reconnect:a']).toBe(closedAt + RECONNECT_MS)
    await alarmAt(s, closedAt + RECONNECT_MS)
    expect(last(cb, 'ended')).toMatchObject({ outcome: 'win', reason: 'disconnect' })
  })

  it('clears the reconnect timer when the seat comes back with its token', async () => {
    const s = track(await setup())
    const { ca } = await startRace(s)
    ca.ws.close(1000)
    await wait()
    s.clock.t += 10_000
    const again = await connect(s.room.id, s.ta, s.a)
    expect(last(again, 'state')?.state.me.connected).toBe(true)
    const timers = await storage<Timers>(s.stub, 'timers')
    expect(timers?.['reconnect:a']).toBeUndefined()
  })

  it('replaces an older socket of the same seat', async () => {
    const s = track(await setup())
    const first = await connect(s.room.id, s.ta, s.a)
    const second = await connect(s.room.id, s.ta, s.a)
    expect(first.closed).not.toBeNull()
    await send(second, { t: 'ready' })
    expect(last(second, 'state')?.state.me.ready).toBe(true)
    expect(last(second, 'state')?.state.me.connected).toBe(true)
  })

  it('records a quick match: rating changes, xp 120/40, one game each', async () => {
    const s = track(await setup())
    const { ca, cb, secret } = await startRace(s)
    s.clock.t += 20_000
    await send(ca, { t: 'guess', code: secret })
    const endedA = last(ca, 'ended')
    expect(endedA).toMatchObject({ outcome: 'win', reason: 'solved', xp: 120 })
    expect(endedA?.rating).not.toBeNull()
    expect(last(cb, 'ended')).toMatchObject({ outcome: 'lose', xp: 40 })
    const pa = await repo.profiles.get(s.a.info.id)
    const pb = await repo.profiles.get(s.b.info.id)
    expect(pa?.xp).toBe(120)
    expect(pb?.xp).toBe(40)
    expect(pa?.rating.rating).toBeGreaterThan(s.a.info.rating.rating)
    expect(pb?.rating.rating).toBeLessThan(s.b.info.rating.rating)
    const [game] = await repo.games.history(s.a.info.id, 5)
    expect(game).toMatchObject({ kind: 'duel_race', won: true, attempts: 1 })
    expect(await repo.games.history(s.b.info.id, 5)).toHaveLength(1)
  })

  it('records a friend match without touching the rating', async () => {
    const s = track(await setup({ ...RACE, opponentKind: 'human' }))
    const { ca, secret } = await startRace(s)
    s.clock.t += 20_000
    await send(ca, { t: 'guess', code: secret })
    expect(last(ca, 'ended')).toMatchObject({ outcome: 'win', rating: null, xp: 120 })
    const pa = await repo.profiles.get(s.a.info.id)
    const pb = await repo.profiles.get(s.b.info.id)
    expect(pa?.rating).toEqual(s.a.info.rating)
    expect(pb?.rating).toEqual(s.b.info.rating)
    expect(pa?.xp).toBe(120)
    expect(pb?.xp).toBe(40)
  })

  it('reveals the secret in the final state only', async () => {
    const s = track(await setup())
    const { ca, secret } = await startRace(s)
    await send(ca, { t: 'giveUp' })
    expect(last(ca, 'state')?.state.secrets).toEqual({ mine: secret, theirs: secret })
  })

  it('starts a fresh friendly match when both ask for a rematch', async () => {
    const s = track(await setup())
    const { ca, cb } = await startRace(s)
    await send(ca, { t: 'giveUp' })
    await send(cb, { t: 'rematch' })
    expect(last(ca, 'rematchOffer')).toMatchObject({ from: 'opp' })
    await send(ca, { t: 'rematch' })
    const st = last(ca, 'state')?.state
    expect(st).toMatchObject({ phase: 'lobby', opponentKind: 'friend' })
    expect(st?.secrets).toBeUndefined()
  })
})

describe('DuelRoom classic', () => {
  async function startClassic(s: Setup) {
    const ca = await connect(s.room.id, s.ta, s.a)
    const cb = await connect(s.room.id, s.tb, s.b)
    await send(ca, { t: 'ready' })
    await send(cb, { t: 'ready' })
    await send(ca, { t: 'secret', code: '1234' })
    await send(cb, { t: 'secret', code: '5678' })
    const startAt = s.clock.t + COUNTDOWN_MS
    await alarmAt(s, startAt)
    const turn = last(ca, 'state')?.state.turn
    return { ca, cb, startAt, onTurn: turn === 'a' ? ca : cb, offTurn: turn === 'a' ? cb : ca }
  }

  it('warns at 45 s and ends by timeout at 60 s', async () => {
    const s = track(await setup(CLASSIC))
    const { startAt, onTurn, offTurn } = await startClassic(s)
    await alarmAt(s, startAt + TURN_MS - TURN_WARN_MS)
    expect(of(onTurn, 'warning')).toEqual([{ t: 'warning', msLeft: TURN_WARN_MS }])
    expect(of(offTurn, 'warning')).toEqual([])
    await alarmAt(s, startAt + TURN_MS)
    expect(last(onTurn, 'ended')).toMatchObject({ outcome: 'lose', reason: 'timeout' })
    expect(last(offTurn, 'ended')).toMatchObject({ outcome: 'win', reason: 'timeout' })
  })

  it('never shows the opponent secret before the end', async () => {
    const s = track(await setup(CLASSIC))
    const { ca, cb } = await startClassic(s)
    for (const st of of(ca, 'state')) expect(JSON.stringify(st)).not.toContain('5678')
    for (const st of of(cb, 'state')) expect(JSON.stringify(st)).not.toContain('1234')
  })

  it('a late secret loses by timeout after 60 s', async () => {
    const s = track(await setup(CLASSIC))
    const ca = await connect(s.room.id, s.ta, s.a)
    const cb = await connect(s.room.id, s.tb, s.b)
    await send(ca, { t: 'ready' })
    await send(cb, { t: 'ready' })
    const secretsFrom = s.clock.t
    await send(ca, { t: 'secret', code: '1234' })
    await alarmAt(s, secretsFrom + 60_000)
    expect(last(cb, 'ended')).toMatchObject({ outcome: 'lose', reason: 'timeout' })
    expect(last(ca, 'ended')).toMatchObject({ outcome: 'win', reason: 'timeout' })
  })
})

describe('DuelRoom lobby timers', () => {
  it('abandons the match without xp when not both ready within 60 s', async () => {
    const s = track(await setup())
    const ca = await connect(s.room.id, s.ta, s.a)
    const cb = await connect(s.room.id, s.tb, s.b)
    const joinedAt = s.clock.t
    await send(ca, { t: 'ready' })
    await alarmAt(s, joinedAt + READY_MS)
    for (const c of [ca, cb]) {
      expect(last(c, 'ended')).toMatchObject({
        outcome: 'draw',
        reason: 'abandoned',
        rating: null,
        xp: 0,
      })
    }
    expect((await repo.profiles.get(s.a.info.id))?.xp).toBe(0)
    expect((await s.room.info())?.status).toBe('ended')
  })

  it('expires an unanswered invite after 30 min and can be reset by /create', async () => {
    const room = rooms.invite(`T${crypto.randomUUID().slice(0, 4).toUpperCase()}`)
    const clock = { t: FAR_FUTURE }
    const stub = stubOf(room)
    track({ stub })
    await useClock(stub, clock)
    const host = await member('host')
    const { token } = await room.create({ opts: CLASSIC, host: host.info })
    const c = await connect(room.id, token, host)
    expect(await room.info()).toEqual({
      status: 'waiting',
      host: { id: host.info.id, username: host.info.username, level: 1 },
      settings: { format: 'classic', len: 4, zero: false },
      players: 1,
    })
    await alarmAt({ stub, clock }, FAR_FUTURE + INVITE_MS)
    expect((await room.info())?.status).toBe('expired')
    expect(c.closed).not.toBeNull()
    const guest = await member('late')
    await expect(room.join({ info: guest.info })).rejects.toEqual(
      new RoomError('ERR_INVITE_EXPIRED'),
    )
    await room.create({ opts: CLASSIC, host: host.info })
    expect((await room.info())?.status).toBe('waiting')
    expect((await room.join({ info: guest.info })).token).toEqual(expect.any(String))
  })

  it('refuses a third player with ERR_ROOM_FULL', async () => {
    const s = track(await setup())
    const third = await member('third')
    await expect(s.room.join({ info: third.info })).rejects.toEqual(new RoomError('ERR_ROOM_FULL'))
    expect((await s.room.info())?.players).toBe(2)
  })

  it('answers /info with null for a room that was never created', async () => {
    expect(await rooms.fresh().info()).toBeNull()
  })
})

describe('DuelRoom bot rooms', () => {
  it('creates a bot room with a ready bot that has its own classic secret', async () => {
    const room = rooms.fresh()
    const clock = { t: FAR_FUTURE }
    const stub = stubOf(room)
    track({ stub })
    await useClock(stub, clock)
    const host = await member('solo')
    const { token } = await room.create({
      opts: { ...CLASSIC, opponentKind: 'bot', botLevel: 2 },
      host: host.info,
    })
    expect((await room.info())?.players).toBe(2)
    const c = await connect(room.id, token, host)
    expect(last(c, 'state')?.state.opp).toMatchObject({ username: 'bot', ready: true })
    await send(c, { t: 'ready' })
    expect(last(c, 'state')?.state).toMatchObject({ phase: 'secrets', opp: { hasSecret: true } })
  })
})
