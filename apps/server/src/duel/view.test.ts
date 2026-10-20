import { PublicState } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { applyGuess } from './guess'
import { giveUp } from './match'
import { publicView } from './view'
import { PLAY_AT, classicInPlay, lobby, ok, raceInPlay } from './testing'

describe('publicView', () => {
  it('never contains either secret before the end (classic)', () => {
    const g = classicInPlay(undefined, '1234', '5678')
    const s = ok(applyGuess(g.match, g.secrets, 'a', '9876', PLAY_AT + 1000))
    for (const seat of ['a', 'b'] as const) {
      const json = JSON.stringify(publicView(s.match, seat, s.secrets))
      expect(json).not.toContain('1234')
      expect(json).not.toContain('5678')
    }
    expect(publicView(s.match, 'a', s.secrets).secrets).toBeUndefined()
  })

  it('never contains the shared secret before the end (race)', () => {
    const g = raceInPlay()
    expect(JSON.stringify(publicView(g.match, 'b', g.secrets))).not.toContain('1234')
  })

  it('shows my guesses in full and only verdicts of the opponent', () => {
    const g = classicInPlay()
    const s = ok(applyGuess(g.match, g.secrets, 'a', '9876', PLAY_AT + 1000))
    const mine = publicView(s.match, 'a', s.secrets)
    expect(mine.me.guesses).toEqual([
      { guess: '9876', bulls: 1, cows: 2, consistent: true, at: PLAY_AT + 1000 },
    ])
    const theirs = publicView(s.match, 'b', s.secrets)
    expect(theirs.opp?.guesses).toEqual([{ bulls: 1, cows: 2, at: PLAY_AT + 1000 }])
    expect(JSON.stringify(theirs)).not.toContain('9876')
    expect(theirs.mySeat).toBe('b')
    expect(theirs.me.id).toBe('bob')
  })

  it('reveals both secrets after the end, from each side', () => {
    const g = classicInPlay()
    const s = ok(giveUp(g.match, g.secrets, 'a', PLAY_AT + 100))
    expect(publicView(s.match, 'a', s.secrets).secrets).toEqual({ mine: '1234', theirs: '5678' })
    expect(publicView(s.match, 'b', s.secrets).secrets).toEqual({ mine: '5678', theirs: '1234' })
  })

  it('matches the shared protocol schema and rounds the rating', () => {
    const g = lobby('race')
    const v = publicView(g.match, 'a', g.secrets)
    expect(PublicState.parse(v)).toEqual(v)
    expect(v.opp?.rating).toBe(1600)
    expect(v.phase).toBe('lobby')
  })
})
