import { z } from 'zod'
import {
  DuelFormatSchema,
  InviteDto,
  InviteSettingsDto,
  LenSchema,
  SpeciesSchema,
  ZeroSchema,
} from './rest'

/** A challenge stays open this long; the invite room behind it lives longer. */
export const CHALLENGE_TTL_MS = 10 * 60_000

export const ChallengeStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'expired',
])
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>

/** `POST /api/challenges`: challenge an online member from the leaderboard to a live duel. */
export const CreateChallengeBody = z.object({
  to: z.uuid(),
  len: LenSchema,
  zero: ZeroSchema,
  format: DuelFormatSchema,
})
export type CreateChallengeBody = z.infer<typeof CreateChallengeBody>

/** The sender's waiting screen: the invite room plus who was challenged. */
export const CreatedChallengeDto = InviteDto.extend({
  challengeId: z.uuid(),
  toUsername: z.string(),
})
export type CreatedChallengeDto = z.infer<typeof CreatedChallengeDto>

/** An incoming challenge as the target's card shows it; `expiresAt` in Unix ms. */
export const ChallengeDto = z.object({
  id: z.uuid(),
  from: z.object({ username: z.string(), level: z.number().int(), avatarSpecies: SpeciesSchema }),
  settings: InviteSettingsDto,
  expiresAt: z.number().int(),
  /** The target answered „След играта“ during a game: the sender waits for them to finish. */
  later: z.boolean().optional(),
})
export type ChallengeDto = z.infer<typeof ChallengeDto>

export const IncomingChallengesDto = z.object({ challenges: z.array(ChallengeDto) })
export type IncomingChallengesDto = z.infer<typeof IncomingChallengesDto>

export const ChallengeStatusDto = z.object({
  status: ChallengeStatusSchema,
  /** Pending, and the target answered „След играта“. */
  later: z.boolean().optional(),
  /** Pending, and the target is online in a game, a duel or matchmaking right now. */
  playing: z.boolean().optional(),
})
export type ChallengeStatusDto = z.infer<typeof ChallengeStatusDto>
