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
