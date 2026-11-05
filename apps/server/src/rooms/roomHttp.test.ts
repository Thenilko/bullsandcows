import { describe, expect, it } from 'vitest'
import { alice, bob, T0 } from '../duel/testing'
import { CreateBody, createRoom, isRefusal, joinRoom } from './roomHttp'

const opts = { format: 'race', len: 4, zero: false, opponentKind: 'human' } as const

describe('CreateBody', () => {
  it('accepts an optional invite code from the invite alphabet only', () => {
    expect(CreateBody.safeParse({ opts, host: alice }).success).toBe(true)
    expect(CreateBody.safeParse({ opts, host: alice, inviteCode: 'K7M2Q' }).success).toBe(true)
    for (const bad of ['K7M2', 'k7m2q', 'K7M2O', 'K7M2Q1']) {
      expect(CreateBody.safeParse({ opts, host: alice, inviteCode: bad }).success).toBe(false)
    }
  })

  it('requires a bot level for bot rooms only', () => {
    const bot = { ...opts, opponentKind: 'bot' }
    expect(CreateBody.safeParse({ opts: bot, host: alice }).success).toBe(false)
    expect(CreateBody.safeParse({ opts: { ...bot, botLevel: 2 }, host: alice }).success).toBe(true)
    expect(CreateBody.safeParse({ opts: { ...opts, botLevel: 2 }, host: alice }).success).toBe(
      false,
    )
  })
})

describe('createRoom', () => {
  it('keeps the bot tuning of a bot room in the meta', () => {
    const bot = {
      raceThinkMs: [30000, 20000, 15000, 9000],
      lostHint: [0.7, 0.5, 0.3],
      proSample: 10,
    }
    const body = CreateBody.parse({
      opts: { ...opts, opponentKind: 'bot', botLevel: 2, bot },
      host: alice,
    })
    const st = createRoom(null, body, T0, 'tok')
    if (isRefusal(st)) throw new Error('refused')
    expect(st.meta.bot).toEqual(bot)
    expect(st.match.players.b?.id).toBe('bot')
    const plain = createRoom(
      null,
      CreateBody.parse({ opts: { ...opts, opponentKind: 'bot', botLevel: 2 }, host: alice }),
      T0,
      'tok',
    )
    if (isRefusal(plain)) throw new Error('refused')
    expect(plain.meta.bot).toBeUndefined()
  })

  it('refuses a bot tuning out of bounds', () => {
    const bot = {
      raceThinkMs: [30000, 20000, 15000, 9000],
      lostHint: [0.7, 0.5, 0.3],
      proSample: 99,
    }
    expect(
      CreateBody.safeParse({
        opts: { ...opts, opponentKind: 'bot', botLevel: 2, bot },
        host: alice,
      }).success,
    ).toBe(false)
  })

  it('keeps the invite code in the room meta and maps human to friend', () => {
    const st = createRoom(null, { opts, host: alice, inviteCode: 'K7M2Q' }, T0, 'tok')
    if (isRefusal(st)) throw new Error('refused')
    expect(st.meta.inviteCode).toBe('K7M2Q')
    expect(st.match.opponentKind).toBe('friend')
    expect(st.tokens).toEqual({ a: 'tok', b: null })
  })

  it('never replaces a live room', () => {
    const st = createRoom(null, { opts, host: alice }, T0, 'tok')
    if (isRefusal(st)) throw new Error('refused')
    const joined = joinRoom(st, { info: bob }, 'tok-b')
    if (isRefusal(joined)) throw new Error('refused')
    expect(createRoom(joined, { opts, host: alice }, T0, 'x')).toEqual({
      status: 409,
      code: 'ERR_ROOM_FULL',
    })
  })
})
