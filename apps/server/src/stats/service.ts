import {
  levelFromXp,
  pickHistogram,
  rankKeyForLevel,
  sofiaDate,
  topOf,
  type Len,
} from '@bc/game-core'
import type {
  BadgeStateDto,
  DistributionDto,
  LeaderboardDto,
  MeDto,
  SettingsPatch,
} from '@bc/protocol'
import { ensureProfile } from '../auth/profiles'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import {
  LEADERBOARD_LIMIT,
  type LeaderboardPlace,
  type LeaderboardQuery,
  type Profile,
  type PublicGameRow,
  type Repo,
  type SoloKind,
} from '../ports/repo'
import { heldBadges, recomputeBadges, toBadgeStates } from './badgeService'
import {
  bucketsOf,
  isFinished,
  isSolo,
  levelInfo,
  RECENT_GAMES,
  streakOf,
  summaryOf,
  toProfileDto,
  toRecent,
} from './me'
import { dayStreakFromDates } from './streak'
import { hasGoldFrame } from '../weekly/model'
import { sofiaWeekStart } from './time'
import { cacheKey, type DistributionQuery, type DistributionSource } from './top'

export type { DistributionQuery } from './top'

/**
 * The progression backfill a profile must have had: 1 = badges v1 and the day streak,
 * 2 = badge tiers and progress (docs/PROGRESSION.md). Bump when the derivation changes.
 */
export const PROGRESS_VERSION = 2

const CACHE_TTL_MS = 60_000
const FREE_WINDOW_MS = 30 * 86_400_000
/** Rows shown; `me` is still found among everything the repo ranked. */
export const LEADERBOARD_ROWS = 50
/** Games read for profile stats and badges. */
const HISTORY_LIMIT = 1_000

/** Per-isolate cache of distributions with expiry; tiny (one entry per kind/len/zero/date). */
export class DistributionCache {
  private entries = new Map<string, { readonly at: number; readonly value: DistributionDto }>()

  constructor(private readonly ttlMs: number = CACHE_TTL_MS) {}

  get(key: string, now: number): DistributionDto | undefined {
    const hit = this.entries.get(key)
    return hit && now - hit.at < this.ttlMs ? hit.value : undefined
  }

  set(key: string, value: DistributionDto, now: number): void {
    const fresh = [...this.entries].filter(([, e]) => now - e.at < this.ttlMs)
    this.entries = new Map([...fresh, [key, { at: now, value }]])
  }
}

const sharedCache = new DistributionCache()

function toDistribution(sample: readonly number[], len: Len): DistributionDto {
  const picked = pickHistogram(sample, len)
  return { histogram: [...picked.histogram], sample: picked.sample, fallback: picked.fallback }
}

export interface StatsDeps {
  readonly repo: Repo
  readonly clock: Clock
  readonly cache?: DistributionCache
}

export type LeaderboardInput = Pick<LeaderboardQuery, 'period' | 'len' | 'zero'>

export class StatsService implements DistributionSource {
  private readonly cache: DistributionCache

  constructor(private readonly deps: StatsDeps) {
    this.cache = deps.cache ?? sharedCache
  }

  private today(): string {
    return sofiaDate(new Date(this.deps.clock.now()))
  }

  async distribution(q: DistributionQuery): Promise<DistributionDto> {
    const now = this.deps.clock.now()
    const key = cacheKey(q)
    const cached = this.cache.get(key, now)
    if (cached) return cached
    const { kind, len, zero } = q
    const sample = await this.deps.repo.games.wonAttempts(
      kind === 'daily'
        ? { kind, len, zero, date: q.date }
        : { kind, len, zero, sinceMs: now - FREE_WINDOW_MS },
    )
    const value = toDistribution(sample, len)
    this.cache.set(key, value, now)
    return value
  }

  async leaderboard(user: AuthUser, q: LeaderboardInput): Promise<LeaderboardDto> {
    if (user.isGuest) throw new AppError('ERR_GUEST', 403)
    const date = this.today()
    const query = { ...q, date, weekStartMs: sofiaWeekStart(this.deps.clock.now()) }
    const rows = await this.deps.repo.games.leaderboard(query)
    const ranked = rows.map((r, i) => {
      const level = levelFromXp(r.xp)
      return {
        rank: i + 1,
        username: r.username,
        attempts: r.attempts,
        score: r.score,
        durationMs: r.durationMs,
        you: r.userId === user.id,
        level,
        rankKey: rankKeyForLevel(level),
        avatarSpecies: r.avatarSpecies,
        goldFrame: hasGoldFrame(r.goldFrameUntil, this.deps.clock.now()),
      }
    })
    // Below the repo's list the caller's place is counted separately.
    const place: LeaderboardPlace | null =
      ranked.find((r) => r.you) ??
      (rows.length >= LEADERBOARD_LIMIT
        ? await this.deps.repo.games.leaderboardRankOf(query, user.id)
        : null)
    return {
      rows: ranked.slice(0, LEADERBOARD_ROWS),
      me: place && (await this.placeOf(place, q, date)),
    }
  }

  /** "Today" ranks daily games; week/all mix daily and free, measured against free play. */
  private async placeOf(place: LeaderboardPlace, q: LeaderboardInput, date: string) {
    const kind: SoloKind = q.period === 'today' ? 'daily' : 'free'
    const { histogram } = await this.distribution({ kind, len: q.len, zero: q.zero, date })
    return { rank: place.rank, score: place.score, top: topOf(place.attempts, histogram).top }
  }

  async me(user: AuthUser): Promise<MeDto> {
    const { repo } = this.deps
    const profile = await ensureProfile(repo, user)
    const games = await repo.games.history(user.id, HISTORY_LIMIT)
    const finished = games.filter(isFinished)
    const counted = finished.filter((g) => !g.practice)
    const current =
      profile.progressVersion < PROGRESS_VERSION ? await this.backfill(profile, counted) : profile
    return {
      profile: toProfileDto(current),
      ...levelInfo(current),
      goldFrame: hasGoldFrame(current.goldFrameUntil, this.deps.clock.now()),
      currentGameId: games.find((g) => isSolo(g) && g.finishedAt === null)?.id ?? null,
      stats: summaryOf(counted, streakOf(counted)),
      buckets: bucketsOf(counted.filter((g) => g.won === true)),
      badges: { ...heldBadges(await repo.badges.listOf(user.id)) },
      recent: finished.slice(0, RECENT_GAMES).map(toRecent),
      ...(user.isAdmin === true ? { isAdmin: true as const } : {}),
    }
  }

  /** `GET /api/me/badges`: all 29 badges with tier and progress (after the backfill, if due). */
  async badges(user: AuthUser): Promise<BadgeStateDto[]> {
    const { repo } = this.deps
    const profile = await ensureProfile(repo, user)
    if (profile.progressVersion < PROGRESS_VERSION) {
      const games = await repo.games.history(user.id, HISTORY_LIMIT)
      await this.backfill(
        profile,
        games.filter((g) => isFinished(g) && !g.practice),
      )
    }
    return toBadgeStates(await repo.badges.listOf(user.id))
  }

  /**
   * One-time derivation of the day streak and the badge tiers from the history of a profile
   * (docs/PROGRESSION.md), without XP. Idempotent: the streak is a function of the history
   * (`best_streak` keeps the larger value), tiers and progress only grow, and the version is
   * written last. Returns the profile as it stands afterwards.
   */
  private async backfill(profile: Profile, counted: readonly PublicGameRow[]): Promise<Profile> {
    const { repo, clock } = this.deps
    const wins = counted.filter((g) => g.won === true)
    const fromHistory = dayStreakFromDates(
      wins.flatMap((g) => (g.kind === 'daily' && g.dailyDate !== null ? [g.dailyDate] : [])),
    )
    const streak = {
      ...fromHistory,
      bestStreak: Math.max(fromHistory.bestStreak, profile.bestStreak),
    }
    await repo.profiles.setStreak(profile.id, streak)
    await recomputeBadges(repo, {
      userId: profile.id,
      scope: 'all',
      now: clock.now(),
      games: counted,
      payXp: false,
    })
    await repo.profiles.setProgressVersion(profile.id, PROGRESS_VERSION)
    return { ...profile, ...streak, progressVersion: PROGRESS_VERSION }
  }

  async updateSettings(user: AuthUser, patch: SettingsPatch): Promise<MeDto> {
    await ensureProfile(this.deps.repo, user)
    // Picked field by field: nothing else (xp, rating, username) can ride along.
    const { sound, vibrate, defaultLen, lang, avatarSpecies, reminderTime } = patch
    await this.deps.repo.profiles.update(user.id, {
      sound,
      vibrate,
      defaultLen,
      lang,
      avatarSpecies,
      reminderTime,
    })
    return this.me(user)
  }
}
