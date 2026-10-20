import { describe, expect, it } from 'vitest'
import { ClientMsg, PublicState, QueueClientMsg, QueueServerMsg, ServerMsg } from './ws'

const me = {
  id: 'u1',
  username: 'Mira',
  level: 2,
  rating: 1500,
  isGuest: false,
  ready: true,
  hasSecret: false,
  left: 3024,
  connected: true,
  disconnectedAt: null,
  guesses: [{ guess: '1234', bulls: 1, cows: 1, consistent: true, at: 5 }],
}
const opp = { ...me, id: 'u2', guesses: [{ guess: null, bulls: null, cows: null, at: 6 }] }
const state = {
  format: 'race',
  len: 4,
  zero: false,
  opponentKind: 'quick',
  botLevel: null,
  phase: 'playing',
  me,
  opp,
  mySeat: 'a',
  turn: null,
  firstMover: null,
  countdownAt: 1,
  startedAt: 2,
  endedAt: null,
  turnDeadline: null,
  outcome: null,
}

describe('client messages', () => {
  it('accepts the five room messages', () => {
    for (const msg of [
      { t: 'ready' },
      { t: 'secret', code: '1234' },
      { t: 'guess', code: '5678' },
      { t: 'giveUp' },
      { t: 'rematch' },
    ]) {
      expect(ClientMsg.parse(msg)).toEqual(msg)
    }
  })

  it('rejects unknown types and missing or oversized codes', () => {
    expect(ClientMsg.safeParse({ t: 'cheat' }).success).toBe(false)
    expect(ClientMsg.safeParse({ t: 'guess' }).success).toBe(false)
    expect(ClientMsg.safeParse({ t: 'guess', code: '1'.repeat(17) }).success).toBe(false)
  })

  it('accepts only 3–5 distinct digits as a code shape', () => {
    for (const code of ['123', '0123', '98765']) {
      expect(ClientMsg.safeParse({ t: 'guess', code }).success, code).toBe(true)
    }
    for (const code of ['12', '123456', '1123', '12a4', ' 123', '']) {
      expect(ClientMsg.safeParse({ t: 'secret', code }).success, code).toBe(false)
    }
  })

  it('validates queue joins', () => {
    const join = { t: 'join', len: 4, zero: true, format: 'classic' }
    expect(QueueClientMsg.parse(join)).toEqual(join)
    expect(QueueClientMsg.safeParse({ ...join, format: 'blitz' }).success).toBe(false)
    expect(QueueClientMsg.safeParse({ ...join, len: 6 }).success).toBe(false)
  })
})

describe('server messages', () => {
  it('accepts a public state with hidden (race) and visible (classic) opponent guesses', () => {
    expect(PublicState.parse(state)).toEqual(state)
    const classic = {
      ...state,
      format: 'classic',
      opp: { ...opp, guesses: [{ guess: '1234', bulls: 0, cows: 2, at: 6 }] },
    }
    expect(PublicState.parse(classic)).toEqual(classic)
    const noConsistent = {
      ...classic,
      opp: { ...opp, guesses: [{ guess: '1234', bulls: 0, cows: 2, consistent: true, at: 6 }] },
    }
    expect(PublicState.parse(noConsistent).opp?.guesses[0]).not.toHaveProperty('consistent')
  })

  it('accepts every room message', () => {
    const msgs = [
      { t: 'state', state },
      { t: 'verdict', guess: '1234', bulls: 1, cows: 2, consistent: true, left: 12, attempts: 3 },
      { t: 'oppMoved', attempts: 2, left: 40 },
      { t: 'oppMoved', attempts: 2, left: 1, solved: true },
      { t: 'countdown', startAt: 2100 },
      { t: 'started', startedAt: 2100 },
      { t: 'warning', msLeft: 15000 },
      {
        t: 'ended',
        outcome: 'win',
        reason: 'solved',
        secrets: { mine: '1234', theirs: '5678' },
        rating: { from: 1500, to: 1662, delta: 162 },
        xp: 120,
      },
      { t: 'rematchOffer', from: 'opp', expiresAt: 30000 },
      { t: 'error', code: 'ERR_NOT_YOUR_TURN' },
    ]
    for (const msg of msgs) expect(ServerMsg.parse(msg)).toEqual(msg)
    expect(ServerMsg.safeParse({ t: 'error', code: 'ERR_NOPE' }).success).toBe(false)
  })

  it('accepts queue messages', () => {
    const msgs = [
      { t: 'waiting', elapsedMs: 21000, suggestInvite: true },
      { t: 'matched', roomId: 'r1', token: 'tok' },
      { t: 'error', code: 'ERR_GUEST' },
    ]
    for (const msg of msgs) expect(QueueServerMsg.parse(msg)).toEqual(msg)
  })
})
