import { inviteCode, isInviteCode, levelFromXp } from '@bc/game-core'
import {
  CreateBotBody,
  CreateInviteBody,
  type BotRoomDto,
  type InviteDto,
  type InviteInfoDto,
  type JoinInviteDto,
} from '@bc/protocol'
import { Hono, type Context } from 'hono'
import { ensureProfile } from '../../auth/profiles'
import {
  durableRoomClient,
  RoomError,
  type PlayerInfo,
  type Room,
  type RoomClient,
  type RoomInfo,
} from '../../duel/roomClient'
import { AppError } from '../errors'
import { requireUser } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import { testSecret } from '../testSecret'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const CREATE_LIMIT = { max: 20, windowMs: 60_000, name: 'rooms' } as const
const CODE_ATTEMPTS = 5
const LIVE: readonly RoomInfo['status'][] = ['waiting', 'started']

const rooms = (c: Context<AppEnv>): RoomClient => {
  const deps = c.get('deps')
  return deps.rooms ?? durableRoomClient(deps.env.DUEL)
}

const limitCreation = () => rateLimit({ ...CREATE_LIMIT, key: (c) => c.get('user').id })

/** The caller as a room participant; the profile is created on first use. */
async function playerInfo(c: Context<AppEnv>): Promise<PlayerInfo> {
  const user = c.get('user')
  const profile = await ensureProfile(c.get('deps').repo, user)
  return {
    id: profile.id,
    username: profile.username,
    level: levelFromXp(profile.xp),
    rating: profile.rating,
    isGuest: user.isGuest,
    avatarSpecies: profile.avatarSpecies,
  }
}

const randomUnit = (): number => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32

/** Picks a code whose room is not live, so a running duel is never hijacked. */
async function freeInviteRoom(client: RoomClient): Promise<{ code: string; room: Room }> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = inviteCode(randomUnit)
    const room = client.invite(code)
    const info = await room.info()
    if (!info || !LIVE.includes(info.status)) return { code, room }
  }
  throw new Error('no free invite code')
}

/** Dev/test E2E only: the room's race secret (and the bot's classic secret). */
const withTestSecret = (secret: string | undefined): { testSecret?: string } =>
  secret === undefined ? {} : { testSecret: secret }

function codeParam(c: Context<AppEnv>): string {
  const code = (c.req.param('code') ?? '').toUpperCase()
  if (!isInviteCode(code)) throw new AppError('ERR_NOT_FOUND', 404)
  return code
}

const ERROR_STATUS = {
  ERR_ROOM_FULL: 409,
  ERR_INVITE_EXPIRED: 410,
  ERR_NOT_FOUND: 404,
} as const

async function mapRoomError<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (err) {
    if (err instanceof RoomError) {
      const status = ERROR_STATUS[err.code as keyof typeof ERROR_STATUS] ?? 400
      throw new AppError(err.code, status)
    }
    throw err
  }
}

/** The live room behind a code, or the matching API error. */
async function liveInvite(room: Room): Promise<RoomInfo & { status: 'waiting' | 'started' }> {
  const info = await room.info()
  if (!info) throw new AppError('ERR_NOT_FOUND', 404)
  if (info.status === 'waiting' || info.status === 'started')
    return { ...info, status: info.status }
  throw new AppError('ERR_INVITE_EXPIRED', 410)
}

export function duelsRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireUser())

  routes.post('/invites', limitCreation(), validate('json', CreateInviteBody), async (c) => {
    const { len, zero, format } = c.req.valid('json')
    const secret = testSecret(c, len, zero)
    const host = await playerInfo(c)
    const { code, room } = await freeInviteRoom(rooms(c))
    const { token } = await room.create({
      opts: { format, len, zero, opponentKind: 'human', ...withTestSecret(secret) },
      host,
      inviteCode: code,
    })
    const origin = c.get('deps').env.APP_ORIGIN.replace(/\/+$/, '')
    const dto: InviteDto = { code, url: `${origin}/d/${code}`, roomId: room.id, token }
    return ok(c, dto, 201)
  })

  routes.get('/invites/:code', async (c) => {
    const info = await liveInvite(rooms(c).invite(codeParam(c)))
    const dto: InviteInfoDto = {
      status: info.status,
      host: {
        username: info.host.username,
        level: info.host.level,
        avatarSpecies: info.host.avatarSpecies ?? 'bull',
      },
      settings: info.settings,
    }
    return ok(c, dto)
  })

  routes.post('/invites/:code/join', async (c) => {
    const room = rooms(c).invite(codeParam(c))
    const info = await liveInvite(room)
    const guest = await playerInfo(c)
    if (info.host.id === guest.id) throw new AppError('ERR_INPUT', 400)
    const { token } = await mapRoomError(() => room.join({ info: guest }))
    const dto: JoinInviteDto = { roomId: room.id, token }
    return ok(c, dto)
  })

  return routes
}

export function botsRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireUser())

  routes.post('/', limitCreation(), validate('json', CreateBotBody), async (c) => {
    const { len, zero, format, level } = c.req.valid('json')
    const secret = testSecret(c, len, zero)
    const host = await playerInfo(c)
    const room = rooms(c).fresh()
    const opts = { format, len, zero, opponentKind: 'bot', botLevel: level, ...withTestSecret(secret) } as const
    const { token } = await room.create({ opts, host })
    const dto: BotRoomDto = { roomId: room.id, token }
    return ok(c, dto, 201)
  })

  return routes
}
