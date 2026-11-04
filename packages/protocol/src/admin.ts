import { z } from 'zod'
import { GameKindSchema } from './rest'
import { ActivitySchema } from './presence'
import { FormatSchema, OpponentKindSchema } from './ws'

const count = z.number().int().nonnegative()

/** `GET /api/admin/overview`: how the app is doing; only for admins (`app_metadata.role`). */
export const AdminUsersDto = z.object({
  total: count,
  members: count,
  guests: count,
  new7d: count,
  new30d: count,
  /** Distinct players who created a game in the last 24 hours / 7 / 30 days. */
  active1d: count,
  active7d: count,
  active30d: count,
})
export type AdminUsersDto = z.infer<typeof AdminUsersDto>

/** One Sofia day; the overview has one per day, oldest first, zeros included. */
export const AdminDayDto = z.object({
  date: z.string(),
  newUsers: count,
  activeUsers: count,
  games: count,
})
export type AdminDayDto = z.infer<typeof AdminDayDto>

export const AdminKindDto = z.object({
  kind: GameKindSchema,
  total: count,
  finished: count,
  won: count,
  /** Percent of the finished games that were won, 0..100. */
  winRate: z.number().int(),
  /** Mean attempts of a won game, one decimal; null without wins. */
  avgAttempts: z.number().nullable(),
})
export type AdminKindDto = z.infer<typeof AdminKindDto>

export const AdminSocialDto = z.object({
  duels: count,
  duels7d: count,
  duelsByOpponent: z.object({ quick: count, friend: count, bot: count }),
  farms: count,
  farmMembers: count,
  shares: count,
  nudges: count,
  weeklyPlayers7d: count,
})
export type AdminSocialDto = z.infer<typeof AdminSocialDto>

export const AdminUserDto = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  isGuest: z.boolean(),
  level: z.number().int(),
  games: count,
  createdAt: z.number(),
  lastGameAt: z.number().nullable(),
  /** The last presence ping; null before presence existed or if the app was never opened since. */
  lastSeenAt: z.number().nullable(),
  /** The latest of the ping, the last game and sign-up; the list is ordered by it. */
  activeAt: z.number(),
})
export type AdminUserDto = z.infer<typeof AdminUserDto>

/** `GET /api/admin/users?offset=`: every profile, most recently active first, a page at a time. */
export const AdminUsersPageDto = z.object({
  users: z.array(AdminUserDto),
  total: count,
  offset: count,
  pageSize: count,
})
export type AdminUsersPageDto = z.infer<typeof AdminUsersPageDto>

export const AdminOverviewDto = z.object({
  generatedAt: z.number(),
  users: AdminUsersDto,
  days: z.array(AdminDayDto),
  games: z.object({ total: count, finished: count, won: count }),
  kinds: z.array(AdminKindDto),
  social: AdminSocialDto,
})
export type AdminOverviewDto = z.infer<typeof AdminOverviewDto>

export const AdminPlayerRefDto = z.object({ id: z.string(), username: z.string() })
export type AdminPlayerRefDto = z.infer<typeof AdminPlayerRefDto>

/** The duel a game was part of, seen from that game's player. */
export const AdminGameDuelDto = z.object({
  id: z.string(),
  format: FormatSchema,
  opponentKind: OpponentKindSchema,
  botLevel: z.number().int().nullable(),
  /** How it ended (`solved`, `resign`, `timeout`…); null while unknown. */
  outcome: z.string().nullable(),
  isRematch: z.boolean(),
  /** Null for a bot or a deleted profile. */
  opponent: AdminPlayerRefDto.nullable(),
  /** The opponent's own game row (null for a bot). */
  opponentGameId: z.string().nullable(),
})
export type AdminGameDuelDto = z.infer<typeof AdminGameDuelDto>

/** `GET /api/admin/games`: one row per game, newest first, secret included. */
export const AdminGameDto = z.object({
  id: z.string(),
  kind: GameKindSchema,
  len: z.number().int(),
  zero: z.boolean(),
  practice: z.boolean(),
  /** The number this player had to find. */
  secret: z.string(),
  attempts: count,
  won: z.boolean().nullable(),
  score: z.number().int(),
  suspicious: z.boolean(),
  usedNotes: z.boolean(),
  createdAt: z.number(),
  finishedAt: z.number().nullable(),
  player: AdminPlayerRefDto,
  duel: AdminGameDuelDto.nullable(),
})
export type AdminGameDto = z.infer<typeof AdminGameDto>

export const AdminGamesDto = z.object({
  games: z.array(AdminGameDto),
  /** `offset` of the next page; null on the last one. */
  nextOffset: z.number().int().nullable(),
})
export type AdminGamesDto = z.infer<typeof AdminGamesDto>

export const AdminGuessDto = z.object({
  guess: z.string(),
  bulls: count,
  cows: count,
  consistent: z.boolean(),
  at: z.number(),
})
export type AdminGuessDto = z.infer<typeof AdminGuessDto>

export const AdminGameSideDto = z.object({ game: AdminGameDto, guesses: z.array(AdminGuessDto) })
export type AdminGameSideDto = z.infer<typeof AdminGameSideDto>

/** `GET /api/admin/games/:id`: the game with every guess, and the opponent's side of a duel. */
export const AdminGameDetailDto = z.object({ side: AdminGameSideDto, opponent: AdminGameSideDto.nullable() })
export type AdminGameDetailDto = z.infer<typeof AdminGameDetailDto>

/** `GET /api/admin/online`: who pinged in the last minutes, what they have open and their unfinished game. */
export const AdminOnlinePlayerDto = z.object({
  id: z.string(),
  username: z.string(),
  isGuest: z.boolean(),
  level: z.number().int(),
  activity: ActivitySchema.nullable(),
  lastSeenAt: z.number(),
  /** The newest unfinished solo game (a duel is written only when it ends). */
  game: AdminGameDto.nullable(),
})
export type AdminOnlinePlayerDto = z.infer<typeof AdminOnlinePlayerDto>

export const AdminOnlineDto = z.object({
  /** How far back „online“ reaches, in minutes. */
  windowMinutes: z.number().int(),
  players: z.array(AdminOnlinePlayerDto),
})
export type AdminOnlineDto = z.infer<typeof AdminOnlineDto>
