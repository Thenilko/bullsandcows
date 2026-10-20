import { z } from 'zod'

export const LenSchema = z.union([z.literal(3), z.literal(4), z.literal(5)])
export const ZeroSchema = z.boolean()
/** Kinds a client may start over REST; duel and bot games are created by rooms. */
export const KindSchema = z.enum(['daily', 'free'])

export const HealthDto = z.object({ status: z.literal('ok') })
export type HealthDto = z.infer<typeof HealthDto>

export const AuthUserDto = z.object({ id: z.string().min(1), isGuest: z.boolean() })
export type AuthUserDto = z.infer<typeof AuthUserDto>

export const SessionDto = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string(),
  expiresAt: z.number().int(),
  user: AuthUserDto,
})
export type SessionDto = z.infer<typeof SessionDto>

export const CreateGameBody = z.object({ len: LenSchema, zero: ZeroSchema, kind: KindSchema })
export type CreateGameBody = z.infer<typeof CreateGameBody>

/** Only the shape is checked here; whether the code is valid for the game is `ERR_CODE`. */
export const GuessBody = z.object({ guess: z.string().max(16) })
export type GuessBody = z.infer<typeof GuessBody>

export const GuessEntryDto = z.object({
  guess: z.string(),
  bulls: z.number().int(),
  cows: z.number().int(),
  consistent: z.boolean(),
  left: z.number().int(),
})
export type GuessEntryDto = z.infer<typeof GuessEntryDto>

export const GuessResultDto = z.object({
  bulls: z.number().int(),
  cows: z.number().int(),
  consistent: z.boolean(),
  left: z.number().int(),
  solved: z.boolean(),
  score: z.number().int().optional(),
})
export type GuessResultDto = z.infer<typeof GuessResultDto>

export const GameViewDto = z.object({
  id: z.string(),
  kind: KindSchema,
  len: LenSchema,
  zero: ZeroSchema,
  practice: z.boolean(),
  total: z.number().int(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
  won: z.boolean().nullable(),
  score: z.number().int().nullable(),
  attempts: z.number().int(),
  guesses: z.array(GuessEntryDto),
  /** Present only once the game is finished. */
  secret: z.string().optional(),
})
export type GameViewDto = z.infer<typeof GameViewDto>
