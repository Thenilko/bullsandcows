import type { OppGuessDto, PublicMe, PublicOpp, PublicState } from '@bc/protocol'

const T0 = 1_700_000_000_000

function base(name: string, over: Partial<PublicMe & PublicOpp> = {}) {
  return {
    id: `id-${name}`,
    username: name,
    level: 7,
    rating: 1240,
    isGuest: false,
    ready: true,
    hasSecret: true,
    left: 3024,
    connected: true,
    disconnectedAt: null,
    ...over,
  }
}

export const fixtureMe = (over: Partial<PublicMe> = {}): PublicMe => ({ ...base('Мира'), guesses: [], ...over })
export const fixtureOpp = (over: Partial<PublicOpp> = {}): PublicOpp => ({ ...base('Боби', { level: 6, rating: 1210 }), guesses: [], ...over })

export const myGuess = (guess: string, bulls: number, cows: number, consistent = true) => ({ guess, bulls, cows, consistent, at: T0 })
export const oppGuess = (guess: string | null, bulls: number | null, cows: number | null): OppGuessDto => ({ guess, bulls, cows, at: T0 })

/** Playing, classic, my turn, nothing guessed yet. Override per scenario. */
export function fixtureState(over: Partial<PublicState> = {}): PublicState {
  return {
    format: 'classic',
    len: 4,
    zero: false,
    opponentKind: 'quick',
    botLevel: null,
    phase: 'playing',
    me: fixtureMe(),
    opp: fixtureOpp(),
    mySeat: 'a',
    turn: 'a',
    firstMover: 'a',
    countdownAt: null,
    startedAt: T0,
    endedAt: null,
    turnDeadline: null,
    outcome: null,
    ...over,
  }
}

export const FIXTURE_T0 = T0
