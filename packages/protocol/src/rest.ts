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

export const LangSchema = z.enum(['bg', 'en'])
export const GameKindSchema = z.enum(['daily', 'free', 'duel_race', 'duel_classic', 'bot'])
export const PeriodSchema = z.enum(['today', 'week', 'all'])
/** Mirrors `RANK_KEYS` in game-core; the client translates them. */
export const RankKeySchema = z.enum([
  'calf',
  'herdsman',
  'shepherd',
  'pastor',
  'steward',
  'chiefBull',
])
export type RankKey = z.infer<typeof RankKeySchema>

/** Which character a player's avatar is drawn as; `profiles.avatar_species`. */
export const SpeciesSchema = z.enum(['bull', 'cow'])
export type AvatarSpecies = z.infer<typeof SpeciesSchema>

export const BADGE_KEYS = [
  'firstBull',
  'noWaste',
  'underMinute',
  'streak7',
  'chiefBull',
  'fiveDigits',
] as const
export const BadgeKeySchema = z.enum(BADGE_KEYS)
export type BadgeKey = z.infer<typeof BadgeKeySchema>

export const DistributionDto = z.object({
  histogram: z.array(z.number()),
  sample: z.number().int(),
  fallback: z.boolean(),
})
export type DistributionDto = z.infer<typeof DistributionDto>

export const LeaderboardRowDto = z.object({
  rank: z.number().int(),
  username: z.string(),
  attempts: z.number().int(),
  score: z.number().int(),
  you: z.boolean(),
  level: z.number().int(),
  rankKey: RankKeySchema,
  avatarSpecies: SpeciesSchema,
})
export type LeaderboardRowDto = z.infer<typeof LeaderboardRowDto>

export const LeaderboardDto = z.object({
  rows: z.array(LeaderboardRowDto),
  me: z
    .object({ rank: z.number().int(), score: z.number().int(), top: z.number().int() })
    .nullable(),
})
export type LeaderboardDto = z.infer<typeof LeaderboardDto>

export const ProfileDto = z.object({
  id: z.string(),
  username: z.string(),
  isGuest: z.boolean(),
  lang: LangSchema,
  sound: z.boolean(),
  vibrate: z.boolean(),
  defaultLen: LenSchema,
  avatarSpecies: SpeciesSchema,
})
export type ProfileDto = z.infer<typeof ProfileDto>

/** Wins per attempt count; the last bucket (`attempts: 10`) means ten or more. */
export const BucketDto = z.object({ attempts: z.number().int(), count: z.number().int() })
export type BucketDto = z.infer<typeof BucketDto>

export const RecentGameDto = z.object({
  id: z.string(),
  kind: GameKindSchema,
  len: LenSchema,
  zero: z.boolean(),
  won: z.boolean(),
  attempts: z.number().int(),
  score: z.number().int(),
  finishedAt: z.number(),
  practice: z.boolean(),
})
export type RecentGameDto = z.infer<typeof RecentGameDto>

export const MeDto = z.object({
  profile: ProfileDto,
  xp: z.number().int(),
  level: z.number().int(),
  xpIntoLevel: z.number().int(),
  rankKey: RankKeySchema,
  rating: z.number().int(),
  /** The most recent unfinished solo game, to resume after a reload. */
  currentGameId: z.string().nullable(),
  stats: z.object({
    played: z.number().int(),
    /** Percent, 0..100. */
    winRate: z.number().int(),
    streak: z.number().int(),
    best: z.number().int().nullable(),
  }),
  buckets: z.array(BucketDto),
  badges: z.record(BadgeKeySchema, z.boolean()),
  recent: z.array(RecentGameDto),
})
export type MeDto = z.infer<typeof MeDto>

/** Only these fields; anything else (xp, rating, username...) is rejected. */
export const SettingsPatch = z
  .object({
    sound: z.boolean().optional(),
    vibrate: z.boolean().optional(),
    defaultLen: LenSchema.optional(),
    lang: LangSchema.optional(),
    avatarSpecies: SpeciesSchema.optional(),
  })
  .strict()
export type SettingsPatch = z.infer<typeof SettingsPatch>

const USERNAME_CHARS = /^[\p{L}\p{N}_\- ]+$/u

/** Trimmed, inner whitespace collapsed to one space; 2–20 letters (any script), digits, _ - space. */
export const UsernameSchema = z
  .string()
  .max(100)
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(2).max(20).regex(USERNAME_CHARS))

export const EmailSchema = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase())
export const PasswordSchema = z.string().min(6).max(72)

export const RegisterBody = z.object({
  username: UsernameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  lang: LangSchema.optional(),
})
export type RegisterBody = z.infer<typeof RegisterBody>

/** `identifier` is a username or an email. */
export const LoginBody = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
})
export type LoginBody = z.infer<typeof LoginBody>

export const UpgradeBody = z.object({
  username: UsernameSchema,
  email: EmailSchema,
  password: PasswordSchema,
})
export type UpgradeBody = z.infer<typeof UpgradeBody>

export const ResetBody = z.object({ email: EmailSchema })
export type ResetBody = z.infer<typeof ResetBody>

export const AuthResponseDto = z.object({ session: SessionDto, me: MeDto })
export type AuthResponseDto = z.infer<typeof AuthResponseDto>

/** `POST /api/auth/guest` with the Bearer of a client-side anonymous sign-in: the client keeps its own session. */
export const GuestProfileResponseDto = z.object({ session: z.null(), me: MeDto })
export type GuestProfileResponseDto = z.infer<typeof GuestProfileResponseDto>

export const ResetResponseDto = z.object({ sent: z.literal(true) })
export type ResetResponseDto = z.infer<typeof ResetResponseDto>

/** Query strings carry text; these turn `?len=4&zero=false` into typed values. */
const LenQuery = z.enum(['3', '4', '5']).transform((v) => Number(v) as 3 | 4 | 5)
const BoolQuery = z.enum(['true', 'false']).transform((v) => v === 'true')

export const DistributionQuery = z.object({ len: LenQuery, zero: BoolQuery, kind: KindSchema })
export type DistributionQuery = z.infer<typeof DistributionQuery>

export const LeaderboardQuery = z.object({ period: PeriodSchema, len: LenQuery, zero: BoolQuery })
export type LeaderboardQuery = z.infer<typeof LeaderboardQuery>

/** Duel formats a room can run. */
export const DuelFormatSchema = z.enum(['race', 'classic'])
export type DuelFormat = z.infer<typeof DuelFormatSchema>

export const CreateInviteBody = z.object({
  len: LenSchema,
  zero: ZeroSchema,
  format: DuelFormatSchema,
})
export type CreateInviteBody = z.infer<typeof CreateInviteBody>

export const InviteSettingsDto = z.object({
  format: DuelFormatSchema,
  len: LenSchema,
  zero: ZeroSchema,
})
export type InviteSettingsDto = z.infer<typeof InviteSettingsDto>

export const InviteDto = z.object({
  code: z.string(),
  url: z.string(),
  roomId: z.string(),
  token: z.string(),
})
export type InviteDto = z.infer<typeof InviteDto>

export const InviteInfoDto = z.object({
  status: z.enum(['waiting', 'started']),
  host: z.object({ username: z.string(), level: z.number().int(), avatarSpecies: SpeciesSchema }),
  settings: InviteSettingsDto,
})
export type InviteInfoDto = z.infer<typeof InviteInfoDto>

export const JoinInviteDto = z.object({ roomId: z.string(), token: z.string() })
export type JoinInviteDto = z.infer<typeof JoinInviteDto>

export const BotLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])

export const CreateBotBody = z.object({
  len: LenSchema,
  zero: ZeroSchema,
  format: DuelFormatSchema,
  level: BotLevelSchema,
})
export type CreateBotBody = z.infer<typeof CreateBotBody>

export const BotRoomDto = z.object({ roomId: z.string(), token: z.string() })
export type BotRoomDto = z.infer<typeof BotRoomDto>
