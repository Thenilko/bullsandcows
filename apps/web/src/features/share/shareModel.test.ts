import { describe, expect, it } from 'vitest'
import { buildResult } from '../../screens/result/resultModel'
import { fixtureMe, fixtureState, myGuess } from '../../dev/duelFixtures'
import { fallbackDistribution, lostGame, wonGame } from '../../test/fixtures'
import { publicUrl } from './publicUrl'
import { shareFromDuel, shareFromResult } from './shareModel'

const ORIGIN = 'http://localhost:3000'

describe('publicUrl', () => {
  it('falls back to the page origin without VITE_PUBLIC_URL', () => {
    expect(publicUrl()).toBe(ORIGIN)
  })
})

describe('shareFromResult', () => {
  it('builds the daily text from the result model: number, attempts, time, rows, top', () => {
    const share = shareFromResult(buildResult(wonGame, fallbackDistribution))
    expect(share.input.kind).toBe('daily')
    expect(share.gameId).toBe('g1')
    expect(share.fileName).toBe('bikove-i-kravi-127.png')
    expect(share.finishedAt).toBe(wonGame.finishedAt)
    expect(share.text.split('\n')).toEqual([
      'Бикове и крави #127 · 6 опита · 01:36',
      '🐄🐄⬜⬜',
      '🐂⬜⬜⬜',
      '🐄🐄⬜⬜',
      '⬜⬜⬜⬜',
      '🐂🐂🐄🐄',
      '🐂🐂🐂🐂',
      `Топ 37% днес · ${ORIGIN}/?s=share`,
    ])
  })

  it('says „не позна“ for a loss and never boasts a rank', () => {
    const share = shareFromResult(buildResult(lostGame, fallbackDistribution))
    expect(share.text.split('\n')[0]).toBe('Бикове и крави #127 · не позна · 01:36')
    expect(share.text).toContain('Можеш ли по-добре?')
  })

  it('is a free game without a daily number, with the digits in the header', () => {
    const free = { ...wonGame, kind: 'free' as const, dailyNumber: undefined }
    const share = shareFromResult(buildResult(free, fallbackDistribution))
    expect(share.input.kind).toBe('free')
    expect(share.text.split('\n')[0]).toBe('Бикове и крави · Свободна игра · 4 цифри · 6 опита · 01:36')
    expect(share.fileName).toBe('bikove-i-kravi-svobodna.png')
  })

  it('treats a daily game whose number is unknown as free', () => {
    const share = shareFromResult(buildResult({ ...wonGame, dailyNumber: undefined }, fallbackDistribution))
    expect(share.input.kind).toBe('free')
  })
})

describe('shareFromDuel', () => {
  it('shares only my rows with the opponent and the outcome, with my game row from the snapshot', () => {
    const state = fixtureState({
      phase: 'ended',
      endedAt: 1_700_000_131_000,
      me: fixtureMe({ guesses: [myGuess('1234', 1, 2), myGuess('5678', 4, 0)], gameId: 'g-me' }),
    })
    const share = shareFromDuel(state, 'win', 'Боби')
    expect(share.gameId).toBe('g-me')
    expect(shareFromDuel(state, 'win', 'Боби', 'g-ended').gameId).toBe('g-ended')
    expect(shareFromDuel(fixtureState({ phase: 'ended', endedAt: 1 }), 'win', 'Боби').gameId).toBeNull()
    expect(share.fileName).toBe('bikove-i-kravi-duel.png')
    expect(share.finishedAt).toBe(1_700_000_131_000)
    expect(share.text.split('\n')).toEqual([
      'Бикове и крави · Дуел с Боби · победа · 2 опита',
      '🐂🐄🐄⬜',
      '🐂🐂🐂🐂',
      `Можеш ли по-добре? · ${ORIGIN}/?s=share`,
    ])
  })
})
