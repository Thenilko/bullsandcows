import { z } from 'zod'
import { NewBadgeDto, RankKeySchema, SpeciesSchema } from './rest'

/** „Семейна ферма“ (spec ЧАСТ 2): at most this many members, the owner included. */
export const FARM_MAX_MEMBERS = 12
export const FARM_NAME_MAX = 40

/** Trimmed, inner whitespace collapsed; 1–40 characters. */
export const FarmNameSchema = z
  .string()
  .max(200)
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1).max(FARM_NAME_MAX))

/** Mirrors `INVITE_ALPHABET` of game-core (no I, O, 0, 1); any case is accepted and upper-cased. */
const FARM_CODE = /^[A-HJ-NP-Z2-9]{5}$/
export const FarmCodeSchema = z
  .string()
  .max(16)
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(FARM_CODE))

export const CreateFarmBody = z.object({ name: FarmNameSchema }).strict()
export type CreateFarmBody = z.infer<typeof CreateFarmBody>

export const JoinFarmBody = z.object({ code: FarmCodeSchema }).strict()
export type JoinFarmBody = z.infer<typeof JoinFarmBody>

export const RenameFarmBody = z.object({ name: FarmNameSchema }).strict()
export type RenameFarmBody = z.infer<typeof RenameFarmBody>

export const NudgeBody = z.object({ userId: z.string().min(1).max(64) }).strict()
export type NudgeBody = z.infer<typeof NudgeBody>

export const FarmRoleSchema = z.enum(['owner', 'member'])
export type FarmRole = z.infer<typeof FarmRoleSchema>

/** A member's best counted number of the day today (Sofia); `secs` is null when the start is unknown. */
export const FarmTodayDto = z.object({
  attempts: z.number().int(),
  secs: z.number().int().nullable(),
  won: z.boolean(),
})
export type FarmTodayDto = z.infer<typeof FarmTodayDto>

export const FarmMemberDto = z.object({
  userId: z.string(),
  username: z.string(),
  level: z.number().int(),
  rankKey: RankKeySchema,
  avatarSpecies: SpeciesSchema,
  role: FarmRoleSchema,
  you: z.boolean(),
  joinedAt: z.number(),
  /** Null: has not played today's number of the day (yet). */
  today: FarmTodayDto.nullable(),
  /** Sum of the scores of the numbers of the day, Monday–Sunday (Sofia). */
  weekPoints: z.number().int(),
  /** You already nudged this member today (one per day). */
  nudged: z.boolean(),
  /** The weekly challenge's gold frame is active. */
  goldFrame: z.boolean().optional(),
})
export type FarmMemberDto = z.infer<typeof FarmMemberDto>

/** `GET /api/farms/me` (and the answer of create / join / patch): members oldest first. */
export const FarmDto = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  role: FarmRoleSchema,
  maxMembers: z.number().int(),
  /** The number of the day („#127“) the „today“ column is about. */
  dailyNumber: z.number().int(),
  members: z.array(FarmMemberDto),
})
export type FarmDto = z.infer<typeof FarmDto>

/** `GET /api/farms/me`: `farm` is null outside a farm. */
export const MyFarmDto = z.object({ farm: FarmDto.nullable() })
export type MyFarmDto = z.infer<typeof MyFarmDto>

/** `POST /api/farms` and `POST /api/farms/join`: the farm and the badges earned by it („Семейна ферма“). */
export const FarmJoinedDto = z.object({ farm: FarmDto, newBadges: z.array(NewBadgeDto) })
export type FarmJoinedDto = z.infer<typeof FarmJoinedDto>

/** An unread nudge for today: who sent it and how many in the farm have played. */
export const NudgeDto = z.object({
  fromUserId: z.string(),
  fromUsername: z.string(),
  fromRankKey: RankKeySchema,
  fromSpecies: SpeciesSchema,
  played: z.number().int(),
  members: z.number().int(),
})
export type NudgeDto = z.infer<typeof NudgeDto>

/** `GET /api/farms/me/nudge`: null without an unread nudge today (or once today's number is played). */
export const MyNudgeDto = z.object({ nudge: NudgeDto.nullable() })
export type MyNudgeDto = z.infer<typeof MyNudgeDto>

export const OkDto = z.object({ done: z.literal(true) })
export type OkDto = z.infer<typeof OkDto>
