import { env as workerEnv, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { BOT_THINK_BASE } from '@bc/game-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServerMsg } from '@bc/protocol'
import { sharedMemoryRepo } from '../adapters/repo/memory'
import { durableRoomClient, type RoomOpts } from '../duel/roomClient'
import { COUNTDOWN_MS, type Match, type Secrets } from '../duel/types'
import type { DuelRoom } from './DuelRoom'
import { SECRETS_MS } from './state'
import type { Timers } from './timers'

const FAR_FUTURE = Date.now() + 1e9
const ns = workerEnv.DUEL as unknown as DurableObjectNamespace
const rooms = durableRoomClient(ns)
const repo = sharedMemoryRepo()

const botOpts = (format: 'race' | 'classic', botLevel: 1 | 2 | 3 | 4): RoomOpts => ({
  format,
  len: 4,
  zero: false,
  opponentKind: 'bot',
  botLevel,
})

const wait = () => new Promise((r) => setTimeout(r, 120))

interface Client {
  readonly ws: WebSocket
  readonly msgs: ServerMsg[]
}
const of = <T extends ServerMsg['t']>(c: Client, t: T) =>
  c.msgs.filter((m): m is Extract<ServerMsg, { t: T }> => m.t === t)
const last = <T extends ServerMsg['t']>(c: Client, t: T) => of(c, t).at(-1)

interface Setup {
  readonly stub: DurableObjectStub
  readonly clock: { t: number }
  readonly userId: string
  readonly c: Client
}

const stubs: DurableObjectStub[] = []
afterEach(async () => {
  for (const stub of stubs.splice(0)) {
    await runInDurableObject(stub, async (_i: DuelRoom, state) => {
      for (const ws of state.getWebSockets()) ws.close(1000)
      await state.storage.deleteAlarm()
    })
  }
  vi.restoreAllMocks()
})

/** Creates a bot room with a human in it, connected; `rng0` pins the room's rng to 0. */
async function setup(opts: RoomOpts, rng0 = false): Promise<Setup> {
  const room = rooms.fresh()
  const stub = ns.get(ns.idFromString(room.id))
  stubs.push(stub)
  const clock = { t: FAR_FUTURE }
  await runInDurableObject(stub, (instance: DuelRoom) => {
    vi.spyOn(instance, 'now').mockImplementation(() => clock.t)
    if (rng0) vi.spyOn(instance, 'rng').mockImplementation(() => 0)
  })
  const userId = `human-${crypto.randomUUID().slice(0, 8)}`
  const profile = await repo.profiles.create({
    id: userId,
    username: userId,
    email: null,
    isGuest: false,
  })
  const host = { id: userId, username: userId, level: 1, rating: profile.rating, isGuest: false }
  const { token } = await room.create({ opts, host })
  const res = await exports.default.fetch(
    `https://x/ws/duel/${room.id}?${new URLSearchParams({ token, auth: `fake:${userId}:${userId}` })}`,
    { headers: { Upgrade: 'websocket' } },
  )
  expect(res.status).toBe(101)
  const ws = res.webSocket!
  const c: Client = { ws, msgs: [] }
  ws.addEventListener('message', (e) => {
    c.msgs.push(JSON.parse(e.data as string))
  })
  ws.accept()
  await wait()
  return { stub, clock, userId, c }
}

const send = async (s: Setup, msg: object) => {
  s.c.ws.send(JSON.stringify(msg))
  await wait()
}
const alarmAt = async (s: Setup, t: number) => {
  s.clock.t = t
  await runDurableObjectAlarm(s.stub)
  await wait()
}
const storage = <T>(s: Setup, key: string) =>
  runInDurableObject(s.stub, async (_i: DuelRoom, st) => st.storage.get<T>(key))

/** Ready → (classic: own secret) → countdown → started. */
async function start(s: Setup, secret = '1234'): Promise<void> {
  await send(s, { t: 'ready' })
  if (last(s.c, 'state')?.state.phase === 'secrets') await send(s, { t: 'secret', code: secret })
  await alarmAt(s, s.clock.t + COUNTDOWN_MS)
}

const botTimer = async (s: Setup) => (await storage<Timers>(s, 'timers'))?.bot

describe('DuelRoom bot: race', () => {
  it('counts down at once when the human is ready (the bot already is)', async () => {
    const s = await setup(botOpts('race', 2))
    const t0 = s.clock.t
    await send(s, { t: 'ready' })
    expect(of(s.c, 'countdown')).toEqual([{ t: 'countdown', startAt: t0 + COUNTDOWN_MS }])
  })

  it('schedules the bot after started and the alarm gives the human an oppMoved', async () => {
    const s = await setup(botOpts('race', 2))
    await start(s)
    const base = BOT_THINK_BASE.race[1]
    const startedAt = s.clock.t
    const at = await botTimer(s)
    expect(at).toBeGreaterThanOrEqual(startedAt + base - 2000)
    expect(at).toBeLessThanOrEqual(startedAt + base + 2500)
    await alarmAt(s, at!)
    expect(last(s.c, 'oppMoved')).toMatchObject({ t: 'oppMoved', attempts: 1 })
    const again = await botTimer(s)
    expect(again).toBeGreaterThan(at!)
  })

  it('ends the match with the human losing when the bot solves it (level 2: xp 0)', async () => {
    const s = await setup(botOpts('race', 2), true)
    await start(s)
    await alarmAt(s, (await botTimer(s))!)
    expect(last(s.c, 'ended')).toMatchObject({ outcome: 'lose', reason: 'solved', xp: 0 })
    expect(await botTimer(s)).toBeUndefined()
  })

  it('level 3 win gives 40 xp and leaves the rating alone; the game row is the human only', async () => {
    const s = await setup(botOpts('race', 3), true)
    const before = await repo.profiles.get(s.userId)
    await start(s)
    await send(s, { t: 'guess', code: '1234' })
    expect(last(s.c, 'ended')).toMatchObject({ outcome: 'win', xp: 40, rating: null })
    const after = await repo.profiles.get(s.userId)
    expect(after!.xp).toBe(before!.xp + 40)
    expect(after!.rating).toEqual(before!.rating)
    const games = await repo.games.history(s.userId, 10)
    expect(games.map((g) => g.kind)).toEqual(['bot'])
    expect(await botTimer(s)).toBeUndefined()
  })

  it('does not leak the secret in any state before the end', async () => {
    const s = await setup(botOpts('race', 2), true)
    await start(s)
    await send(s, { t: 'guess', code: '5678' })
    for (const st of of(s.c, 'state')) expect(JSON.stringify(st)).not.toContain('"1234"')
  })
})

describe('DuelRoom bot: classic', () => {
  it('arms the bot only on its turn, shortly after the human guess', async () => {
    const s = await setup(botOpts('classic', 3), true)
    await start(s)
    const first = (await storage<Match>(s, 'match'))!.firstMover
    expect(first).toBe('a')
    expect(await botTimer(s)).toBeUndefined()
    await send(s, { t: 'guess', code: '9876' })
    expect((await storage<Match>(s, 'match'))!.turn).toBe('b')
    const base = BOT_THINK_BASE.classic[2]
    const at = (await botTimer(s))!
    expect(at).toBeGreaterThanOrEqual(s.clock.t + base - 500)
    expect(at).toBeLessThanOrEqual(s.clock.t + base + 700)
  })

  it('shows the human the bot guess and verdict, then hands the turn back', async () => {
    const s = await setup(botOpts('classic', 3), true)
    await start(s, '5678')
    await send(s, { t: 'guess', code: '9876' })
    await alarmAt(s, (await botTimer(s))!)
    expect(last(s.c, 'oppMoved')).toBeDefined()
    const st = last(s.c, 'state')!.state
    expect(st.turn).toBe('a')
    expect(st.opp?.guesses).toHaveLength(1)
    expect(await botTimer(s)).toBeUndefined()
  })

  it('the bot solving the human secret ends the match (human loses, xp 0 at level 2)', async () => {
    const s = await setup(botOpts('classic', 2), true)
    await start(s, '1234')
    await send(s, { t: 'guess', code: '9876' })
    await alarmAt(s, (await botTimer(s))!)
    expect(last(s.c, 'ended')).toMatchObject({ outcome: 'lose', xp: 0 })
    expect((await storage<Secrets>(s, 'secrets'))!.a).toBe('1234')
  })
})

describe('DuelRoom bot: room timers', () => {
  it('never fires the ready or secrets timers for the bot seat', async () => {
    const s = await setup(botOpts('classic', 2), true)
    expect(await storage<Timers>(s, 'timers')).toMatchObject({ ready: expect.any(Number) })
    await send(s, { t: 'ready' })
    const t = (await storage<Timers>(s, 'timers'))!
    expect(t.ready).toBeUndefined()
    expect(t.secrets).toBeDefined()
    const bot = (await storage<Match>(s, 'match'))!.players.b!
    expect(bot).toMatchObject({ ready: true, hasSecret: true })
    // Only the human is missing: past the deadline the bot is not blamed.
    await alarmAt(s, s.clock.t + SECRETS_MS)
    expect(last(s.c, 'ended')).toMatchObject({ outcome: 'lose', reason: 'timeout' })
  })

  it('accepts a rematch on the spot and re-readies itself', async () => {
    const s = await setup(botOpts('race', 2), true)
    await start(s)
    await alarmAt(s, (await botTimer(s))!)
    await send(s, { t: 'rematch' })
    const m = (await storage<Match>(s, 'match'))!
    expect(m.phase).toBe('lobby')
    expect(m.players.b!.ready).toBe(true)
  })
})
