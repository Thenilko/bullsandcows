import { z } from 'zod'
import { GameKindSchema } from './rest'

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
})
export type AdminUserDto = z.infer<typeof AdminUserDto>

export const AdminOverviewDto = z.object({
  generatedAt: z.number(),
  users: AdminUsersDto,
  days: z.array(AdminDayDto),
  games: z.object({ total: count, finished: count, won: count }),
  kinds: z.array(AdminKindDto),
  social: AdminSocialDto,
  recentUsers: z.array(AdminUserDto),
})
export type AdminOverviewDto = z.infer<typeof AdminOverviewDto>
