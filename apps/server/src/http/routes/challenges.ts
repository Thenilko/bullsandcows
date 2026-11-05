import { levelFromXp } from '@bc/game-core'
import {
  CHALLENGE_TTL_MS,
  CreateChallengeBody,
  type ChallengeDto,
  type ChallengeStatusDto,
  type CreatedChallengeDto,
  type IncomingChallengesDto,
  type JoinInviteDto,
} from '@bc/protocol'
import { Hono, type Context } from 'hono'
import { isOnline, isPlaying } from '../../admin/online'
import type { ChallengeRow, ChallengeStatus, IncomingChallengeRow } from '../../ports/repo'
import { AppError } from '../errors'
import { requireMember } from '../middleware/auth'
import { ok } from '../respond'
import { testSecret } from '../testSecret'
import type { AppEnv } from '../types'
import { validate } from '../validate'
import {
  freeInviteRoom,
  limitCreation,
  liveInvite,
  mapRoomError,
  playerInfo,
  rooms,
  withTestSecret,
} from './duels'

/** The inbox card shows at most this many at once. */
const INCOMING_LIMIT = 3
/** Room answers that mean the duel behind the challenge is gone. */
const GONE: readonly string[] = ['ERR_NOT_FOUND', 'ERR_INVITE_EXPIRED']

/** The status every reader sees: a pending row past its expiry is expired. */
const statusAt = (row: ChallengeRow, now: number): ChallengeStatus =>
  row.status === 'pending' && row.expiresAt <= now ? 'expired' : row.status

const toDto = (row: IncomingChallengeRow): ChallengeDto => ({
  id: row.id,
  from: {
    username: row.fromUsername,
    level: levelFromXp(row.fromXp),
    avatarSpecies: row.fromAvatarSpecies,
  },
  settings: { format: row.format, len: row.len, zero: row.zero },
  expiresAt: row.expiresAt,
  ...(row.laterAt !== null ? { later: true } : {}),
})

/** The challenge if the caller is its sender or target (`side` narrows it); 404 otherwise. */
async function challengeOf(
  c: Context<AppEnv>,
  side: 'from' | 'to' | 'either',
): Promise<ChallengeRow> {
  const row = await c.get('deps').repo.challenges.get(c.req.param('id') ?? '')
  const me = c.get('user').id
  const mine =
    row !== null && ((side !== 'to' && row.fromId === me) || (side !== 'from' && row.toId === me))
  if (!row || !mine) throw new AppError('ERR_NOT_FOUND', 404)
  return row
}

/** A challenge that can still be answered; an overdue one is marked expired on the way. */
async function openChallenge(c: Context<AppEnv>, side: 'from' | 'to'): Promise<ChallengeRow> {
  const { repo, clock } = c.get('deps')
  const row = await challengeOf(c, side)
  const status = statusAt(row, clock.now())
  if (status === 'expired') {
    await repo.challenges.settle(row.id, 'expired')
    throw new AppError('ERR_INVITE_EXPIRED', 410)
  }
  if (status !== 'pending') throw new AppError('ERR_FINISHED', 409)
  return row
}

/** Validates the target: an existing member other than the caller, in the app right now. */
async function targetOf(c: Context<AppEnv>, to: string) {
  const { repo, clock } = c.get('deps')
  if (to === c.get('user').id) throw new AppError('ERR_INPUT', 400)
  const target = await repo.profiles.get(to)
  if (!target || target.isGuest) throw new AppError('ERR_NOT_FOUND', 404)
  if (!isOnline(await repo.profiles.lastSeen(to), clock.now()))
    throw new AppError('ERR_OFFLINE', 409)
  return target
}

/** „Предизвикай“: a live duel offered to an online member from the leaderboard (members only). */
export function challengesRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireMember())

  routes.post('/', limitCreation(), validate('json', CreateChallengeBody), async (c) => {
    const { to, len, zero, format } = c.req.valid('json')
    const { repo, clock, env } = c.get('deps')
    const target = await targetOf(c, to)
    const secret = testSecret(c, len, zero)
    const host = await playerInfo(c)
    const { code, room } = await freeInviteRoom(rooms(c))
    const { token } = await room.create({
      opts: { format, len, zero, opponentKind: 'human', ...withTestSecret(secret) },
      host,
      inviteCode: code,
    })
    // A new challenge to the same player replaces the open one.
    await repo.challenges.cancelBetween(host.id, target.id)
    const now = clock.now()
    const row = await repo.challenges.create(
      {
        fromId: host.id,
        toId: target.id,
        inviteCode: code,
        format,
        len,
        zero,
        expiresAt: now + CHALLENGE_TTL_MS,
      },
      now,
    )
    const origin = env.APP_ORIGIN.replace(/\/+$/, '')
    const dto: CreatedChallengeDto = {
      code,
      url: `${origin}/d/${code}`,
      roomId: room.id,
      token,
      challengeId: row.id,
      toUsername: target.username,
    }
    return ok(c, dto, 201)
  })

  routes.get('/incoming', async (c) => {
    const { repo, clock } = c.get('deps')
    const rows = await repo.challenges.incoming(c.get('user').id, clock.now(), INCOMING_LIMIT)
    const dto: IncomingChallengesDto = { challenges: rows.map(toDto) }
    return ok(c, dto)
  })

  routes.get('/:id', async (c) => {
    const { repo, clock } = c.get('deps')
    const row = await challengeOf(c, 'either')
    const now = clock.now()
    const status = statusAt(row, now)
    if (status !== 'pending') return ok(c, { status } satisfies ChallengeStatusDto)
    const seen = await repo.profiles.presence(row.toId)
    const dto: ChallengeStatusDto = {
      status,
      ...(row.laterAt !== null ? { later: true } : {}),
      ...(seen && isPlaying(seen.at, seen.activity, now) ? { playing: true } : {}),
    }
    return ok(c, dto)
  })

  routes.post('/:id/accept', async (c) => {
    const { repo } = c.get('deps')
    const row = await openChallenge(c, 'to')
    const room = rooms(c).invite(row.inviteCode)
    const guest = await playerInfo(c)
    try {
      await liveInvite(room)
      const { token } = await mapRoomError(() => room.join({ info: guest }))
      await repo.challenges.settle(row.id, 'accepted')
      const dto: JoinInviteDto = { roomId: room.id, token }
      return ok(c, dto)
    } catch (err) {
      if (!(err instanceof AppError) || !GONE.includes(err.code)) throw err
      await repo.challenges.settle(row.id, 'expired')
      throw new AppError('ERR_INVITE_EXPIRED', 410)
    }
  })

  // „След играта“: the target is in a game and will answer once it is over; the challenge stays open that
  // long. Only the first answer moves the expiry, so it cannot be kept open past the invite room.
  routes.post('/:id/later', async (c) => {
    const { repo, clock } = c.get('deps')
    const row = await openChallenge(c, 'to')
    if (row.laterAt === null) {
      const now = clock.now()
      const expiresAt = Math.max(row.expiresAt, now + CHALLENGE_TTL_MS)
      if (!(await repo.challenges.later(row.id, now, expiresAt)))
        throw new AppError('ERR_FINISHED', 409)
    }
    const dto: ChallengeStatusDto = { status: 'pending', later: true }
    return ok(c, dto)
  })

  routes.post('/:id/decline', async (c) => {
    const row = await openChallenge(c, 'to')
    await c.get('deps').repo.challenges.settle(row.id, 'declined')
    const dto: ChallengeStatusDto = { status: 'declined' }
    return ok(c, dto)
  })

  routes.post('/:id/cancel', async (c) => {
    const row = await openChallenge(c, 'from')
    await c.get('deps').repo.challenges.settle(row.id, 'cancelled')
    const dto: ChallengeStatusDto = { status: 'cancelled' }
    return ok(c, dto)
  })

  return routes
}
