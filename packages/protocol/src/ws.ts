import { z } from 'zod'
import { ERROR_CODES } from './errors'
import { BotLevelSchema, LenSchema, ZeroSchema } from './rest'

/** WebSocket message schemas shared by the duel/queue rooms and the client. */
export const WS_PROTOCOL_VERSION = 1

export const ErrorCodeSchema = z.enum(ERROR_CODES)
export const FormatSchema = z.enum(['race', 'classic'])
export type Format = z.infer<typeof FormatSchema>
export const OpponentKindSchema = z.enum(['quick', 'friend', 'bot'])
export type OpponentKind = z.infer<typeof OpponentKindSchema>
export const SeatSchema = z.enum(['a', 'b'])
export type Seat = z.infer<typeof SeatSchema>
export const PhaseSchema = z.enum(['lobby', 'secrets', 'countdown', 'playing', 'ended'])
export type Phase = z.infer<typeof PhaseSchema>
export const OutcomeSchema = z.enum(['win', 'draw', 'lose'])
export const EndReasonSchema = z.enum(['solved', 'giveUp', 'timeout', 'disconnect', 'cap', 'draw'])
export type EndReason = z.infer<typeof EndReasonSchema>

/** Only the shape is checked here; whether the code is valid for the match is `ERR_CODE`. */
const CodeInput = z.string().max(16)
const Int = z.number().int()

// ── client → DuelRoom ──────────────────────────────────────────────────────

export const ClientMsg = z.discriminatedUnion('t', [
  z.object({ t: z.literal('ready') }),
  z.object({ t: z.literal('secret'), code: CodeInput }),
  z.object({ t: z.literal('guess'), code: CodeInput }),
  z.object({ t: z.literal('giveUp') }),
  z.object({ t: z.literal('rematch') }),
])
export type ClientMsg = z.infer<typeof ClientMsg>

// ── DuelRoom → client ──────────────────────────────────────────────────────

export const MyGuessDto = z.object({
  guess: z.string(),
  bulls: Int,
  cows: Int,
  consistent: z.boolean(),
  at: z.number(),
})
export type MyGuessDto = z.infer<typeof MyGuessDto>

/** The opponent's guesses never carry the code (unknown keys are stripped). */
export const OppGuessDto = z.object({ bulls: Int, cows: Int, at: z.number() })
export type OppGuessDto = z.infer<typeof OppGuessDto>

const PublicPlayerBase = z.object({
  id: z.string(),
  username: z.string(),
  level: Int,
  /** Rounded display rating. */
  rating: Int,
  isGuest: z.boolean(),
  ready: z.boolean(),
  hasSecret: z.boolean(),
  left: Int,
  connected: z.boolean(),
  disconnectedAt: z.number().nullable(),
})
export const PublicMe = PublicPlayerBase.extend({ guesses: z.array(MyGuessDto) })
export type PublicMe = z.infer<typeof PublicMe>
export const PublicOpp = PublicPlayerBase.extend({ guesses: z.array(OppGuessDto) })
export type PublicOpp = z.infer<typeof PublicOpp>
export type PublicPlayer = PublicMe | PublicOpp

export const MatchOutcomeDto = z.object({ winner: SeatSchema.nullable(), reason: EndReasonSchema })
export type MatchOutcomeDto = z.infer<typeof MatchOutcomeDto>

/** Secrets are revealed only once the match has ended; null if one was never chosen. */
export const RevealedSecrets = z.object({
  mine: z.string().nullable(),
  theirs: z.string().nullable(),
})
export type RevealedSecrets = z.infer<typeof RevealedSecrets>

export const PublicState = z.object({
  format: FormatSchema,
  len: LenSchema,
  zero: ZeroSchema,
  opponentKind: OpponentKindSchema,
  botLevel: BotLevelSchema.nullable(),
  phase: PhaseSchema,
  me: PublicMe,
  opp: PublicOpp.nullable(),
  mySeat: SeatSchema,
  turn: SeatSchema.nullable(),
  firstMover: SeatSchema.nullable(),
  countdownAt: z.number().nullable(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  turnDeadline: z.number().nullable(),
  outcome: MatchOutcomeDto.nullable(),
  secrets: RevealedSecrets.optional(),
})
export type PublicState = z.infer<typeof PublicState>

export const RatingChangeDto = z.object({ from: Int, to: Int, delta: Int })
export type RatingChangeDto = z.infer<typeof RatingChangeDto>

export const ServerMsg = z.discriminatedUnion('t', [
  z.object({ t: z.literal('state'), state: PublicState }),
  z.object({
    t: z.literal('verdict'),
    guess: z.string(),
    bulls: Int,
    cows: Int,
    consistent: z.boolean(),
    left: Int,
    attempts: Int,
  }),
  z.object({ t: z.literal('oppMoved'), attempts: Int, left: Int, solved: z.boolean().optional() }),
  z.object({ t: z.literal('countdown'), startAt: z.number() }),
  z.object({ t: z.literal('started'), startedAt: z.number() }),
  z.object({ t: z.literal('warning'), msLeft: z.number() }),
  z.object({
    t: z.literal('ended'),
    outcome: OutcomeSchema,
    reason: EndReasonSchema,
    secrets: RevealedSecrets,
    rating: RatingChangeDto.nullable(),
    xp: Int,
  }),
  z.object({ t: z.literal('rematchOffer'), from: z.enum(['me', 'opp']), expiresAt: z.number() }),
  z.object({ t: z.literal('error'), code: ErrorCodeSchema }),
])
export type ServerMsg = z.infer<typeof ServerMsg>

// ── QueueRoom ──────────────────────────────────────────────────────────────

export const QueueClientMsg = z.discriminatedUnion('t', [
  z.object({ t: z.literal('join'), len: LenSchema, zero: ZeroSchema, format: FormatSchema }),
])
export type QueueClientMsg = z.infer<typeof QueueClientMsg>

export const QueueServerMsg = z.discriminatedUnion('t', [
  z.object({ t: z.literal('waiting'), elapsedMs: z.number(), suggestInvite: z.boolean() }),
  z.object({ t: z.literal('matched'), roomId: z.string(), token: z.string() }),
  z.object({ t: z.literal('error'), code: ErrorCodeSchema }),
])
export type QueueServerMsg = z.infer<typeof QueueServerMsg>
