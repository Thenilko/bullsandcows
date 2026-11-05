import { describe, expect, it } from 'vitest'
import {
  FIXTURE_T0,
  fixtureMe,
  fixtureOpp,
  fixtureState,
  myGuess,
  oppGuess,
} from '../../dev/duelFixtures'
import i18n from '../../i18n'
import { buildRows, kickerOf, matchClock, reasonKey, tilesOf } from './duelResultModel'

const t = i18n.getFixedT('bg')

const SECRETS = { mine: '1234', theirs: '5678' }
const ended = (format: 'race' | 'classic') =>
  fixtureState({
    format,
    phase: 'ended',
    endedAt: FIXTURE_T0 + 131_000,
    me: fixtureMe({ guesses: [myGuess('1234', 1, 2), myGuess('5678', 4, 0)] }),
    opp: fixtureOpp({ guesses: [oppGuess('9021', 0, 2)] }),
  })

describe('kickerOf', () => {
  it('names both numbers of a classic duel', () => {
    expect(kickerOf(t, ended('classic'), SECRETS, 'win', 'ДУЕЛ')).toBe(
      'НЕГОВОТО 5678 · ТВОЕТО 1234',
    )
  })

  it('names the race number like the solo result: „е“ on a win, „беше“ otherwise', () => {
    expect(kickerOf(t, ended('race'), SECRETS, 'win', 'ДУЕЛ')).toBe('ЧИСЛОТО Е 1234')
    expect(kickerOf(t, ended('race'), SECRETS, 'lose', 'ДУЕЛ')).toBe('ЧИСЛОТО БЕШЕ 1234')
  })

  it('falls back to the mode while the numbers are unknown', () => {
    expect(kickerOf(t, ended('race'), undefined, 'draw', 'ДУЕЛ · НАДПРЕВАРА')).toBe(
      'ДУЕЛ · НАДПРЕВАРА',
    )
  })
})

describe('tilesOf', () => {
  it('shows my attempts and the match time, then the XP and a rating gain', () => {
    const tiles = tilesOf(t, ended('classic'), 120, { from: 1240, to: 1258, delta: 18 })
    expect(tiles.map((x) => [x.value, x.label])).toEqual([
      [2, 'опита'],
      ['02:11', 'време'],
      ['+120', 'т. опит'],
      ['+18', 'рейтинг 1258'],
    ])
  })

  it('shows a rating loss in red and leaves out what the match did not give', () => {
    const loss = tilesOf(t, ended('race'), null, { from: 1240, to: 1227, delta: -13 })
    expect(loss.map((x) => x.value)).toEqual([2, '02:11', '-13'])
    expect(loss[2]?.color).toBe('#8A1F0B')
    expect(tilesOf(t, ended('race'), null, null)).toHaveLength(2)
  })
})

describe('buildRows', () => {
  it('marks who solved it, with the match time only for them', () => {
    const rows = buildRows(ended('classic'), 'win', 'solved', { me: 'Мира (ти)', opp: 'Боби' })
    expect(rows.map((r) => [r.name, r.attempts, r.time, r.solved])).toEqual([
      ['Мира (ти)', 2, '02:11', true],
      ['Боби', 1, '—', false],
    ])
  })

  it('shows a bot as a bot', () => {
    const rows = buildRows({ ...ended('race'), opponentKind: 'bot' }, 'lose', 'giveUp', {
      me: 'а',
      opp: 'б',
    })
    expect(rows[1]?.kind).toBe('bot')
    expect(rows[0]?.solved).toBe(true)
  })
})

describe('matchClock / reasonKey', () => {
  it('formats the match length, or a dash before the end', () => {
    expect(matchClock({ startedAt: FIXTURE_T0, endedAt: FIXTURE_T0 + 65_000 })).toBe('01:05')
    expect(matchClock({ startedAt: FIXTURE_T0, endedAt: null })).toBe('—')
  })

  it('explains endings other than a solve from the right side', () => {
    expect(reasonKey('giveUp', 'win')).toBe('outcome.reason.forfeitOpp')
    expect(reasonKey('timeout', 'lose')).toBe('outcome.reason.timeoutSelf')
    expect(reasonKey('cap', 'draw')).toBe('outcome.reason.ceiling')
    expect(reasonKey('solved', 'win')).toBeNull()
  })
})
