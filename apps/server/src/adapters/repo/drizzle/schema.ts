import type { Len, WeeklyRuleKey } from '@bc/game-core'
import type { Lang } from '@bc/i18n'
import type { AvatarSpecies, BadgeKey, BarnColor, PastureKey, ShareChannel } from '@bc/protocol'
import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  char,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { DuelFormat, GameKind, OpponentKind } from '../../../ports/repo'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const lenColumn = () => smallint('len').$type<Len>().notNull()
const lenCheck = (table: string, column: AnyPgColumn) =>
  check(`${table}_len_check`, sql`${column} between 3 and 5`)

/**
 * Row level security is enabled on every table without policies: the Supabase Data API
 * (anon/authenticated roles) sees nothing, while the Worker connects as the owner role
 * through Hyperdrive. `profiles.id` equals the Supabase auth user id, without a foreign
 * key to `auth.users`, because the Worker's role is not guaranteed to see that schema.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    username: text('username').notNull(),
    usernameLower: text('username_lower').notNull(),
    email: text('email'),
    isGuest: boolean('is_guest').notNull().default(false),
    lang: text('lang').$type<Lang>().notNull().default('bg'),
    sound: boolean('sound').notNull().default(true),
    vibrate: boolean('vibrate').notNull().default(true),
    defaultLen: smallint('default_len').$type<Len>().notNull().default(4),
    avatarSpecies: text('avatar_species').$type<AvatarSpecies>().notNull().default('bull'),
    xp: integer('xp').notNull().default(0),
    rating: doublePrecision('rating').notNull().default(1500),
    ratingDev: doublePrecision('rating_dev').notNull().default(350),
    volatility: doublePrecision('volatility').notNull().default(0.06),
    /** Consecutive Sofia days with a won number of the day, as of `streakDate`. */
    currentStreak: integer('current_streak').notNull().default(0),
    bestStreak: integer('best_streak').notNull().default(0),
    streakDate: date('streak_date', { mode: 'string' }),
    /** Version of the progression backfill applied to this profile (see docs/PROGRESSION.md). */
    progressVersion: smallint('progress_version').notNull().default(0),
    /** „Напомняне всеки ден?“: 'HH:MM' (Sofia), only stored for now (no push yet). */
    reminderTime: text('reminder_time'),
    /** The weekly challenge's gold frame (top 10) is worn until then. */
    goldFrameUntil: ts('gold_frame_until'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('profiles_username_lower_idx').on(t.usernameLower),
    check('profiles_lang_check', sql`${t.lang} in ('bg', 'en')`),
    check('profiles_avatar_species_check', sql`${t.avatarSpecies} in ('bull', 'cow')`),
    check('profiles_default_len_check', sql`${t.defaultLen} between 3 and 5`),
  ],
).enableRLS()

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<GameKind>().notNull(),
    len: lenColumn(),
    zero: boolean('zero').notNull(),
    secret: text('secret').notNull(),
    dailyDate: date('daily_date', { mode: 'string' }),
    practice: boolean('practice').notNull().default(false),
    startedAt: ts('started_at'),
    finishedAt: ts('finished_at'),
    attempts: integer('attempts').notNull().default(0),
    wasted: integer('wasted').notNull().default(0),
    won: boolean('won'),
    score: integer('score').notNull().default(0),
    suspicious: boolean('suspicious').notNull().default(false),
    /** The notebook was used at least once (the client reports it; sticky). */
    usedNotes: boolean('used_notes').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('games_user_created_idx').on(t.userId, t.createdAt),
    index('games_daily_idx').on(t.kind, t.len, t.zero, t.dailyDate, t.won),
    index('games_finished_idx').on(t.kind, t.len, t.zero, t.finishedAt, t.won),
    // At most one counted daily game per player, date and settings; repeats are practice.
    uniqueIndex('games_daily_counted_idx')
      .on(t.userId, t.dailyDate, t.len, t.zero)
      .where(sql`${t.kind} = 'daily' and not ${t.practice}`),
    check(
      'games_kind_check',
      sql`${t.kind} in ('daily', 'free', 'duel_race', 'duel_classic', 'bot', 'weekly')`,
    ),
    lenCheck('games', t.len),
  ],
).enableRLS()

export const guesses = pgTable(
  'guesses',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    guess: text('guess').notNull(),
    bulls: smallint('bulls').notNull(),
    cows: smallint('cows').notNull(),
    consistent: boolean('consistent').notNull(),
    at: ts('at').notNull(),
  },
  (t) => [
    index('guesses_game_idx').on(t.gameId, t.id),
    // A code can be guessed once per game, also when two requests race the repeat check.
    uniqueIndex('guesses_game_guess_idx').on(t.gameId, t.guess),
  ],
).enableRLS()

export const duels = pgTable(
  'duels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    format: text('format').$type<DuelFormat>().notNull(),
    len: lenColumn(),
    zero: boolean('zero').notNull(),
    opponentKind: text('opponent_kind').$type<OpponentKind>().notNull(),
    botLevel: smallint('bot_level'),
    inviteCode: text('invite_code'),
    playerA: uuid('player_a')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    playerB: uuid('player_b').references(() => profiles.id, { onDelete: 'set null' }),
    gameA: uuid('game_a').references(() => games.id, { onDelete: 'set null' }),
    gameB: uuid('game_b').references(() => games.id, { onDelete: 'set null' }),
    winner: uuid('winner'),
    outcome: text('outcome'),
    ratingDeltaA: doublePrecision('rating_delta_a'),
    ratingDeltaB: doublePrecision('rating_delta_b'),
    createdAt: ts('created_at').notNull().defaultNow(),
    finishedAt: ts('finished_at'),
    /** XP/ratings credited; flipped once, in the transaction that credits them. */
    rewardsApplied: boolean('rewards_applied').notNull().default(false),
    /** The match was accepted as a rematch of the previous one in the room. */
    isRematch: boolean('is_rematch').notNull().default(false),
    /** The winner won after the loser had exactly one candidate left (badge „comeback“). */
    comeback: boolean('comeback').notNull().default(false),
  },
  (t) => [
    index('duels_invite_code_idx').on(t.inviteCode),
    check('duels_format_check', sql`${t.format} in ('race', 'classic')`),
    check('duels_opponent_kind_check', sql`${t.opponentKind} in ('quick', 'friend', 'bot')`),
    lenCheck('duels', t.len),
  ],
).enableRLS()

/**
 * One row per badge a player has progress in; `tier` (0–3) and `progress` only ever grow and
 * `earned_at` is when the current tier was reached. Rows are never removed.
 */
export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    badgeKey: text('badge_key').$type<BadgeKey>().notNull(),
    tier: smallint('tier').notNull().default(0),
    progress: integer('progress').notNull().default(0),
    earnedAt: ts('earned_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeKey] })],
).enableRLS()

/** A shared result: one row per (user, game) however often it is shared; no personal data. */
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    channel: text('channel').$type<ShareChannel>().notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('shares_user_game_idx').on(t.userId, t.gameId),
    check('shares_channel_check', sql`${t.channel} in ('native', 'copy', 'image')`),
  ],
).enableRLS()

/** Materialised daily numbers for auditing (the salt itself is the DAILY_SALT secret). */
export const dailyNumbers = pgTable(
  'daily_numbers',
  {
    date: date('date', { mode: 'string' }).notNull(),
    len: lenColumn(),
    zero: boolean('zero').notNull(),
    idx: integer('idx').notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.len, t.zero] })],
).enableRLS()

/**
 * The player's choices for „Твоето пасище“: rewards hidden from the scene and the barn colour. What is
 * unlocked is never stored (it follows from the level and `user_badges`); no row means the defaults.
 */
export const userPasture = pgTable(
  'user_pasture',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    hiddenItems: text('hidden_items')
      .array()
      .$type<PastureKey[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    barnColor: text('barn_color').$type<BarnColor>().notNull().default('red'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'user_pasture_barn_color_check',
      sql`${t.barnColor} in ('red', 'blue', 'green', 'yellow', 'purple')`,
    ),
  ],
).enableRLS()

/**
 * „Семейна ферма“: a closed board of up to 12 players. `invite_code` (5 characters of the duel alphabet) is
 * unique; the owner is always a member too.
 */
export const farms = pgTable(
  'farms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    inviteCode: char('invite_code', { length: 5 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('farms_invite_code_idx').on(t.inviteCode),
    check('farms_name_check', sql`char_length(${t.name}) between 1 and 40`),
  ],
).enableRLS()

/** One row per member; `user_id` is unique, so nobody is in two farms. `invited_by`: the owner whose code was used. */
export const farmMembers = pgTable(
  'farm_members',
  {
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    joinedAt: ts('joined_at').notNull().defaultNow(),
    invitedBy: uuid('invited_by').references(() => profiles.id, { onDelete: 'set null' }),
  },
  (t) => [
    uniqueIndex('farm_members_user_idx').on(t.userId),
    index('farm_members_farm_idx').on(t.farmId, t.joinedAt),
    index('farm_members_invited_by_idx').on(t.invitedBy),
  ],
).enableRLS()

/** „Напомни“: at most one per (from, to, Sofia day); `read_at` once the × was pressed. */
export const nudges = pgTable(
  'nudges',
  {
    fromUser: uuid('from_user')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    toUser: uuid('to_user')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    readAt: ts('read_at'),
  },
  (t) => [
    primaryKey({ columns: [t.fromUser, t.toUser, t.day] }),
    index('nudges_to_day_idx').on(t.toUser, t.day),
  ],
).enableRLS()

/**
 * „Седмично предизвикателство“: one row per week, created on first need with the one secret for everyone
 * (never sent to a client). `finalized_at` is set once, in the transaction that pays the week's rewards.
 */
export const weekly = pgTable(
  'weekly',
  {
    weekId: text('week_id').primaryKey(),
    ruleKey: text('rule_key').$type<WeeklyRuleKey>().notNull(),
    secret: text('secret').notNull(),
    endsAt: ts('ends_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    finalizedAt: ts('finalized_at'),
    participants: integer('participants'),
  },
  (t) => [
    check('weekly_week_id_check', sql`${t.weekId} ~ '^[0-9]{4}-W[0-9]{2}$'`),
    check(
      'weekly_rule_key_check',
      sql`${t.ruleKey} in ('fiveZero', 'threeNoZero', 'quickFour', 'fourZero')`,
    ),
    index('weekly_due_idx')
      .on(t.endsAt)
      .where(sql`${t.finalizedAt} is null`),
  ],
).enableRLS()

/** One weekly game per player and Sofia day (`weekly_plays_user_day_idx`); `secs` is set when it ends. */
export const weeklyPlays = pgTable(
  'weekly_plays',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    weekId: text('week_id')
      .notNull()
      .references(() => weekly.weekId, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    gameId: uuid('game_id')
      .primaryKey()
      .references(() => games.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').notNull().default(0),
    secs: integer('secs'),
    won: boolean('won').notNull().default(false),
    finishedAt: ts('finished_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('weekly_plays_user_day_idx').on(t.userId, t.day),
    index('weekly_plays_week_idx').on(t.weekId, t.userId),
  ],
).enableRLS()

/** The outcome of a finalised week per participant (П8); `seen_at` once the modal was shown. */
export const weeklyResults = pgTable(
  'weekly_results',
  {
    weekId: text('week_id')
      .notNull()
      .references(() => weekly.weekId, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    place: integer('place'),
    participants: integer('participants').notNull(),
    won: boolean('won').notNull(),
    attempts: integer('attempts'),
    secs: integer('secs'),
    xp: integer('xp').notNull().default(0),
    goldFrame: boolean('gold_frame').notNull().default(false),
    seenAt: ts('seen_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.weekId, t.userId] }),
    index('weekly_results_user_idx').on(t.userId, t.weekId),
  ],
).enableRLS()
