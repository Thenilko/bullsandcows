import type { Len, Rating } from '@bc/game-core'
import type { Lang } from '@bc/i18n'

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
  readonly xp: number
  readonly rating: Rating
  readonly createdAt: number
}

export type NewProfile = Pick<Profile, 'id' | 'username' | 'email' | 'isGuest'> &
  Partial<Pick<Profile, 'lang' | 'sound' | 'vibrate' | 'defaultLen'>>

export type ProfilePatch = Partial<
  Pick<Profile, 'username' | 'email' | 'isGuest' | 'lang' | 'sound' | 'vibrate' | 'defaultLen'>
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

export type NewGame = Pick<
  GameRow,
  'userId' | 'kind' | 'len' | 'zero' | 'secret' | 'dailyDate' | 'practice'
>

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
}

export type NewDuel = Pick<
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
  addXp(id: string, xp: number): Promise<Profile>
  setRating(id: string, rating: Rating): Promise<void>
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
  /** Score desc, then earlier finish, then user id asc. */
  leaderboard(query: LeaderboardQuery): Promise<LeaderboardRow[]>
  /** Newest first. */
  history(userId: string, limit: number): Promise<PublicGameRow[]>
}

export interface DuelsRepo {
  create(duel: NewDuel): Promise<DuelRow>
  finish(id: string, patch: DuelFinish): Promise<DuelRow>
  get(id: string): Promise<DuelRow | null>
}

export interface Repo {
  readonly profiles: ProfilesRepo
  readonly games: GamesRepo
  readonly duels: DuelsRepo
}

/** A repo bound to resources that must be released when the request ends. */
export interface RepoHandle extends Repo {
  close(): Promise<void>
}
