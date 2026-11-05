import {
  RoomError,
  type PlayerInfo,
  type Room,
  type RoomClient,
  type RoomInfo,
  type RoomOpts,
} from '../../duel/roomClient'

export interface FakeState {
  opts?: RoomOpts
  host?: PlayerInfo
  inviteCode?: string
  joined: PlayerInfo[]
  status: RoomInfo['status']
}

/** In-memory rooms: invite rooms by code, fresh rooms by counter. */
export function fakeRooms() {
  const rooms = new Map<string, FakeState>()
  let seq = 0
  const make = (key: string): Room => ({
    id: `room-${key}`,
    async create({ opts, host, inviteCode }) {
      rooms.set(key, { opts, host, inviteCode, joined: [], status: 'waiting' })
      return { token: `tok-host-${key}` }
    },
    async join({ info }) {
      const r = rooms.get(key)
      if (!r) throw new RoomError('ERR_NOT_FOUND')
      if (r.status === 'expired') throw new RoomError('ERR_INVITE_EXPIRED')
      if (r.joined.length >= 1) throw new RoomError('ERR_ROOM_FULL')
      r.joined.push(info)
      r.status = 'started'
      return { token: `tok-${info.id}` }
    },
    async info() {
      const r = rooms.get(key)
      if (!r?.opts || !r.host) return null
      const { format, len, zero } = r.opts
      return {
        status: r.status,
        host: { id: r.host.id, username: r.host.username, level: r.host.level },
        settings: { format, len, zero },
        players: 1 + r.joined.length,
      }
    },
  })
  const client: RoomClient = {
    invite: (code) => make(`invite:${code}`),
    fresh: () => make(`fresh:${(seq += 1)}`),
  }
  return { client, rooms }
}
