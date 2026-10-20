import type { ServerMsg } from '@bc/protocol'
import type { Emit, Match, Secrets, Seat } from '../duel/types'
import { snapshot } from './snapshot'

/** Close codes the room uses (4000–4999 are free for applications). */
export const CLOSE = {
  replaced: 4001,
  expired: 4010,
  reset: 4011,
} as const

/** What a hibernated socket remembers about itself. */
export interface SocketTag {
  readonly seat: Seat
  readonly userId: string
}

const SEATS: readonly Seat[] = ['a', 'b']
const OPEN = 1

export function tagOf(ws: WebSocket): SocketTag | null {
  const tag = ws.deserializeAttachment() as SocketTag | null
  return tag && (tag.seat === 'a' || tag.seat === 'b') ? tag : null
}

/** Sends to an open socket; a socket that is already closing simply misses the message. */
export function send(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === OPEN) ws.send(JSON.stringify(msg))
}

const socketsOf = (ctx: DurableObjectState, seat: Seat): WebSocket[] => ctx.getWebSockets(seat)

export function sendTo(ctx: DurableObjectState, seat: Seat, msg: ServerMsg): void {
  for (const ws of socketsOf(ctx, seat)) send(ws, msg)
}

/** Each connected seat gets its own `state` (never the other side's secret before the end). */
export function broadcastState(ctx: DurableObjectState, m: Match, s: Secrets): void {
  for (const seat of SEATS) {
    if (m.players[seat]) sendTo(ctx, seat, { t: 'state', state: snapshot(m, seat, s) })
  }
}

export function route(ctx: DurableObjectState, events: readonly Emit[]): void {
  for (const e of events) {
    for (const seat of e.to === 'both' ? SEATS : [e.to]) sendTo(ctx, seat, e.msg)
  }
}

/** Whether `seat` still has an open socket other than `except`. */
export function hasOtherOpen(ctx: DurableObjectState, seat: Seat, except: WebSocket): boolean {
  return socketsOf(ctx, seat).some((ws) => ws !== except && ws.readyState === OPEN)
}

export function closeSeat(ctx: DurableObjectState, seat: Seat, code: number, reason: string): void {
  for (const ws of socketsOf(ctx, seat)) if (ws.readyState === OPEN) ws.close(code, reason)
}

export function closeAll(ctx: DurableObjectState, code: number, reason: string): void {
  for (const ws of ctx.getWebSockets()) if (ws.readyState === OPEN) ws.close(code, reason)
}
