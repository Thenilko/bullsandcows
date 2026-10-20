import { DEFAULT_RATING, isInviteCode } from '@bc/game-core'
import { BotLevelSchema, FormatSchema, LenSchema, type ErrorCode } from '@bc/protocol'
import { z } from 'zod'
import { createMatch, join } from '../duel/match'
import type { RoomInfo } from '../duel/roomClient'
import type { OpponentKind, PlayerInfo } from '../duel/types'
import { BOT_ID } from './persist'
import { initialMeta, isLive, roomStatus, type RoomState } from './state'

/** A refusal of the internal HTTP API: plain JSON `{code}` with this status. */
export interface Refusal {
  readonly status: number
  readonly code: ErrorCode
}

const NAME_MAX = 64

const PlayerInfoSchema = z.object({
  id: z.string().min(1).max(NAME_MAX),
  username: z.string().min(1).max(NAME_MAX),
  level: z.number().int().min(1),
  rating: z.object({
    rating: z.number().finite(),
    rd: z.number().finite().positive(),
    vol: z.number().finite().positive(),
  }),
  isGuest: z.boolean(),
})

export const CreateBody = z.object({
  opts: z
    .object({
      format: FormatSchema,
      len: LenSchema,
      zero: z.boolean(),
      opponentKind: z.enum(['human', 'quick', 'bot']),
      botLevel: BotLevelSchema.optional(),
    })
    .refine((o) => (o.opponentKind === 'bot') === (o.botLevel !== undefined), {
      message: 'botLevel is required for bot rooms and only for them',
    }),
  host: PlayerInfoSchema.refine((p) => p.id !== BOT_ID, { message: 'reserved id' }),
  /** Invite rooms: the code (written to the duel row). */
  inviteCode: z.string().refine(isInviteCode, { message: 'not an invite code' }).optional(),
})
export type CreateBody = z.infer<typeof CreateBody>

export const JoinBody = z.object({ info: PlayerInfoSchema })
export type JoinBody = z.infer<typeof JoinBody>

const refuse = (status: number, code: ErrorCode): Refusal => ({ status, code })

/** `human` is the internal API's name for a friend invite (unrated). */
const kindOf = (k: CreateBody['opts']['opponentKind']): OpponentKind =>
  k === 'human' ? 'friend' : k

const botInfo = (level: number): PlayerInfo => ({
  id: BOT_ID,
  username: 'bot',
  level,
  rating: DEFAULT_RATING,
  isGuest: false,
})

/**
 * A new match in this room. Allowed for an empty room and to reset one whose previous match
 * ended or expired; a live room is never replaced. Bot rooms seat the bot as b at once.
 */
export function createRoom(
  prev: RoomState | null,
  body: CreateBody,
  now: number,
  token: string,
): RoomState | Refusal {
  if (prev && isLive(prev)) return refuse(409, 'ERR_ROOM_FULL')
  const { opts, host } = body
  const created = createMatch({ ...opts, opponentKind: kindOf(opts.opponentKind) }, host, now)
  const base: RoomState = {
    match: created.match,
    secrets: created.secrets,
    tokens: { a: token, b: null },
    meta: initialMeta(now, body.inviteCode ?? null),
  }
  if (opts.botLevel === undefined) return base
  const joined = join(base.match, base.secrets, botInfo(opts.botLevel))
  if ('error' in joined) return refuse(500, 'ERR_INTERNAL')
  return { ...base, match: joined.match, secrets: joined.secrets }
}

/** Seat b for `info`; the room must be waiting for exactly that. */
export function joinRoom(st: RoomState | null, body: JoinBody, token: string): RoomState | Refusal {
  if (!st) return refuse(404, 'ERR_NOT_FOUND')
  const status = roomStatus(st)
  if (status === 'expired' || status === 'ended') return refuse(410, 'ERR_INVITE_EXPIRED')
  if (status !== 'waiting' || body.info.id === st.match.players.a.id) {
    return refuse(409, 'ERR_ROOM_FULL')
  }
  const joined = join(st.match, st.secrets, body.info)
  if ('error' in joined) return refuse(409, joined.error)
  return {
    ...st,
    match: joined.match,
    secrets: joined.secrets,
    tokens: { ...st.tokens, b: token },
  }
}

export function roomInfo(st: RoomState): RoomInfo {
  const { match: m } = st
  const host = m.players.a
  return {
    status: roomStatus(st),
    host: { id: host.id, username: host.username, level: host.level },
    settings: { format: m.format, len: m.len, zero: m.zero },
    players: m.players.b ? 2 : 1,
  }
}

export const isRefusal = (x: RoomState | Refusal): x is Refusal => 'code' in x
