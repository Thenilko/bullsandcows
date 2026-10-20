import type { Len, Rating } from '@bc/game-core'
import type { DuelFormat, ErrorCode } from '@bc/protocol'

export interface PlayerInfo {
  readonly id: string
  readonly username: string
  readonly level: number
  readonly rating: Rating
  readonly isGuest: boolean
}

export interface RoomSettings {
  readonly format: DuelFormat
  readonly len: Len
  readonly zero: boolean
}

export interface RoomOpts extends RoomSettings {
  readonly opponentKind: 'human' | 'quick' | 'bot'
  readonly botLevel?: 1 | 2 | 3 | 4
  /** Dev/test E2E only (the Worker reads it only there): the race and bot secret. */
  readonly testSecret?: string
}

export type RoomStatus = 'waiting' | 'started' | 'ended' | 'expired'

export interface RoomInfo {
  readonly status: RoomStatus
  readonly host: { readonly id: string; readonly username: string; readonly level: number }
  readonly settings: RoomSettings
  readonly players: number
}

/** A room the DO refused to serve; `code` is the API error to answer with. */
export class RoomError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
    this.name = 'RoomError'
  }
}

/** One duel room, addressed by id. The DO speaks plain JSON, not the API envelope. */
export interface Room {
  /** `DurableObjectId.toString()`, the id the WebSocket path uses. */
  readonly id: string
  /** POST /create */
  create(req: { opts: RoomOpts; host: PlayerInfo; inviteCode?: string }): Promise<{ token: string }>
  /** POST /join; throws `RoomError` for 404/409/410 */
  join(req: { info: PlayerInfo }): Promise<{ token: string }>
  /** GET /info; null when the room does not exist (404) */
  info(): Promise<RoomInfo | null>
}

export interface RoomClient {
  /** Room for an invite code: `idFromName('invite:' + code)`. */
  invite(code: string): Room
  /** A fresh room: `newUniqueId()`. */
  fresh(): Room
}

const JOIN_ERRORS: Readonly<Record<number, ErrorCode>> = {
  404: 'ERR_NOT_FOUND',
  409: 'ERR_ROOM_FULL',
  410: 'ERR_INVITE_EXPIRED',
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

async function readToken(res: Response, what: string): Promise<{ token: string }> {
  const body = (await res.json()) as { token?: unknown }
  if (typeof body.token !== 'string') throw new Error(`room ${what}: no token in response`)
  return { token: body.token }
}

/** Production client over the `DUEL` namespace. */
export function durableRoomClient(ns: DurableObjectNamespace): RoomClient {
  const wrap = (id: DurableObjectId): Room => {
    const stub = ns.get(id)
    return {
      id: id.toString(),
      async create(req) {
        const res = await stub.fetch('https://room/create', post(req))
        if (!res.ok) throw new Error(`room create failed: ${res.status}`)
        return readToken(res, 'create')
      },
      async join(req) {
        const res = await stub.fetch('https://room/join', post(req))
        const code = JOIN_ERRORS[res.status]
        if (code) throw new RoomError(code)
        if (!res.ok) throw new Error(`room join failed: ${res.status}`)
        return readToken(res, 'join')
      },
      async info() {
        const res = await stub.fetch('https://room/info')
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`room info failed: ${res.status}`)
        return (await res.json()) as RoomInfo
      },
    }
  }
  return {
    invite: (code) => wrap(ns.idFromName(`invite:${code}`)),
    fresh: () => wrap(ns.newUniqueId()),
  }
}
