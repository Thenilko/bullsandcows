import { z } from 'zod'
import { RankKeySchema, SpeciesSchema, WeeklyRuleDto } from './rest'

/** A player's best game of the week: a win beats a loss, then fewer attempts, then less time. */
export const WeeklyBestDto = z.object({
  won: z.boolean(),
  attempts: z.number().int(),
  secs: z.number().int().nullable(),
})
export type WeeklyBestDto = z.infer<typeof WeeklyBestDto>

/** One ranked player (only wins are ranked). */
export const WeeklyRowDto = z.object({
  rank: z.number().int(),
  username: z.string(),
  attempts: z.number().int(),
  secs: z.number().int().nullable(),
  you: z.boolean(),
  level: z.number().int(),
  rankKey: RankKeySchema,
  avatarSpecies: SpeciesSchema,
  /** The gold frame of a top-10 finish in the previous week is active. */
  goldFrame: z.boolean(),
})
export type WeeklyRowDto = z.infer<typeof WeeklyRowDto>

/** П8: the result of a finalised week, shown once (`POST /api/weekly/award/seen`). */
export const WeeklyAwardDto = z.object({
  weekId: z.string(),
  week: z.number().int(),
  /** Null without a win (losses are recorded but never ranked). */
  place: z.number().int().nullable(),
  participants: z.number().int(),
  won: z.boolean(),
  attempts: z.number().int().nullable(),
  secs: z.number().int().nullable(),
  xp: z.number().int(),
  /** Top 10: the gold frame until the end of the next week. */
  goldFrame: z.boolean(),
  /** Weeks won so far (the „Седмичник“ badge's progress). */
  weeksWon: z.number().int(),
})
export type WeeklyAwardDto = z.infer<typeof WeeklyAwardDto>

/** Today's weekly game (one per Sofia day): resumed while unfinished. */
export const WeeklyTodayDto = z.object({ gameId: z.string(), finished: z.boolean() })
export type WeeklyTodayDto = z.infer<typeof WeeklyTodayDto>

/** `GET /api/weekly`: the current week. The secret is never part of it. */
export const WeeklyDto = z.object({
  weekId: z.string(),
  week: z.number().int(),
  /** Sofia dates of the Monday and the Sunday. */
  monday: z.string(),
  sunday: z.string(),
  endsAt: z.number(),
  rule: WeeklyRuleDto,
  xp: z.number().int(),
  best: WeeklyBestDto.nullable(),
  /** Null without a win this week. */
  place: z.number().int().nullable(),
  top: z.array(WeeklyRowDto),
  /** Players with a finished game this week. */
  participants: z.number().int(),
  /** Today's game is finished: the CTA waits until tomorrow („Утре пак“). */
  playedToday: z.boolean(),
  today: WeeklyTodayDto.nullable(),
  /** The last finalised week's result, until it has been seen. */
  award: WeeklyAwardDto.nullable(),
})
export type WeeklyDto = z.infer<typeof WeeklyDto>

/** `GET /api/weekly/{week}/board?limit=50`. */
export const WeeklyBoardQuery = z.object({
  limit: z
    .string()
    .regex(/^\d{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
})
export type WeeklyBoardQuery = z.infer<typeof WeeklyBoardQuery>

export const WeeklyBoardDto = z.object({
  weekId: z.string(),
  week: z.number().int(),
  rule: WeeklyRuleDto,
  rows: z.array(WeeklyRowDto),
  /** Your row also when it is below `limit`; null without a win. */
  me: WeeklyRowDto.nullable(),
  participants: z.number().int(),
  finalized: z.boolean(),
})
export type WeeklyBoardDto = z.infer<typeof WeeklyBoardDto>
