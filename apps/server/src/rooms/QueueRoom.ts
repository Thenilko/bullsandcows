import { displayRating } from '@bc/game-core'
import { QueueClientMsg, type QueueServerMsg } from '@bc/protocol'
import { DurableObject } from 'cloudflare:workers'
import {
  SUGGEST_INVITE_MS,
  WINDOW_STEP_MS,
  dequeue,
  enqueue,
  tick,
  type QueueEntry,
  type QueueState,
} from '../duel/matchmaker'
import { durableRoomClient, type PlayerInfo, type RoomClient } from '../duel/roomClient'
import { readIdentity } from './wsAuth'

const QUEUE_KEY = 'queue'
const CLOSE_OK = 1000
const CLOSE_INTERNAL = 1011
const EMPTY: QueueState = { entries: [] }

/**
 * Quick-match lobby: a single DO named `lobby`. Sockets use the hibernation API and are
 * tagged with the user id; the queue lives in storage and the 5 s alarm is the only timer.
 *
 * Trust: `fetch` reads the identity headers set by the Worker (`forwardWithIdentity`) and
 * never anything the client controls; the Worker authenticates before forwarding.
 *
 * Test seams: `now()` and `roomClient()` are instance methods; tests replace them with
 * `vi.spyOn(instance, ...)` inside `runInDurableObject`.
 */
export class QueueRoom extends DurableObject<CloudflareBindings> {
  now(): number {
    return Date.now()
  }

  roomClient(): RoomClient {
    return durableRoomClient(this.env.DUEL as unknown as DurableObjectNamespace)
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }
    const info = readIdentity(request.headers)
    if (!info || info.isGuest) return new Response('Forbidden', { status: 403 })
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server, [info.id])
    server.serializeAttachment(info)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const info = ws.deserializeAttachment() as PlayerInfo | null
    const msg = parseJoin(data)
    if (!info || !msg) return send(ws, { t: 'error', code: 'ERR_INPUT' })
    const now = this.now()
    const entry: QueueEntry = {
      userId: info.id,
      username: info.username,
      level: info.level,
      rating: displayRating(info.rating),
      len: msg.len,
      zero: msg.zero,
      format: msg.format,
      joinedAt: now,
    }
    const queue = enqueue(await this.loadQueue(), entry)
    await this.saveQueue(queue)
    send(ws, { t: 'waiting', elapsedMs: 0, suggestInvite: false, queued: queue.entries.length })
    await this.ensureAlarm(now)
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.drop(ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.drop(ws)
  }

  async alarm(): Promise<void> {
    const now = this.now()
    const { queue, pairs } = tick(await this.loadQueue(), now)
    // Persist first: a pair is out of the queue even if room creation fails.
    await this.saveQueue(queue)
    for (const [a, b] of pairs) await this.startDuel(a, b)
    for (const e of queue.entries) {
      const elapsedMs = now - e.joinedAt
      this.sendTo(e.userId, {
        t: 'waiting',
        elapsedMs,
        suggestInvite: elapsedMs > SUGGEST_INVITE_MS,
        queued: queue.entries.length,
      })
    }
    if (queue.entries.length > 0) await this.ctx.storage.setAlarm(now + WINDOW_STEP_MS)
  }

  private async startDuel(a: QueueEntry, b: QueueEntry): Promise<void> {
    const host = this.infoOf(a.userId)
    const guest = this.infoOf(b.userId)
    try {
      if (!host || !guest) throw new Error('queued player has no open socket')
      const room = this.roomClient().fresh()
      const hostTok = await room.create({
        opts: { format: a.format, len: a.len, zero: a.zero, opponentKind: 'quick' },
        host,
      })
      const guestTok = await room.join({ info: guest })
      this.finish(a.userId, { t: 'matched', roomId: room.id, token: hostTok.token }, CLOSE_OK)
      this.finish(b.userId, { t: 'matched', roomId: room.id, token: guestTok.token }, CLOSE_OK)
    } catch (err) {
      console.error(`quick match room failed: ${err instanceof Error ? err.message : 'unknown'}`)
      const failure: QueueServerMsg = { t: 'error', code: 'ERR_INTERNAL' }
      this.finish(a.userId, failure, CLOSE_INTERNAL)
      this.finish(b.userId, failure, CLOSE_INTERNAL)
    }
  }

  private infoOf(userId: string): PlayerInfo | null {
    const ws = this.ctx.getWebSockets(userId)[0]
    return (ws?.deserializeAttachment() as PlayerInfo | null | undefined) ?? null
  }

  private sendTo(userId: string, msg: QueueServerMsg): void {
    for (const ws of this.ctx.getWebSockets(userId)) send(ws, msg)
  }

  private finish(userId: string, msg: QueueServerMsg, code: number): void {
    for (const ws of this.ctx.getWebSockets(userId)) {
      send(ws, msg)
      ws.close(code, msg.t === 'matched' ? 'matched' : 'error')
    }
  }

  private async drop(ws: WebSocket): Promise<void> {
    const info = ws.deserializeAttachment() as PlayerInfo | null
    if (!info) return
    // Another open socket of the same user keeps them queued.
    const others = this.ctx.getWebSockets(info.id).filter((s) => s !== ws)
    if (others.length > 0) return
    await this.saveQueue(dequeue(await this.loadQueue(), info.id))
  }

  private async ensureAlarm(now: number): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(now + WINDOW_STEP_MS)
    }
  }

  private async loadQueue(): Promise<QueueState> {
    return (await this.ctx.storage.get<QueueState>(QUEUE_KEY)) ?? EMPTY
  }

  private async saveQueue(q: QueueState): Promise<void> {
    await this.ctx.storage.put(QUEUE_KEY, q)
  }
}

function parseJoin(data: string | ArrayBuffer): QueueClientMsg | null {
  if (typeof data !== 'string') return null
  try {
    const parsed = QueueClientMsg.safeParse(JSON.parse(data))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function send(ws: WebSocket, msg: QueueServerMsg): void {
  try {
    ws.send(JSON.stringify(msg))
  } catch {
    // The peer is already gone; its close handler dequeues it.
  }
}
