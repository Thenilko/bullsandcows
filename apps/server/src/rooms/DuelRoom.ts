import type { ErrorCode } from '@bc/protocol'
import { DurableObject } from 'cloudflare:workers'
import type { Emit } from '../duel/types'
import { makeRepo } from '../adapters/repo'
import { nextDueAt } from '../duel/expire'
import { markDisconnected, markReconnected } from '../duel/match'
import type { Match, Seat } from '../duel/types'
import { parseEnv, type Env } from '../env'
import type { Profile, RepoHandle } from '../ports/repo'
import { advance, fromStep, isAbandoned, type Advanced } from './lifecycle'
import { acceptsRematch, applyClient, parseClient, refreshPlayers, rematch } from './messages'
import { BOT_ID, type EarnedByUser } from './persist'
import { attemptWrite, claimResult, earliestRetry, pendingKey, retryDue } from './results'
import {
  CreateBody,
  JoinBody,
  createRoom,
  isRefusal,
  joinRoom,
  roomInfo,
  type Refusal,
} from './roomHttp'
import {
  CLOSE,
  broadcastState,
  closeAll,
  closeSeat,
  hasOtherOpen,
  route,
  send,
  tagOf,
} from './sockets'
import type { PendingResult, RoomState } from './state'
import { nextAlarm, roomTimers } from './timers'

const KEYS = ['match', 'secrets', 'tokens', 'meta'] as const
/** Never re-arm closer than this, so a stuck deadline cannot spin the alarm. */
const MIN_ALARM_GAP_MS = 250

const json = (body: unknown, status = 200): Response => Response.json(body, { status })
const refusal = (r: Refusal): Response => json({ code: r.code }, r.status)

/** Constant-time comparison of two seat tokens. */
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The seat whose token matches AND whose player is the authenticated user. */
function seatFor(st: RoomState, token: string | null, userId: string): Seat | null {
  if (!token) return null
  const seats: readonly Seat[] = ['a', 'b']
  const seat = seats.find((s) => {
    const t = st.tokens[s]
    return t !== null && sameToken(t, token)
  })
  return seat && st.match.players[seat]?.id === userId ? seat : null
}

/**
 * One duel (race, classic or bot) as a Durable Object with hibernating WebSockets.
 *
 * Internal HTTP (called only by the Worker, never reachable from outside):
 * `POST /create`, `POST /join`, `GET /info` (plain JSON, see `duel/roomClient.ts`) and
 * `GET /ws?token=` (the upgrade). Trust: the identity headers on `/ws` are set by the Worker
 * after it verified the access token (`wsAuth.ts`); the client cannot reach this object
 * directly, and every time used here is the room's own clock, never the client's.
 *
 * Test seams: `now()`, `rng()` and `acceptsTestSecret()` are instance methods.
 */
export class DuelRoom extends DurableObject<CloudflareBindings> {
  private parsedEnv: Env | null = null

  now(): number {
    return Date.now()
  }

  rng(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
  }

  /** `opts.testSecret` of `/create` is honoured only in dev and test. */
  acceptsTestSecret(): boolean {
    const { ENVIRONMENT } = this.env_()
    return ENVIRONMENT === 'dev' || ENVIRONMENT === 'test'
  }

  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    switch (`${req.method} ${pathname}`) {
      case 'POST /create':
        return this.handleCreate(req)
      case 'POST /join':
        return this.handleJoin(req)
      case 'GET /info':
        return this.handleInfo()
      case 'GET /ws':
        return this.handleConnect(req)
      default:
        return json({ code: 'ERR_NOT_FOUND' }, 404)
    }
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const tag = tagOf(ws)
    if (!tag) return
    const msg = parseClient(data)
    if (typeof msg === 'string') return send(ws, { t: 'error', code: msg })
    const profiles = msg.t === 'rematch' ? await this.profilesForRematch(tag.seat) : {}
    const st = await this.load()
    if (!st || st.match.players[tag.seat]?.id !== tag.userId) {
      return send(ws, { t: 'error', code: 'ERR_NOT_FOUND' })
    }
    const now = this.now()
    const before = advance(st, now, () => this.rng())
    const result =
      msg.t === 'rematch'
        ? this.rematchWith(before.state, tag.seat, now, profiles)
        : stepOrError(
            before.state,
            applyClient(before.state, tag.seat, msg, now, () => this.rng()),
          )
    if (typeof result === 'string') {
      await this.commit(st, before, now)
      return send(ws, { t: 'error', code: result })
    }
    const after = advance(result.state, now, () => this.rng())
    const events = [...before.events, ...result.events, ...after.events]
    await this.commit(st, { state: after.state, events }, now)
  }

  /**
   * Profiles only when this `rematch` would accept an offer (the only case that needs them),
   * so offers and stray frames never open a database client. Loaded before the state the
   * message is applied to, so no external I/O sits between that load and its save.
   */
  private async profilesForRematch(seat: Seat): Promise<Readonly<Record<string, Profile>>> {
    const st = await this.load()
    if (!st) return {}
    const m = advance(st, this.now(), () => this.rng()).state.match
    const accepting = m.phase === 'ended' && !isAbandoned(m) && acceptsRematch(m, seat, this.now())
    return accepting ? this.loadProfiles(m) : {}
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws)
  }

  async alarm(): Promise<void> {
    const now = this.now()
    await retryDue(this.ctx.storage, () => this.repo(), now)
    const st = await this.load()
    if (!st) return
    await this.commit(
      st,
      advance(st, now, () => this.rng()),
      now,
    )
  }

  // ── internal HTTP ──────────────────────────────────────────────────────────

  private async handleCreate(req: Request): Promise<Response> {
    const body = CreateBody.safeParse(await readJson(req))
    if (!body.success) return json({ code: 'ERR_INPUT' }, 400)
    const now = this.now()
    const prev = await this.current(now)
    const created = createRoom(prev, body.data, now, crypto.randomUUID(), this.acceptsTestSecret())
    if (isRefusal(created)) return refusal(created)
    if (prev) closeAll(this.ctx, CLOSE.reset, 'reset')
    await this.commit(
      null,
      advance(created, now, () => this.rng()),
      now,
    )
    return json({ token: created.tokens.a })
  }

  private async handleJoin(req: Request): Promise<Response> {
    const body = JoinBody.safeParse(await readJson(req))
    if (!body.success) return json({ code: 'ERR_INPUT' }, 400)
    const now = this.now()
    const st = await this.current(now)
    const joined = joinRoom(st, body.data, crypto.randomUUID())
    if (isRefusal(joined)) return refusal(joined)
    await this.commit(
      st,
      advance(joined, now, () => this.rng()),
      now,
    )
    return json({ token: joined.tokens.b })
  }

  private async handleInfo(): Promise<Response> {
    const st = await this.current(this.now())
    return st ? json(roomInfo(st)) : json({ code: 'ERR_NOT_FOUND' }, 404)
  }

  /** Loads the room and brings it up to `now` (persisting whatever became due). */
  private async current(now: number): Promise<RoomState | null> {
    const st = await this.load()
    return st
      ? this.commit(
          st,
          advance(st, now, () => this.rng()),
          now,
        )
      : null
  }

  // ── sockets ────────────────────────────────────────────────────────────────

  private async handleConnect(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response(null, { status: 426 })
    const userId = req.headers.get('x-user-id')
    if (!userId) return new Response(null, { status: 403 })
    const now = this.now()
    const st = await this.current(now)
    if (!st) return new Response(null, { status: 404 })
    if (st.meta.expired) return new Response(null, { status: 410 })
    const seat = seatFor(st, new URL(req.url).searchParams.get('token'), userId)
    if (!seat) return new Response(null, { status: 403 })
    closeSeat(this.ctx, seat, CLOSE.replaced, 'replaced')
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server, [seat])
    server.serializeAttachment({ seat, userId })
    const back = st.match.players[seat]?.connected
      ? null
      : fromStep(st, markReconnected(st.match, st.secrets, seat))
    await this.commit(st, back ?? { state: st, events: [] }, now, true)
    return new Response(null, { status: 101, webSocket: client })
  }

  private async dropSocket(ws: WebSocket): Promise<void> {
    const tag = tagOf(ws)
    if (!tag || hasOtherOpen(this.ctx, tag.seat, ws)) return
    const st = await this.load()
    if (!st || st.match.players[tag.seat]?.id !== tag.userId) return
    const now = this.now()
    const cur = advance(st, now, () => this.rng())
    const gone = fromStep(
      cur.state,
      markDisconnected(cur.state.match, cur.state.secrets, tag.seat, now),
    )
    const events = [...cur.events, ...(gone?.events ?? [])]
    await this.commit(st, { state: gone?.state ?? cur.state, events }, now)
  }

  // ── state, alarm, result ───────────────────────────────────────────────────

  private async load(): Promise<RoomState | null> {
    const got = await this.ctx.storage.get<unknown>([...KEYS])
    const match = got.get('match') as RoomState['match'] | undefined
    if (!match) return null
    return {
      match,
      secrets: got.get('secrets') as RoomState['secrets'],
      tokens: got.get('tokens') as RoomState['tokens'],
      meta: got.get('meta') as RoomState['meta'],
    }
  }

  /**
   * Persists `adv.state`, re-arms the alarm, sends `state` (per seat) when the match changed
   * and routes the events. A newly ended match has its result claimed (flag + pending record,
   * in the same storage write) and then written; its `ended` events wait for that write, so
   * they can carry the badges it earned (a failed write sends them without).
   */
  private async commit(
    prev: RoomState | null,
    adv: Advanced,
    now: number,
    forceState = false,
  ): Promise<RoomState> {
    const ended = adv.state.match.phase === 'ended' && !adv.state.meta.resultRecorded
    const recorded = ended
      ? { ...adv.state, meta: { ...adv.state.meta, resultRecorded: true } }
      : adv.state
    const claimed = ended ? claimResult(recorded, now) : null
    const st = claimed ? withGameIds(recorded, claimed) : recorded
    const pending = claimed ? { [pendingKey(claimed)]: claimed } : {}
    await this.ctx.storage.put({ ...st, timers: roomTimers(st.match, st.meta), ...pending })
    await this.arm(st, now)
    if (prev && !prev.meta.expired && st.meta.expired) closeAll(this.ctx, CLOSE.expired, 'expired')
    if (forceState || prev?.match !== st.match) broadcastState(this.ctx, st)
    const held = claimed ? adv.events.filter(isEnded) : []
    route(
      this.ctx,
      adv.events.filter((e) => !held.includes(e)),
    )
    if (claimed) {
      const badges = await this.writeClaimed(claimed, now)
      route(this.ctx, withResult(st.match, held, claimed, badges))
    }
    return st
  }

  private async arm(st: RoomState, now: number): Promise<void> {
    const times = [
      nextAlarm(roomTimers(st.match, st.meta)),
      nextDueAt(st.match),
      await earliestRetry(this.ctx.storage),
    ].filter((t): t is number => t !== null)
    if (times.length === 0) return this.ctx.storage.deleteAlarm()
    await this.ctx.storage.setAlarm(Math.max(Math.min(...times), now + MIN_ALARM_GAP_MS))
  }

  /**
   * The result is final when first written: the room handles one message at a time with its
   * own monotonic clock, so a late race solve stamped earlier than the win cannot arrive after
   * it in practice; if it did, the machine still emits a corrected `ended`, but the stored
   * result is not rewritten.
   */
  private async writeClaimed(claimed: PendingResult, now: number): Promise<EarnedByUser | null> {
    const badges = await attemptWrite(this.ctx.storage, () => this.repo(), claimed, now)
    const st = await this.load()
    if (st) await this.arm(st, now)
    return badges
  }

  /** The repository for one use; callers close it. Test seam. */
  repo(): RepoHandle {
    return makeRepo(this.env_())
  }

  /** Current profiles of the humans in `m`, for accepting a rematch. */
  private async loadProfiles(m: Match): Promise<Readonly<Record<string, Profile>>> {
    const ids = [m.players.a.id, m.players.b?.id].filter(
      (id): id is string => !!id && id !== BOT_ID,
    )
    const repo = this.repo()
    try {
      const found = await Promise.all(ids.map((id) => repo.profiles.get(id)))
      return Object.fromEntries(found.flatMap((p) => (p ? [[p.id, p]] : [])))
    } finally {
      await repo.close()
    }
  }

  private rematchWith(
    st: RoomState,
    seat: Seat,
    now: number,
    profiles: Readonly<Record<string, Profile>>,
  ): Advanced | ErrorCode {
    const accepting = st.match.phase === 'ended' && acceptsRematch(st.match, seat, now)
    const match = accepting ? refreshPlayers(st.match, profiles) : st.match
    return rematch({ ...st, match }, seat, now)
  }

  private env_(): Env {
    this.parsedEnv ??= parseEnv(this.env)
    return this.parsedEnv
  }
}

const stepOrError = (st: RoomState, step: Parameters<typeof fromStep>[1]): Advanced | ErrorCode =>
  'error' in step ? step.error : fromStep(st, step)!

const isEnded = (e: Emit): boolean => e.msg.t === 'ended'

/** The claimed result's game row ids go to the meta, so a reloaded client's snapshot carries them. */
const withGameIds = (st: RoomState, claimed: PendingResult): RoomState => ({
  ...st,
  meta: { ...st.meta, gameIds: { a: claimed.ids.gameA, b: claimed.ids.gameB } },
})

/**
 * The seat's `ended` with its game row id and, when the result was written, the badges and
 * pasture rewards its player earned.
 */
function withResult(
  m: Match,
  held: readonly Emit[],
  claimed: PendingResult,
  badges: EarnedByUser | null,
): Emit[] {
  return held.map((e) => {
    if (e.msg.t !== 'ended' || e.to === 'both') return e
    const gameId = e.to === 'a' ? claimed.ids.gameA : claimed.ids.gameB
    const earned = badges?.[m.players[e.to]?.id ?? '']
    const newBadges = earned?.newBadges ?? []
    const newUnlocks = earned?.newUnlocks ?? []
    const msg = {
      ...e.msg,
      gameId,
      ...(newBadges.length > 0 && { newBadges: [...newBadges] }),
      ...(newUnlocks.length > 0 && { newUnlocks: [...newUnlocks] }),
    }
    return { ...e, msg }
  })
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
