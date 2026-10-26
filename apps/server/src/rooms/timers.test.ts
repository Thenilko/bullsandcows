import { describe, expect, it } from 'vitest'
import { createMatch, giveUp, markDisconnected } from '../duel/match'
import { offerRematch } from '../duel/rematch'
import { PLAY_AT, T0, alice, classicInPlay, lobby, ok, raceInPlay } from '../duel/testing'
import {
  COUNTDOWN_MS,
  RACE_CAP_MS,
  RECONNECT_MS,
  REMATCH_MS,
  TURN_MS,
  TURN_WARN_MS,
} from '../duel/types'
import { INVITE_MS, initialMeta, type RoomMeta } from './state'
import { due, nextAlarm, roomTimers } from './timers'

const meta: RoomMeta = initialMeta(T0)

describe('nextAlarm', () => {
  it('is null without pending timers', () => {
    expect(nextAlarm({})).toBeNull()
    expect(nextAlarm({ turn: undefined })).toBeNull()
  })

  it('is the earliest pending time', () => {
    expect(nextAlarm({ turn: 300, turnWarn: 200, 'reconnect:a': 250 })).toBe(200)
  })
})

describe('due', () => {
  it('lists the timers whose time has come, earliest first', () => {
    const timers = { turn: 300, turnWarn: 200, cap: 900, 'reconnect:b': 250 }
    expect(due(timers, 260)).toEqual(['turnWarn', 'reconnect:b'])
    expect(due(timers, 199)).toEqual([])
    expect(due(timers, 300)).toEqual(['turnWarn', 'reconnect:b', 'turn'])
  })
})

describe('roomTimers', () => {
  it('arms the invite timer while seat b is empty', () => {
    const { match } = createMatch(
      { format: 'race', len: 4, zero: false, opponentKind: 'friend' },
      alice,
      T0,
    )
    expect(roomTimers(match, meta)).toEqual({ invite: T0 + INVITE_MS })
    expect(roomTimers(match, { ...meta, expired: true })).toEqual({})
  })

  it('arms the ready timer once seat b has joined', () => {
    const g = lobby('race', 'friend')
    expect(roomTimers(g.match, { ...meta, readyDeadline: T0 + 60_000 })).toEqual({
      ready: T0 + 60_000,
    })
  })

  it('classic play: turn warning, turn deadline and the reconnect of the seat off turn', () => {
    const g = classicInPlay()
    const off = ok(markDisconnected(g.match, g.secrets, 'b', PLAY_AT + 5))
    expect(roomTimers(off.match, meta)).toEqual({
      turnWarn: PLAY_AT + TURN_MS - TURN_WARN_MS,
      turn: PLAY_AT + TURN_MS,
      'reconnect:b': PLAY_AT + 5 + RECONNECT_MS,
    })
  })

  it('race play: the cap', () => {
    const g = raceInPlay()
    expect(roomTimers(g.match, meta)).toEqual({ cap: PLAY_AT + RACE_CAP_MS })
  })

  it('countdown: its end', () => {
    const g = classicInPlay()
    const countdown = { ...g.match, phase: 'countdown' as const, countdownAt: T0, startedAt: null }
    expect(roomTimers(countdown, meta).countdown).toBe(T0 + COUNTDOWN_MS)
  })

  it('ended: the earliest rematch offer', () => {
    const g = raceInPlay()
    const ended = ok(giveUp(g.match, g.secrets, 'a', PLAY_AT + 10))
    const offered = ok(offerRematch(ended.match, ended.secrets, 'b', PLAY_AT + 20))
    expect(roomTimers(offered.match, meta)).toEqual({ rematch: PLAY_AT + 20 + REMATCH_MS })
  })

  it('secrets phase: the secrets deadline', () => {
    const g = lobby('classic', 'friend')
    const secrets = { ...g.match, phase: 'secrets' as const }
    expect(roomTimers(secrets, { ...meta, secretsDeadline: T0 + 1 })).toEqual({ secrets: T0 + 1 })
  })
})
