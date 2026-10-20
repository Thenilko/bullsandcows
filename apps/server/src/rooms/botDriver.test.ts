import { describe, expect, it } from 'vitest'
import { applyGuess } from '../duel/guess'
import { PLAY_AT, classicInPlay, eventsTo, ok, raceInPlay, rngZero } from '../duel/testing'
import type { StepOk } from '../duel/types'
import { MIN_THINK_MS, botDueAt, botMove, botToMove } from './botDriver'

const raceBot = (): StepOk => {
  const g = raceInPlay('bot')
  return { ...g, match: { ...g.match, botLevel: 4 } }
}

/** Classic with the human (a, secret 1234) having guessed once, so it is the bot's turn. */
const classicBotTurn = (secretA = '1234'): StepOk => {
  const g = classicInPlay(rngZero, secretA)
  const a = ok(applyGuess(g.match, g.secrets, 'a', '9876', PLAY_AT + 1))
  return { ...a, match: { ...a.match, opponentKind: 'bot', botLevel: 4 } }
}

describe('botMove', () => {
  it('makes a valid guess and tells the human with oppMoved', () => {
    const g = raceBot()
    const step = ok(botMove(g.match, g.secrets, 4, PLAY_AT + 5000, rngZero))
    const guesses = step.match.players.b!.guesses
    expect(guesses).toHaveLength(1)
    expect(guesses[0]!.guess).toMatch(/^[1-9]{4}$/)
    expect(eventsTo(step.events, 'a').some((m) => m.t === 'oppMoved')).toBe(true)
  })

  it('never repeats a guess and eventually solves the shared secret as seat b', () => {
    let cur: StepOk = raceBot()
    const seen = new Set<string>()
    for (let i = 0; i < 20 && cur.match.phase === 'playing'; i += 1) {
      cur = ok(botMove(cur.match, cur.secrets, 4, PLAY_AT + 1000 * (i + 1), rngZero))
      const last = cur.match.players.b!.guesses.at(-1)!
      expect(seen.has(last.guess)).toBe(false)
      seen.add(last.guess)
    }
    expect(cur.match.phase).toBe('ended')
    expect(cur.match.outcome).toMatchObject({ winner: 'b', reason: 'solved' })
    expect(cur.match.players.b!.guesses.at(-1)!.guess).toBe(cur.secrets.shared)
  })

  it("classic: aims at the human's secret and passes the turn back", () => {
    let cur = classicBotTurn('4321')
    expect(cur.match.turn).toBe('b')
    cur = ok(botMove(cur.match, cur.secrets, 4, PLAY_AT + 2000, rngZero))
    expect(cur.match.turn).toBe('a')
    const g = cur.match.players.b!.guesses[0]!
    // The verdict is against the human's secret 4321, not the bot's own 5678.
    const bulls = [...g.guess].filter((c, i) => c === '4321'[i]).length
    expect(g.bulls).toBe(bulls)
  })

  it('classic: solving the human secret ends the match with winner b', () => {
    let cur = classicBotTurn()
    for (let i = 0; i < 30 && cur.match.phase === 'playing'; i += 1) {
      if (cur.match.turn === 'a') {
        const n = cur.match.players.a.guesses.length
        const code = `${9 - (n % 3)}${8 - (n % 4)}${7 - (n % 2)}${(n % 5) + 1}`
        const next = applyGuess(cur.match, cur.secrets, 'a', code, PLAY_AT + 5000 * (i + 1))
        if (!('error' in next)) cur = next
        else break
      } else {
        cur = ok(botMove(cur.match, cur.secrets, 4, PLAY_AT + 5000 * (i + 1) + 2000, rngZero))
      }
    }
    expect(cur.match.outcome?.winner).toBe('b')
  })
})

describe('botToMove and botDueAt', () => {
  it('moves in race while playing and in classic only on its turn', () => {
    expect(botToMove(raceBot().match)).toBe(true)
    expect(botToMove(classicBotTurn().match)).toBe(true)
    const human = classicBotTurn()
    expect(botToMove({ ...human.match, turn: 'a' })).toBe(false)
    expect(botToMove({ ...human.match, phase: 'ended' })).toBe(false)
  })

  it('never thinks for less than a second', () => {
    const m = raceBot().match
    expect(botDueAt(m, 4, 0, () => 0) - 0).toBeGreaterThanOrEqual(MIN_THINK_MS)
  })
})
