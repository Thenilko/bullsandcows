import {
  codes,
  parseWeekId,
  sofiaDate,
  sofiaWeekAt,
  weekInfo,
  weeklyRule,
  WEEKLY_WIN_XP,
  type WeekInfo,
  type WeeklyRule,
} from '@bc/game-core'
import type { WeeklyAwardDto, WeeklyBoardDto, WeeklyDto, WeeklyRuleDto } from '@bc/protocol'
import { ensureProfile } from '../auth/profiles'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import type { Repo, WeeklyResultRow } from '../ports/repo'
import type { SoloService } from '../solo/service'
import type { GameView } from '../solo/types'
import { finalizeDueWeeks } from './finalize'
import { placeOf, standings, toBest, toRow } from './model'

/** Leaders on the week screen (Р7 / ПД9). */
const TOP_ROWS = 3
export const BOARD_LIMIT_DEFAULT = 50

export interface WeeklyDeps {
  readonly repo: Repo
  readonly clock: Clock
  readonly solo: SoloService
}

const ruleDto = (rule: WeeklyRule): WeeklyRuleDto => ({
  key: rule.key,
  len: rule.len,
  zero: rule.zero,
  maxAttempts: rule.maxAttempts,
  timeLimitSecs: rule.timeLimitSecs,
})

/** A uniform pick: 32 random bits modulo at most 30240 codes (bias below 1e-5). */
function randomSecret(rule: WeeklyRule): string {
  const list = codes(rule.len, rule.zero)
  const [value] = crypto.getRandomValues(new Uint32Array(1))
  return list[(value ?? 0) % list.length] as string
}

/**
 * „Седмично предизвикателство“ (spec ЧАСТ 3) for members (the routes refuse guests): one secret for everyone,
 * generated here on the first start of the week and checked by the solo machinery, never sent before the end
 * of the player's game; one game per Sofia day; the best game ranks.
 */
export class WeeklyService {
  constructor(private readonly deps: WeeklyDeps) {}

  private get repo(): Repo {
    return this.deps.repo
  }

  private assertMember(user: AuthUser): void {
    if (user.isGuest) throw new AppError('ERR_GUEST', 403)
  }

  /** `GET /api/weekly`: finalises an ended week the cron missed, then the current week as the player sees it. */
  async overview(user: AuthUser): Promise<WeeklyDto> {
    this.assertMember(user)
    const now = this.deps.clock.now()
    await finalizeDueWeeks(this.repo, now)
    const week = sofiaWeekAt(now)
    const rule = weeklyRule(week)
    const s = standings(await this.repo.weekly.finishedPlays(week.id))
    const today = await this.repo.weekly.playOn(user.id, sofiaDate(new Date(now)))
    const result = await this.repo.weekly.unseenResult(user.id)
    return {
      weekId: week.id,
      week: week.week,
      monday: week.monday,
      sunday: week.sunday,
      endsAt: week.endsAt,
      rule: ruleDto(rule),
      xp: WEEKLY_WIN_XP,
      best: toBest(s.best.get(user.id)),
      place: placeOf(s, user.id)?.place ?? null,
      top: s.ranked.slice(0, TOP_ROWS).map((p) => toRow(p, user.id, now)),
      participants: s.participants,
      playedToday: today?.finishedAt != null,
      today: today ? { gameId: today.gameId, finished: today.finishedAt !== null } : null,
      award: result ? await this.award(user.id, result) : null,
    }
  }

  private async award(userId: string, r: WeeklyResultRow): Promise<WeeklyAwardDto> {
    return {
      weekId: r.weekId,
      week: parseWeekId(r.weekId)?.week ?? 0,
      place: r.place,
      participants: r.participants,
      won: r.won,
      attempts: r.attempts,
      secs: r.secs,
      xp: r.xp,
      goldFrame: r.goldFrame,
      weeksWon: await this.repo.weekly.weeksWon(userId),
    }
  }

  /** `POST /api/weekly/award/seen`: П8 is shown once. */
  async seen(user: AuthUser): Promise<{ done: true }> {
    this.assertMember(user)
    await this.repo.weekly.markSeen(user.id, this.deps.clock.now())
    return { done: true }
  }

  /**
   * `POST /api/weekly/start`: today's game, resumed while unfinished; `ERR_WEEKLY_PLAYED` once it is over. A
   * game of an earlier day still open is closed as lost first (one game a day, also for the unfinished ones).
   */
  async start(user: AuthUser): Promise<GameView> {
    this.assertMember(user)
    await ensureProfile(this.repo, user)
    const now = this.deps.clock.now()
    const day = sofiaDate(new Date(now))
    const existing = await this.repo.weekly.playOn(user.id, day)
    if (existing) return this.resume(user, existing.gameId)
    const week = sofiaWeekAt(now)
    await this.closeOpen(user, week)
    const rule = weeklyRule(week)
    const stored = await this.repo.weekly.ensureWeek(
      { weekId: week.id, ruleKey: rule.key, secret: randomSecret(rule), endsAt: week.endsAt },
      now,
    )
    const gameId = crypto.randomUUID()
    const game = await this.repo.weekly.startPlay(
      {
        id: gameId,
        userId: user.id,
        kind: 'weekly',
        len: rule.len,
        zero: rule.zero,
        secret: stored.secret,
        dailyDate: null,
        practice: false,
      },
      { userId: user.id, weekId: week.id, day, gameId },
    )
    // A concurrent start of the same day won: continue with that game.
    if (!game) return this.resumeToday(user, day)
    return this.deps.solo.view(game)
  }

  private async resumeToday(user: AuthUser, day: string): Promise<GameView> {
    const winner = await this.repo.weekly.playOn(user.id, day)
    if (!winner) throw new AppError('ERR_INTERNAL', 500)
    return this.resume(user, winner.gameId)
  }

  private async resume(user: AuthUser, gameId: string): Promise<GameView> {
    const view = await this.deps.solo.get(user, gameId)
    if (view.finishedAt !== null) throw new AppError('ERR_WEEKLY_PLAYED', 409)
    return view
  }

  private async closeOpen(user: AuthUser, week: WeekInfo): Promise<void> {
    for (const play of await this.repo.weekly.openPlays(user.id, week.id)) {
      const view = await this.deps.solo.get(user, play.gameId)
      if (view.finishedAt === null) await this.deps.solo.giveUp(user, play.gameId)
    }
  }

  /** `GET /api/weekly/{week}/board?limit=`: ranked winners best first, your row also below the limit. */
  async board(user: AuthUser, weekId: string, limit: number): Promise<WeeklyBoardDto> {
    this.assertMember(user)
    const iso = parseWeekId(weekId)
    if (!iso) throw new AppError('ERR_INPUT', 400)
    const now = this.deps.clock.now()
    const week = weekInfo(iso)
    const stored = await this.repo.weekly.week(week.id)
    const s = standings(await this.repo.weekly.finishedPlays(week.id))
    const mine = placeOf(s, user.id)
    return {
      weekId: week.id,
      week: week.week,
      rule: ruleDto(weeklyRule(iso)),
      rows: s.ranked.slice(0, limit).map((p) => toRow(p, user.id, now)),
      me: mine ? toRow(mine, user.id, now) : null,
      participants: s.participants,
      finalized: stored?.finalizedAt != null,
    }
  }
}
