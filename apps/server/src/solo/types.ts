import type { GameViewDto, GuessResultDto } from '@bc/protocol'
import type { Len } from '@bc/game-core'
import type { z } from 'zod'

/** The REST shape is defined once, in `@bc/protocol`. */
export type GameView = z.infer<typeof GameViewDto>
export type GuessResult = z.infer<typeof GuessResultDto>

export interface CreateInput {
  readonly len: Len
  readonly zero: boolean
  readonly kind: 'daily' | 'free'
  /** Free games only, for E2E; the HTTP layer passes it in dev and test environments alone. */
  readonly secretOverride?: string
}
