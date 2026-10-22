import type { Len, Outcome, Rating } from '@bc/game-core'
import type { Lang } from '@bc/i18n'
import type { AvatarSpecies, BadgeKey } from '@bc/protocol'

export type GameKind = 'daily' | 'free' | 'duel_race' | 'duel_classic' | 'bot'
export type SoloKind = Extract<GameKind, 'daily' | 'free'>
export type DuelFormat = 'race' | 'classic'
export type OpponentKind = 'quick' | 'friend' | 'bot'

/** All times are Unix milliseconds. */
export interface Profile {
  readonly id: string
  readonly username: string
  readonly usernameLower: string
  readonly email: string | null
  readonly isGuest: boolean
  readonly lang: Lang
  readonly sound: boolean
  readonly vibrate: boolean
  readonly defaultLen: Len
  /** The character the player's avatar is drawn as. */
  readonly avatarSpecies: AvatarSpecies
  readonly xp: number
  readonly rating: Rating
  /** Consecutive Sofia days with a won number of the day, as of `streakDate` (null: none yet). */
  readonly currentStreak: number
  readonly bestStreak: number
  readonly streakDate: string | null
  /** Badges and the day streak were derived from the history once (see docs/PROGRESSION.md). */
  readonly progressBackfilled: boolean
  readonly createdAt: number
}

export type DayStreak = Pick<Profile, 'currentStreak' | 'bestStreak' | 'streakDate'>

export type NewProfile = Pick<Profile, 'id' | 'username' | 'email' | 'isGuest'> &
  Partial<Pick<Profile, 'lang' | 'sound' | 'vibrate' | 'defaultLen' | 'avatarSpecies'>>

export type ProfilePatch = Partial<
  Pick<
    Profile,
    'username' | 'email' | 'isGuest' | 'lang' | 'sound' | 'vibrate' | 'defaultLen' | 'avatarSpecies'
  >
>

export interface GameRow {
  readonly id: string
  readonly userId: string
  readonly kind: GameKind
  readonly len: Len
  readonly zero: boolean
  /** Only `GamesRepo.getWithSecret` returns it; never sent to a client before the game ends. */
  readonly secret: string
  readonly dailyDate: string | null
  readonly practice: boolean
  readonly startedAt: number | null
  readonly finishedAt: number | null
  readonly attempts: number
  readonly wasted: number
  readonly won: boolean | null
  readonly score: number
  readonly suspicious: boolean
  readonly createdAt: number
}

/** A game as every repo method except `getWithSecret` returns it: no `secret` key at all. */
export type PublicGameRow = Omit<GameRow, 'secret'>

/** `id` (optional): a caller-chosen id makes `create` idempotent (an existing row is returned). */
export type NewGame = Pick<
  GameRow,
  'userId' | 'kind' | 'len' | 'zero' | 'secret' | 'dailyDate' | 'practice'
> &
  Partial<Pick<GameRow, 'id'>>

export type GamePatch = Partial<
  Pick<
    GameRow,
    'startedAt' | 'finishedAt' | 'attempts' | 'wasted' | 'won' | 'score' | 'suspicious' | 'practice'
  >
>

export interface GuessRow {
  readonly id: number
  readonly gameId: string
  readonly guess: string
  readonly bulls: number
  readonly cows: number
  readonly consistent: boolean
  readonly at: number
}

export type NewGuess = Omit<GuessRow, 'id'>

export interface DuelRow {
  readonly id: string
  readonly format: DuelFormat
  readonly len: Len
  readonly zero: boolean
  readonly opponentKind: OpponentKind
  readonly botLevel: number | null
  readonly inviteCode: string | null
  readonly playerA: string
  readonly playerB: string | null
  readonly gameA: string | null
  readonly gameB: string | null
  readonly winner: string | null
  readonly outcome: string | null
  readonly ratingDeltaA: number | null
  readonly ratingDeltaB: number | null
  readonly createdAt: number
  readonly finishedAt: number | null
  /** XP (and quick-match ratings) of this duel have been credited; set exactly once. */
  readonly rewardsApplied: boolean
}

/** `id` (optional): a caller-chosen id makes `create` idempotent (an existing row is returned). */
export type NewDuel = Partial<Pick<DuelRow, 'id'>> &
  Pick<
    DuelRow,
    | 'format'
    | 'len'
    | 'zero'
    | 'opponentKind'
    | 'botLevel'
    | 'inviteCode'
    | 'playerA'
    | 'playerB'
    | 'gameA'
    | 'gameB'
  >

export type DuelFinish = Pick<DuelRow, 'winner' | 'outcome' | 'ratingDeltaA' | 'ratingDeltaB'> &
  Partial<Pick<DuelRow, 'playerB' | 'gameA' | 'gameB' | 'finishedAt'>>

export interface WonAttemptsQuery {
  readonly kind: SoloKind
  readonly len: Len
  readonly zero: boolean
  readonly date?: string
  readonly sinceMs?: number
}

export interface LeaderboardQuery {
  readonly period: 'today' | 'week' | 'all'
  readonly len: Len
  readonly zero: boolean
  readonly date: string
  readonly weekStartMs: number
}

export interface LeaderboardRow {
  readonly userId: string
  readonly username: string
  readonly attempts: number
  readonly score: number
  /** The player's total xp, for their level and title next to the name. */
  readonly xp: number
  readonly avatarSpecies: AvatarSpecies
}

/** Won counted daily games of several days at once (for "top X%" of past days). */
export interface DailyAttemptsQuery {
  readonly len: Len
  readonly zero: boolean
  readonly dates: readonly string[]
}

/** One player's place in a leaderboard, also when it is beyond `LEADERBOARD_LIMIT`. */
export interface LeaderboardPlace {
  readonly attempts: number
  readonly score: number
  readonly rank: number
}

/** Upper bound for leaderboard rows returned by any repo. */
export const LEADERBOARD_LIMIT = 100

export interface ProfilesRepo {
  get(id: string): Promise<Profile | null>
  /** Case-insensitive. */
  getByUsername(username: string): Promise<Profile | null>
  /** Throws `ERR_USERNAME_TAKEN` when the name exists in any case. */
  create(profile: NewProfile): Promise<Profile>
  update(id: string, patch: ProfilePatch): Promise<Profile>
  /** Returns null (and changes nothing) when the profile does not exist. */
  addXp(id: string, xp: number): Promise<Profile | null>
  setRating(id: string, rating: Rating): Promise<void>
  setStreak(id: string, streak: DayStreak): Promise<void>
  markBackfilled(id: string): Promise<void>
}

export interface BadgesRepo {
  listOf(userId: string): Promise<BadgeKey[]>
  /** Writes the badges not held yet; a held one keeps its `earnedAt`. Idempotent. */
  award(userId: string, keys: readonly BadgeKey[], earnedAt: number): Promise<void>
}

/**
 * Every method returns games without the secret. Only the guess and give-up paths may
 * call `getWithSecret`, explicitly.
 */
export interface GamesRepo {
  create(game: NewGame): Promise<PublicGameRow>
  get(id: string): Promise<PublicGameRow | null>
  /** The full row including the secret; for checking guesses and revealing at the end. */
  getWithSecret(id: string): Promise<GameRow | null>
  update(id: string, patch: GamePatch): Promise<PublicGameRow>
  addGuess(guess: NewGuess): Promise<GuessRow>
  /** In the order they were added. */
  guesses(gameId: string): Promise<GuessRow[]>
  /** The counted (non-practice) daily game of a user for a date and settings. */
  dailyOf(userId: string, date: string, len: Len, zero: boolean): Promise<PublicGameRow | null>
  wonAttempts(query: WonAttemptsQuery): Promise<number[]>
  /** Attempts of won counted daily games per date; dates without wins are absent. */
  wonAttemptsByDate(query: DailyAttemptsQuery): Promise<Readonly<Record<string, number[]>>>
  /** Score desc, then earlier finish, then user id asc. */
  leaderboard(query: LeaderboardQuery): Promise<LeaderboardRow[]>
  /** The player's best game and rank in the same order; null when not ranked (or a guest). */
  leaderboardRankOf(query: LeaderboardQuery, userId: string): Promise<LeaderboardPlace | null>
  /** Audit row for the day's number; idempotent. */
  recordDailyNumber(date: string, len: Len, zero: boolean, idx: number): Promise<void>
  /** Newest first. */
  history(userId: string, limit: number): Promise<PublicGameRow[]>
  /** Counted (non-practice) free games of a user finished on a Sofia calendar date. */
  countFreeGamesOn(userId: string, sofiaDate: string): Promise<number>
}

/** What one player gets from a finished duel. */
export interface DuelReward {
  readonly userId: string
  readonly xp: number
  /**
   * Quick matches only, else null: the opponent's start-of-match rating and this player's
   * outcome. The repo applies it to the player's CURRENT rating inside the rewards
   * transaction, so a concurrent match that ended first is not overwritten.
   */
  readonly ratingUpdate: RatingUpdate | null
}

export interface RatingUpdate {
  readonly opponent: Rating
  readonly outcome: Outcome
}

export interface DuelsRepo {
  /** With an `id` that already exists, returns that row unchanged. */
  create(duel: NewDuel): Promise<DuelRow>
  finish(id: string, patch: DuelFinish): Promise<DuelRow>
  get(id: string): Promise<DuelRow | null>
  /**
   * Credits the rewards and sets `rewardsApplied`, atomically and only once: returns false
   * (and changes nothing) when they were already applied. Throws when the duel is missing.
   */
  applyRewards(id: string, rewards: readonly DuelReward[]): Promise<boolean>
}

export interface Repo {
  readonly profiles: ProfilesRepo
  readonly games: GamesRepo
  readonly duels: DuelsRepo
  readonly badges: BadgesRepo
}

/** A repo bound to resources that must be released when the request ends. */
export interface RepoHandle extends Repo {
  close(): Promise<void>
}
