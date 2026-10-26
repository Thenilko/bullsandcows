import { dailyNumber, inviteCode, levelFromXp, rankKeyForLevel, sofiaDate } from '@bc/game-core'
import {
  FARM_MAX_MEMBERS,
  type FarmDto,
  type FarmJoinedDto,
  type FarmMemberDto,
  type MyNudgeDto,
  type NewBadgeDto,
} from '@bc/protocol'
import { ensureProfile } from '../auth/profiles'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import type { FarmRow, Profile, Repo } from '../ports/repo'
import { recomputeBadges } from '../stats/badgeService'
import { bestToday, mayDo, weekMonday, weekPoints, type FarmAction } from './model'

/** Tries for a free invite code before giving up (32^5 codes: a clash is rare, two in a row rarer still). */
const CODE_TRIES = 8

export interface FarmDeps {
  readonly repo: Repo
  readonly clock: Clock
  /** Random source for invite codes (tests pass a fixed one). */
  readonly rng?: () => number
}

interface Mine {
  readonly farm: FarmRow
  readonly role: 'owner' | 'member'
}

/**
 * „Семейна ферма“ (spec ЧАСТ 2): one farm per player, at most `FARM_MAX_MEMBERS`, guests never (the routes
 * refuse them; the service checks again). Days are Sofia days.
 */
export class FarmService {
  constructor(private readonly deps: FarmDeps) {}

  private get repo(): Repo {
    return this.deps.repo
  }

  private today(): string {
    return sofiaDate(new Date(this.deps.clock.now()))
  }

  private newCode(): string {
    return inviteCode(this.deps.rng)
  }

  private assertMember(user: AuthUser): void {
    if (user.isGuest) throw new AppError('ERR_GUEST', 403)
  }

  private async mine(user: AuthUser, action: FarmAction = 'view'): Promise<Mine> {
    this.assertMember(user)
    const found = await this.repo.farms.membershipOf(user.id)
    if (!found) throw new AppError('ERR_NOT_FOUND', 404)
    const role = found.farm.ownerId === user.id ? 'owner' : 'member'
    if (!mayDo(role, action)) throw new AppError('ERR_FORBIDDEN', 403)
    return { farm: found.farm, role }
  }

  private async badges(userId: string): Promise<NewBadgeDto[]> {
    return recomputeBadges(this.repo, {
      userId,
      scope: 'share',
      now: this.deps.clock.now(),
      payXp: true,
    })
  }

  /** `POST /api/farms`: the farm, its owner as the first member and a fresh code. */
  async create(user: AuthUser, name: string): Promise<FarmJoinedDto> {
    this.assertMember(user)
    await ensureProfile(this.repo, user)
    const now = this.deps.clock.now()
    for (let i = 0; i < CODE_TRIES; i++) {
      const made = await this.repo.farms.create(
        { name, inviteCode: this.newCode(), ownerId: user.id },
        now,
      )
      if (made === 'already') throw new AppError('ERR_ALREADY_IN_FARM', 409)
      if (made) {
        const newBadges = await this.badges(user.id)
        return { farm: await this.view(user, { farm: made, role: 'owner' }), newBadges }
      }
    }
    throw new AppError('ERR_INTERNAL', 500)
  }

  /** `POST /api/farms/join`: the inviter (the owner) gets the „invite“ progress, the joiner „family“. */
  async join(user: AuthUser, code: string): Promise<FarmJoinedDto> {
    this.assertMember(user)
    const farm = await this.repo.farms.byCode(code)
    if (!farm) throw new AppError('ERR_FARM_CODE', 404)
    await ensureProfile(this.repo, user)
    const outcome = await this.repo.farms.join(
      farm.id,
      user.id,
      FARM_MAX_MEMBERS,
      this.deps.clock.now(),
    )
    if (outcome === 'missing') throw new AppError('ERR_FARM_CODE', 404)
    if (outcome === 'full') throw new AppError('ERR_FARM_FULL', 409)
    if (outcome === 'already') throw new AppError('ERR_ALREADY_IN_FARM', 409)
    const newBadges = await this.badges(user.id)
    await this.badges(farm.ownerId)
    return { farm: await this.view(user, { farm, role: 'member' }), newBadges }
  }

  /** `GET /api/farms/me`: null outside a farm. */
  async get(user: AuthUser): Promise<FarmDto | null> {
    this.assertMember(user)
    const found = await this.repo.farms.membershipOf(user.id)
    if (!found) return null
    return this.view(user, {
      farm: found.farm,
      role: found.farm.ownerId === user.id ? 'owner' : 'member',
    })
  }

  async rename(user: AuthUser, name: string): Promise<FarmDto> {
    const mine = await this.mine(user, 'rename')
    await this.repo.farms.rename(mine.farm.id, name)
    return this.view(user, { ...mine, farm: { ...mine.farm, name } })
  }

  /** `POST /api/farms/me/code`: the old code stops working at once. */
  async rotateCode(user: AuthUser): Promise<FarmDto> {
    const mine = await this.mine(user, 'newCode')
    for (let i = 0; i < CODE_TRIES; i++) {
      const code = this.newCode()
      if (await this.repo.farms.setCode(mine.farm.id, code)) {
        return this.view(user, { ...mine, farm: { ...mine.farm, inviteCode: code } })
      }
    }
    throw new AppError('ERR_INTERNAL', 500)
  }

  async remove(user: AuthUser, memberId: string): Promise<FarmDto> {
    const mine = await this.mine(user, 'remove')
    if (memberId === user.id) throw new AppError('ERR_INPUT', 400)
    if (!(await this.repo.farms.removeMember(mine.farm.id, memberId))) {
      throw new AppError('ERR_NOT_FOUND', 404)
    }
    return this.view(user, mine)
  }

  async leave(user: AuthUser): Promise<{ done: true }> {
    await this.mine(user, 'leave')
    await this.repo.farms.leave(user.id)
    return { done: true }
  }

  /** `POST /api/farms/me/nudge`: one a day per (from, to), same farm, only before today's number is played. */
  async nudge(user: AuthUser, targetId: string): Promise<{ done: true }> {
    const mine = await this.mine(user, 'nudge')
    if (targetId === user.id) throw new AppError('ERR_INPUT', 400)
    const target = await this.repo.farms.membershipOf(targetId)
    if (target?.farm.id !== mine.farm.id) throw new AppError('ERR_NOT_FOUND', 404)
    const today = this.today()
    const games = await this.repo.games.countedDailies([targetId], today, today)
    if (bestToday(games, today)) throw new AppError('ERR_FINISHED', 409)
    const added = await this.repo.farms.addNudge(user.id, targetId, today, this.deps.clock.now())
    if (!added) throw new AppError('ERR_RATE_LIMIT', 429)
    return { done: true }
  }

  /** `GET /api/farms/me/nudge`: the newest unread nudge of today from someone still in the farm. */
  async myNudge(user: AuthUser): Promise<MyNudgeDto> {
    this.assertMember(user)
    const found = await this.repo.farms.membershipOf(user.id)
    if (!found) return { nudge: null }
    const today = this.today()
    const members = await this.repo.farms.members(found.farm.id)
    const ids = members.map((m) => m.userId)
    const [unread, games] = await Promise.all([
      this.repo.farms.unreadNudgesTo(user.id, today),
      this.repo.games.countedDailies(ids, today, today),
    ])
    const playedBy = new Set(games.filter((g) => g.finishedAt !== null).map((g) => g.userId))
    const from = unread.find((n) => ids.includes(n.fromUser))
    if (!from || playedBy.has(user.id)) return { nudge: null }
    const sender = await this.repo.profiles.get(from.fromUser)
    if (!sender) return { nudge: null }
    return {
      nudge: {
        fromUserId: sender.id,
        fromUsername: sender.username,
        fromRankKey: rankKeyForLevel(levelFromXp(sender.xp)),
        fromSpecies: sender.avatarSpecies,
        played: playedBy.size,
        members: ids.length,
      },
    }
  }

  /** `POST /api/farms/me/nudge/read`: the × of the banner. */
  async readNudges(user: AuthUser): Promise<{ done: true }> {
    this.assertMember(user)
    await this.repo.farms.markNudgesRead(user.id, this.today(), this.deps.clock.now())
    return { done: true }
  }

  private async view(user: AuthUser, mine: Mine): Promise<FarmDto> {
    const { farm, role } = mine
    const today = this.today()
    const monday = weekMonday(today)
    const members = await this.repo.farms.members(farm.id)
    const ids = members.map((m) => m.userId)
    const [profiles, games, sent] = await Promise.all([
      Promise.all(ids.map((id) => this.repo.profiles.get(id))),
      this.repo.games.countedDailies(ids, monday, today),
      this.repo.farms.nudgesFrom(user.id, today),
    ])
    const nudged = new Set(sent.map((n) => n.toUser))
    const rows = members.flatMap((m, i): FarmMemberDto[] => {
      const p: Profile | null = profiles[i] ?? null
      if (!p) return []
      const own = games.filter((g) => g.userId === m.userId)
      const level = levelFromXp(p.xp)
      return [
        {
          userId: m.userId,
          username: p.username,
          level,
          rankKey: rankKeyForLevel(level),
          avatarSpecies: p.avatarSpecies,
          role: farm.ownerId === m.userId ? 'owner' : 'member',
          you: m.userId === user.id,
          joinedAt: m.joinedAt,
          today: bestToday(own, today),
          weekPoints: weekPoints(own, monday),
          nudged: nudged.has(m.userId),
        },
      ]
    })
    return {
      id: farm.id,
      name: farm.name,
      code: farm.inviteCode,
      role,
      maxMembers: FARM_MAX_MEMBERS,
      dailyNumber: dailyNumber(today),
      members: rows,
    }
  }
}
