/** Shared helpers for the DuelRoom tests (imported by `*.test.ts` only). */
import { env as workerEnv, exports } from 'cloudflare:workers'
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { expect, vi } from 'vitest'
import type { ServerMsg } from '@bc/protocol'
import { sharedMemoryRepo } from '../adapters/repo/memory'
import { durableRoomClient, type PlayerInfo, type Room, type RoomOpts } from '../duel/roomClient'
import { COUNTDOWN_MS, type Secrets } from '../duel/types'
import type { DuelRoom } from './DuelRoom'

/** Mocked clock far ahead of real time, so a real alarm never fires on its own. */
export const FAR_FUTURE = Date.now() + 1e9
export const ns = workerEnv.DUEL as unknown as DurableObjectNamespace
export const rooms = durableRoomClient(ns)
export const repo = sharedMemoryRepo()

export const RACE: RoomOpts = { format: 'race', len: 4, zero: false, opponentKind: 'quick' }

const BADGE_XP = 50

/** XP from the matches alone: the profile's xp minus what badge tiers paid (+50 each). */
export async function gameXp(userId: string): Promise<number> {
  const xp = (await repo.profiles.get(userId))?.xp ?? 0
  const tiers = (await repo.badges.listOf(userId)).reduce((n, b) => n + b.tier, 0)
  return xp - BADGE_XP * tiers
}
export const CLASSIC: RoomOpts = { format: 'classic', len: 4, zero: false, opponentKind: 'human' }

export interface Member {
  readonly info: PlayerInfo
  readonly auth: string
}

let seq = 0
export async function member(name: string, isGuest = false): Promise<Member> {
  seq += 1
  const id = `${name}-${seq}-${crypto.randomUUID().slice(0, 8)}`
  const profile = await repo.profiles.create({ id, username: id, email: null, isGuest })
  return {
    info: { id, username: profile.username, level: 1, rating: profile.rating, isGuest },
    auth: `fake:${id}:${id}${isGuest ? ':guest' : ''}`,
  }
}

export interface Client {
  readonly ws: WebSocket
  readonly msgs: ServerMsg[]
  closed: number | null
}

const POLL_MS = 10
const UNTIL_MS = 2000

/** Polls `pred` every 10 ms until it holds; fails the test after `ms`. No fixed sleeps. */
export async function until(
  pred: () => boolean | Promise<boolean>,
  ms = UNTIL_MS,
  what = 'condition',
): Promise<void> {
  const deadline = Date.now() + ms
  while (!(await pred())) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

/** Waits until `c` has received a message of type `t` (at least `n` of them). */
export const got = (c: Client, t: ServerMsg['t'], n = 1): Promise<void> =>
  until(() => of(c, t).length >= n, UNTIL_MS, `${n}× ${t}`)

export function wsUrl(roomId: string, token: string, auth: string): string {
  const q = new URLSearchParams({ token, auth })
  return `https://x/ws/duel/${roomId}?${q.toString()}`
}

export async function connect(roomId: string, token: string, who: Member): Promise<Client> {
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
  await got(client, 'state')
  return client
}

/** Sends a raw frame and waits for the room's next message to this client. */
export async function sendRaw(c: Client, frame: string): Promise<void> {
  const before = c.msgs.length
  c.ws.send(frame)
  await until(() => c.msgs.length > before, UNTIL_MS, 'a reply')
}

/** Sends a message; every message the tests send gets at least one reply to the sender. */
export const send = (c: Client, msg: object): Promise<void> => sendRaw(c, JSON.stringify(msg))

export const of = <T extends ServerMsg['t']>(c: Client, t: T) =>
  c.msgs.filter((m): m is Extract<ServerMsg, { t: T }> => m.t === t)
export const last = <T extends ServerMsg['t']>(c: Client, t: T) => of(c, t).at(-1)

export interface Setup {
  readonly room: Room
  readonly stub: DurableObjectStub
  readonly clock: { t: number }
  readonly a: Member
  readonly b: Member
  readonly ta: string
  readonly tb: string
}

export const stubOf = (room: Room) => ns.get(ns.idFromString(room.id))

export async function useClock(stub: DurableObjectStub, clock: { t: number }): Promise<void> {
  await runInDurableObject(stub, (instance: DuelRoom) => {
    vi.spyOn(instance, 'now').mockImplementation(() => clock.t)
  })
}

export async function setup(
  opts: RoomOpts = RACE,
  room: Room = rooms.fresh(),
  inviteCode?: string,
): Promise<Setup> {
  const clock = { t: FAR_FUTURE }
  const stub = stubOf(room)
  await useClock(stub, clock)
  const a = await member('anna')
  const b = await member('boris')
  const { token: ta } = await room.create({ opts, host: a.info, inviteCode })
  const { token: tb } = await room.join({ info: b.info })
  return { room, stub, clock, a, b, ta, tb }
}

export const storage = <T>(stub: DurableObjectStub, key: string) =>
  runInDurableObject(stub, async (_i: DuelRoom, state) => state.storage.get<T>(key))

export async function alarmAt(s: Pick<Setup, 'stub' | 'clock'>, t: number): Promise<void> {
  s.clock.t = t
  await runDurableObjectAlarm(s.stub)
}

export async function startRace(s: Setup): Promise<{ ca: Client; cb: Client; secret: string }> {
  const ca = await connect(s.room.id, s.ta, s.a)
  const cb = await connect(s.room.id, s.tb, s.b)
  await send(ca, { t: 'ready' })
  await send(cb, { t: 'ready' })
  await alarmAt(s, s.clock.t + COUNTDOWN_MS)
  await got(ca, 'started')
  await got(cb, 'started')
  const secrets = await storage<Secrets>(s.stub, 'secrets')
  return { ca, cb, secret: secrets!.shared! }
}

/** A valid 4-digit code without zero that is not `secret`. */
export const otherCode = (secret: string) => (secret === '1234' ? '5678' : '1234')

const openStubs: DurableObjectStub[] = []

/** Call from `afterEach`: closes the sockets and alarms of every tracked room. */
export async function cleanup(): Promise<void> {
  for (const stub of openStubs.splice(0)) {
    await runInDurableObject(stub, async (_i: DuelRoom, state) => {
      for (const ws of state.getWebSockets()) ws.close(1000)
      await state.storage.deleteAlarm()
    })
  }
  vi.restoreAllMocks()
}
export const track = <T extends Pick<Setup, 'stub'>>(s: T): T => {
  openStubs.push(s.stub)
  return s
}
