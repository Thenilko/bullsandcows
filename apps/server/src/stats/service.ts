import {
  FALLBACK_HISTOGRAM,
  levelFromXp,
  pickHistogram,
  rankKeyForLevel,
  sofiaDate,
  topOf,
  type Len,
} from '@bc/game-core'
import type { DistributionDto, LeaderboardDto, MeDto, SettingsPatch } from '@bc/protocol'
import { ensureProfile } from '../auth/profiles'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import {
  LEADERBOARD_LIMIT,
  type LeaderboardPlace,
  type LeaderboardQuery,
  type PublicGameRow,
  type Repo,
  type SoloKind,
} from '../ports/repo'
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
import { cacheKey, queryOf, type DistributionQuery, type DistributionSource } from './top'

export type { DistributionQuery } from './top'

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
        you: r.userId === user.id,
        level,
        rankKey: rankKeyForLevel(level),
        avatarSpecies: r.avatarSpecies,
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
    const { sound, vibrate, defaultLen, lang, avatarSpecies } = patch
    await this.deps.repo.profiles.update(user.id, { sound, vibrate, defaultLen, lang, avatarSpecies })
    return this.me(user)
  }

  /** "Top X%" of each won game against the distribution its mode would show (fallback for bots/duels). */
  private async topOfGames(wins: readonly PublicGameRow[]): Promise<(g: PublicGameRow) => number> {
    const today = this.today()
    const queries = new Map<string, DistributionQuery>()
    for (const g of wins) {
      const q = queryOf(g, today)
      if (q) queries.set(cacheKey(q), q)
    }
    const all = [...queries.values()]
    const daily = await this.dailyDistributions(all.filter((q) => q.kind === 'daily'))
    const free = await Promise.all(
      all
        .filter((q) => q.kind === 'free')
        .map(async (q) => [cacheKey(q), await this.distribution(q)] as const),
    )
    const histograms = new Map([...daily, ...free])
    return (g) => {
      const q = queryOf(g, today)
      const histogram = (q && histograms.get(cacheKey(q))?.histogram) ?? FALLBACK_HISTOGRAM[g.len]
      return topOf(g.attempts, histogram).top
    }
  }

  /** Past days' distributions: cached ones, plus one grouped query per (len, zero) for the rest. */
  private async dailyDistributions(
    queries: readonly DistributionQuery[],
  ): Promise<[string, DistributionDto][]> {
    const now = this.deps.clock.now()
    const cached = queries.flatMap((q) => {
      const hit = this.cache.get(cacheKey(q), now)
      return hit ? [[cacheKey(q), hit] as [string, DistributionDto]] : []
    })
    const missing = queries.filter((q) => !this.cache.get(cacheKey(q), now))
    const groups = new Map<string, DistributionQuery[]>()
    for (const q of missing) {
      const group = `${q.len}|${q.zero}`
      groups.set(group, [...(groups.get(group) ?? []), q])
    }
    const fetched: [string, DistributionDto][] = []
    for (const group of groups.values()) {
      const [{ len, zero }] = group as [DistributionQuery]
      const dates = group.map((q) => q.date)
      const byDate = await this.deps.repo.games.wonAttemptsByDate({ len, zero, dates })
      for (const q of group) {
        const value = toDistribution(byDate[q.date] ?? [], len)
        this.cache.set(cacheKey(q), value, now)
        fetched.push([cacheKey(q), value])
      }
    }
    return [...cached, ...fetched]
  }
}
