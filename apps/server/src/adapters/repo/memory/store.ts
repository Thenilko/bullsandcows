import type { BadgeKey } from '@bc/protocol'
import type {
  BadgeState,
  DuelRow,
  FarmMemberRow,
  FarmRow,
  GameRow,
  GuessRow,
  NudgeRow,
  PastureSettings,
  Profile,
  PublicGameRow,
  ShareRow,
  WeeklyPlayRow,
  WeeklyResultRow,
  WeekRow,
} from '../../../ports/repo'

/** The in-memory "database". Only the memory repo touches it; callers get copies. */
export interface MemoryStore {
  readonly profiles: Map<string, Profile>
  readonly games: Map<string, GameRow>
  readonly guesses: Map<string, readonly GuessRow[]>
  readonly duels: Map<string, DuelRow>
  readonly dailyNumbers: Map<string, number>
  /** Per user: badge key → its state. */
  readonly badges: Map<string, ReadonlyMap<BadgeKey, BadgeState>>
  /** Key `<userId>|<gameId>`. */
  readonly shares: Map<string, ShareRow>
  /** Per user: the pasture choices. */
  readonly pasture: Map<string, PastureSettings>
  readonly farms: Map<string, FarmRow>
  /** Per user (one farm each). */
  readonly farmMembers: Map<string, FarmMemberRow>
  /** Key `<from>|<to>|<day>`. */
  readonly nudges: Map<string, NudgeRow>
  readonly weeks: Map<string, WeekRow>
  /** Per game id. */
  readonly weeklyPlays: Map<string, WeeklyPlayRow>
  /** Key `<weekId>|<userId>`. */
  readonly weeklyResults: Map<string, WeeklyResultRow>
  nextGuessId: number
}

export const createStore = (): MemoryStore => ({
  profiles: new Map(),
  games: new Map(),
  guesses: new Map(),
  duels: new Map(),
  dailyNumbers: new Map(),
  badges: new Map(),
  shares: new Map(),
  pasture: new Map(),
  farms: new Map(),
  farmMembers: new Map(),
  nudges: new Map(),
  weeks: new Map(),
  weeklyPlays: new Map(),
  weeklyResults: new Map(),
  nextGuessId: 1,
})

/** Deep copy so that neither stored rows nor returned rows can be changed from outside. */
export const copy = <T>(value: T): T => structuredClone(value)

/** Drops keys whose value is `undefined`, so a patch never erases stored fields. */
export const defined = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>

/** A detached copy of a stored game without the `secret` key. */
export function publicGame(game: GameRow): PublicGameRow {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secret, ...rest } = copy(game)
  return rest
}
