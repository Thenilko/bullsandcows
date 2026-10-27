import type { Len, Outcome, Rating, WeeklyRuleKey } from '@bc/game-core'
import type { Lang } from '@bc/i18n'
import type { AvatarSpecies, BadgeKey, BarnColor, PastureKey, ShareChannel } from '@bc/protocol'

export type GameKind = 'daily' | 'free' | 'duel_race' | 'duel_classic' | 'bot' | 'weekly'
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
  /** Version of the one-time progression backfill this profile has had (docs/PROGRESSION.md). */
  readonly progressVersion: number
  /** „Напомняне всеки ден?“ 'HH:MM' or null; only stored. */
  readonly reminderTime: string | null
  /** The weekly challenge's gold frame (top 10) is worn until then (Unix ms); null: never earned. */
  readonly goldFrameUntil: number | null
  readonly createdAt: number
}

export type DayStreak = Pick<Profile, 'currentStreak' | 'bestStreak' | 'streakDate'>

export type NewProfile = Pick<Profile, 'id' | 'username' | 'email' | 'isGuest'> &
  Partial<Pick<Profile, 'lang' | 'sound' | 'vibrate' | 'defaultLen' | 'avatarSpecies'>>

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'username'
    | 'email'
    | 'isGuest'
    | 'lang'
    | 'sound'
    | 'vibrate'
    | 'defaultLen'
    | 'avatarSpecies'
    | 'reminderTime'
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
  /** The notebook was used at least once (the client reports it; sticky). */
  readonly usedNotes: boolean
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
    | 'startedAt'
    | 'finishedAt'
    | 'attempts'
    | 'wasted'
    | 'won'
    | 'score'
    | 'suspicious'
    | 'practice'
    | 'usedNotes'
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
  /** Accepted as a rematch of the previous match in the room. */
  readonly isRematch: boolean
  /** The winner won after the loser had exactly one candidate left (badge „comeback“). */
  readonly comeback: boolean
}

/** `id` (optional): a caller-chosen id makes `create` idempotent (an existing row is returned). */
export type NewDuel = Partial<Pick<DuelRow, 'id' | 'isRematch' | 'comeback'>> &
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
  readonly goldFrameUntil: number | null
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
  setProgressVersion(id: string, version: number): Promise<void>
}

/** One badge of a player: `tier` 0–3, `progress` its metric, `earnedAt` when the tier was reached. */
export interface BadgeState {
  readonly key: BadgeKey
  readonly tier: number
  readonly progress: number
  readonly earnedAt: number
}

export interface BadgesRepo {
  /** Only badges with a row (progress or a tier); keys absent are at tier 0 / progress 0. */
  listOf(userId: string): Promise<BadgeState[]>
  /** Inserts or overwrites the rows for the keys given (tier, progress, earnedAt). */
  save(userId: string, rows: readonly BadgeState[]): Promise<void>
}

export interface ShareRow {
  readonly id: string
  readonly userId: string
  readonly gameId: string
  readonly channel: ShareChannel
  readonly createdAt: number
}

export type NewShare = Omit<ShareRow, 'id'>

export interface SharesRepo {
  /** One row per (user, game): returns false (and changes nothing) when it exists already. */
  add(share: NewShare): Promise<boolean>
  countOf(userId: string): Promise<number>
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
  /** Finished counted daily games of these players with `dailyDate` in [fromDate, toDate] (any settings). */
  countedDailies(
    userIds: readonly string[],
    fromDate: string,
    toDate: string,
  ): Promise<PublicGameRow[]>
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
  /** Finished duels (bots included) a player sat in, newest first. */
  listOf(userId: string, limit: number): Promise<DuelRow[]>
}

/** The player's pasture choices; unlocking is derived, never stored. */
export interface PastureSettings {
  readonly hiddenItems: readonly PastureKey[]
  readonly barnColor: BarnColor
}

export interface PastureRepo {
  /** Null when the player never changed anything (the defaults apply). */
  get(userId: string): Promise<PastureSettings | null>
  /** Inserts or overwrites the row. */
  save(userId: string, settings: PastureSettings): Promise<void>
}

export interface FarmRow {
  readonly id: string
  readonly name: string
  readonly inviteCode: string
  readonly ownerId: string
  readonly createdAt: number
}

export interface FarmMemberRow {
  readonly farmId: string
  readonly userId: string
  readonly joinedAt: number
  /** The owner whose code was used (null for the founder). */
  readonly invitedBy: string | null
}

export type NewFarm = Pick<FarmRow, 'name' | 'inviteCode' | 'ownerId'>

/** `joined`; `full` at the limit; `already` when the user is in a farm (this or another); `missing` farm gone. */
export type FarmJoinOutcome = 'joined' | 'full' | 'already' | 'missing'

/** `left` (a member), `handed` (the owner left, the oldest member owns it now), `deleted` (last one), `none`. */
export type FarmLeaveOutcome = 'left' | 'handed' | 'deleted' | 'none'

export interface NudgeRow {
  readonly fromUser: string
  readonly toUser: string
  /** Sofia date 'YYYY-MM-DD'. */
  readonly day: string
  readonly createdAt: number
  readonly readAt: number | null
}

/**
 * „Семейна ферма“. Every write that could break „one farm per user“ or „at most N members“ is atomic (a
 * transaction with the farm row locked, plus the unique index on `farm_members.user_id`).
 */
export interface FarmsRepo {
  /**
   * The farm and its owner as the first member, together. Null when the invite code is taken (pick another);
   * `already` when the owner is in a farm.
   */
  create(farm: NewFarm, now: number): Promise<FarmRow | null | 'already'>
  get(id: string): Promise<FarmRow | null>
  byCode(code: string): Promise<FarmRow | null>
  /** The user's farm and membership row, or null. */
  membershipOf(userId: string): Promise<{ farm: FarmRow; member: FarmMemberRow } | null>
  /** Oldest first (joined_at, then user id). */
  members(farmId: string): Promise<FarmMemberRow[]>
  /** Adds the user unless the farm is full or the user is in a farm already; `invitedBy` is the owner now. */
  join(farmId: string, userId: string, max: number, now: number): Promise<FarmJoinOutcome>
  rename(farmId: string, name: string): Promise<void>
  /** False (nothing changed) when the code is taken. */
  setCode(farmId: string, code: string): Promise<boolean>
  /** Removes a member other than the owner; false when they were not in this farm. */
  removeMember(farmId: string, userId: string): Promise<boolean>
  /** The user leaves; an owner hands the farm to the oldest member, the last one deletes it. */
  leave(userId: string): Promise<FarmLeaveOutcome>
  /** Distinct users who joined a farm with a code while `userId` owned it. */
  inviteesOf(userId: string): Promise<string[]>
  /** False when this (from, to, day) exists already. */
  addNudge(from: string, to: string, day: string, now: number): Promise<boolean>
  /** Nudges sent by `from` on `day`. */
  nudgesFrom(from: string, day: string): Promise<NudgeRow[]>
  /** Unread nudges to `to` on `day`, newest first. */
  unreadNudgesTo(to: string, day: string): Promise<NudgeRow[]>
  markNudgesRead(to: string, day: string, now: number): Promise<void>
}

/** One week of the weekly challenge: created on first need, with the one secret for everyone. */
export interface WeekRow {
  /** '2026-W44'. */
  readonly weekId: string
  readonly ruleKey: WeeklyRuleKey
  /** Never sent to a client: guesses are checked on the server. */
  readonly secret: string
  /** Next Monday 00:00 Sofia (Unix ms). */
  readonly endsAt: number
  readonly createdAt: number
  readonly finalizedAt: number | null
  /** Players with a finished game; set at finalisation. */
  readonly participants: number | null
}

export type NewWeek = Pick<WeekRow, 'weekId' | 'ruleKey' | 'secret' | 'endsAt'>

/** One weekly game: at most one per player and Sofia day (unique index on user and day). */
export interface WeeklyPlayRow {
  readonly userId: string
  readonly weekId: string
  /** Sofia date 'YYYY-MM-DD' of the start. */
  readonly day: string
  readonly gameId: string
  readonly attempts: number
  /** Null until finished or when the start is unknown. */
  readonly secs: number | null
  readonly won: boolean
  readonly finishedAt: number | null
  readonly createdAt: number
}

export type NewWeeklyPlay = Pick<WeeklyPlayRow, 'userId' | 'weekId' | 'day' | 'gameId'>

export type WeeklyPlayFinish = Pick<WeeklyPlayRow, 'attempts' | 'secs' | 'won'> & {
  readonly finishedAt: number
}

/** A finished play with what a board row shows of its player. */
export interface WeeklyPlayEntry extends WeeklyPlayRow {
  readonly username: string
  readonly xp: number
  readonly avatarSpecies: AvatarSpecies
  readonly goldFrameUntil: number | null
}

/** A player's stored outcome of a finalised week (П8). */
export interface WeeklyResultRow {
  readonly weekId: string
  readonly userId: string
  /** Null without a win. */
  readonly place: number | null
  readonly participants: number
  readonly won: boolean
  readonly attempts: number | null
  readonly secs: number | null
  readonly xp: number
  readonly goldFrame: boolean
  readonly seenAt: number | null
  readonly createdAt: number
}

export type NewWeeklyResult = Omit<WeeklyResultRow, 'seenAt' | 'createdAt'>

/** Everything one finalisation writes, in one transaction. */
export interface WeeklyFinalization {
  readonly weekId: string
  readonly now: number
  readonly participants: number
  readonly results: readonly NewWeeklyResult[]
  /** `xp` of each result is added to the profile; `goldFrame` ones get this `gold_frame_until`. */
  readonly goldFrameUntil: number
}

export interface WeeklyRepo {
  /** Inserts the week unless it exists; returns the stored row (a concurrent first insert wins). */
  ensureWeek(week: NewWeek, now: number): Promise<WeekRow>
  week(weekId: string): Promise<WeekRow | null>
  /**
   * Creates the game and its play together; null (nothing written) when the player has a play on that day
   * already. The game must carry its `id`.
   */
  startPlay(game: NewGame & { readonly id: string }, play: NewWeeklyPlay): Promise<PublicGameRow | null>
  playOn(userId: string, day: string): Promise<WeeklyPlayRow | null>
  playByGame(gameId: string): Promise<WeeklyPlayRow | null>
  /** Unfinished plays of a player in a week. */
  openPlays(userId: string, weekId: string): Promise<WeeklyPlayRow[]>
  finishPlay(gameId: string, finish: WeeklyPlayFinish): Promise<void>
  /** Finished plays of a week (any order) with the player's profile; guests are left out. */
  finishedPlays(weekId: string): Promise<WeeklyPlayEntry[]>
  /** Weeks that ended at or before `now` and are not finalised yet. */
  dueWeeks(now: number): Promise<WeekRow[]>
  /**
   * Atomically writes the results, pays their XP, sets the gold frames and marks the week finalised. False
   * (and nothing written) when it was finalised already.
   */
  finalize(input: WeeklyFinalization): Promise<boolean>
  /** The newest unseen result of a player. */
  unseenResult(userId: string): Promise<WeeklyResultRow | null>
  markSeen(userId: string, now: number): Promise<void>
  /** Finalised weeks the player won at least once. */
  weeksWon(userId: string): Promise<number>
}

export interface Repo {
  readonly profiles: ProfilesRepo
  readonly games: GamesRepo
  readonly duels: DuelsRepo
  readonly badges: BadgesRepo
  readonly shares: SharesRepo
  readonly pasture: PastureRepo
  readonly farms: FarmsRepo
  readonly weekly: WeeklyRepo
}

/** A repo bound to resources that must be released when the request ends. */
export interface RepoHandle extends Repo {
  close(): Promise<void>
}
