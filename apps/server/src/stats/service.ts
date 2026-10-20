import { FALLBACK_HISTOGRAM, pickHistogram, sofiaDate, topOf, type Len } from '@bc/game-core'
import type { DistributionDto, LeaderboardDto, MeDto, SettingsPatch } from '@bc/protocol'
import { ensureProfile } from '../auth/profiles'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import type { LeaderboardQuery, PublicGameRow, Repo, SoloKind } from '../ports/repo'
import { badgesFor, streakOf } from './badges'
import {
  bucketsOf,
  isFinished,
  isSolo,
  levelInfo,
  RECENT_GAMES,
  summaryOf,
  toProfileDto,
  toRecent,
} from './me'
import { sofiaWeekStart } from './time'

const CACHE_TTL_MS = 60_000
const FREE_WINDOW_MS = 30 * 86_400_000
/** Rows shown; `me` is still found among everything the repo ranked. */
export const LEADERBOARD_ROWS = 50
/** Games read for profile stats and badges. */
const HISTORY_LIMIT = 1_000

export interface DistributionQuery {
  readonly len: Len
  readonly zero: boolean
  readonly kind: SoloKind
  /** Sofia date; selects the day for `daily` (and is part of the cache key for both). */
  readonly date: string
}

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

export interface StatsDeps {
  readonly repo: Repo
  readonly clock: Clock
  readonly cache?: DistributionCache
}

export type LeaderboardInput = Pick<LeaderboardQuery, 'period' | 'len' | 'zero'>

export class StatsService {
  private readonly cache: DistributionCache

  constructor(private readonly deps: StatsDeps) {
    this.cache = deps.cache ?? sharedCache
  }

  private today(): string {
    return sofiaDate(new Date(this.deps.clock.now()))
  }

  async distribution(q: DistributionQuery): Promise<DistributionDto> {
    const now = this.deps.clock.now()
    const key = `${q.kind}|${q.len}|${q.zero ? 1 : 0}|${q.date}`
    const cached = this.cache.get(key, now)
    if (cached) return cached
    const { kind, len, zero } = q
    const sample = await this.deps.repo.games.wonAttempts(
      kind === 'daily'
        ? { kind, len, zero, date: q.date }
        : { kind, len, zero, sinceMs: now - FREE_WINDOW_MS },
    )
    const picked = pickHistogram(sample, len)
    const value = {
      histogram: [...picked.histogram],
      sample: picked.sample,
      fallback: picked.fallback,
    }
    this.cache.set(key, value, now)
    return value
  }

  async leaderboard(user: AuthUser, q: LeaderboardInput): Promise<LeaderboardDto> {
    if (user.isGuest) throw new AppError('ERR_GUEST', 403)
    const now = this.deps.clock.now()
    const date = this.today()
    const ranked = (
      await this.deps.repo.games.leaderboard({ ...q, date, weekStartMs: sofiaWeekStart(now) })
    ).map((r, i) => ({
      rank: i + 1,
      username: r.username,
      attempts: r.attempts,
      score: r.score,
      you: r.userId === user.id,
    }))
    const mine = ranked.find((r) => r.you)
    // "Today" ranks daily games; week/all mix daily and free, measured against free play.
    const kind: SoloKind = q.period === 'today' ? 'daily' : 'free'
    const histogram = mine
      ? (await this.distribution({ kind, len: q.len, zero: q.zero, date })).histogram
      : []
    return {
      rows: ranked.slice(0, LEADERBOARD_ROWS),
      me: mine
        ? { rank: mine.rank, score: mine.score, top: topOf(mine.attempts, histogram).top }
        : null,
    }
  }

  async me(user: AuthUser): Promise<MeDto> {
    const profile = await ensureProfile(this.deps.repo, user)
    const games = await this.deps.repo.games.history(user.id, HISTORY_LIMIT)
    const finished = games.filter(isFinished)
    const counted = finished.filter((g) => !g.practice)
    const streak = streakOf(counted)
    const topOfGame = await this.topOfGames(counted.filter((g) => g.won === true))
    return {
      profile: toProfileDto(profile),
      ...levelInfo(profile),
      currentGameId: games.find((g) => isSolo(g) && g.finishedAt === null)?.id ?? null,
      stats: summaryOf(counted, streak),
      buckets: bucketsOf(counted.filter((g) => g.won === true)),
      badges: { ...badgesFor(counted, streak, topOfGame) },
      recent: finished.slice(0, RECENT_GAMES).map(toRecent),
    }
  }

  async updateSettings(user: AuthUser, patch: SettingsPatch): Promise<MeDto> {
    await ensureProfile(this.deps.repo, user)
    // Picked field by field: nothing else (xp, rating, username) can ride along.
    const { sound, vibrate, defaultLen, lang } = patch
    await this.deps.repo.profiles.update(user.id, { sound, vibrate, defaultLen, lang })
    return this.me(user)
  }

  /** "Top X%" of each won game against the distribution its mode would show (fallback for bots/duels). */
  private async topOfGames(wins: readonly PublicGameRow[]): Promise<(g: PublicGameRow) => number> {
    const today = this.today()
    const queryOf = (g: PublicGameRow): DistributionQuery | null =>
      g.kind === 'daily' && g.dailyDate !== null
        ? { kind: 'daily', len: g.len, zero: g.zero, date: g.dailyDate }
        : g.kind === 'free'
          ? { kind: 'free', len: g.len, zero: g.zero, date: today }
          : null
    const keyOf = (q: DistributionQuery) => `${q.kind}|${q.len}|${q.zero}|${q.date}`
    const queries = new Map<string, DistributionQuery>()
    for (const g of wins) {
      const q = queryOf(g)
      if (q) queries.set(keyOf(q), q)
    }
    const histograms = new Map(
      await Promise.all(
        [...queries].map(
          async ([key, q]) => [key, (await this.distribution(q)).histogram] as const,
        ),
      ),
    )
    return (g) => {
      const q = queryOf(g)
      const histogram = (q && histograms.get(keyOf(q))) ?? FALLBACK_HISTOGRAM[g.len]
      return topOf(g.attempts, histogram).top
    }
  }
}
