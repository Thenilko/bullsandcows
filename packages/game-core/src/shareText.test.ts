import { describe, expect, it } from 'vitest'
import { shareDuration, shareRow, shareText } from './shareText'

const URL = 'https://bikove-i-kravi.bg'
const ROWS = [
  { bulls: 0, cows: 1 },
  { bulls: 1, cows: 1 },
  { bulls: 2, cows: 1 },
  { bulls: 3, cows: 0 },
  { bulls: 4, cows: 0 },
]

describe('shareText', () => {
  it('formats a daily win exactly as the spec shows', () => {
    const text = shareText({
      kind: 'daily',
      dailyNumber: 127,
      len: 4,
      rows: ROWS,
      won: true,
      secs: 96,
      top: 20,
      publicUrl: URL,
    })
    expect(text).toBe(
      [
        'Бикове и крави #127 · 5 опита · 01:36',
        '🐄⬜⬜⬜',
        '🐂🐄⬜⬜',
        '🐂🐂🐄⬜',
        '🐂🐂🐂⬜',
        '🐂🐂🐂🐂',
        `Топ 20% днес · ${URL}/?s=share`,
      ].join('\n'),
    )
  })

  it('says „не позна“ on a daily loss and asks for a better try instead of a top', () => {
    const text = shareText({
      kind: 'daily',
      dailyNumber: 3,
      len: 4,
      rows: ROWS.slice(0, 2),
      won: false,
      secs: 61,
      top: 50,
      publicUrl: URL,
    })
    expect(text.split('\n')).toEqual([
      'Бикове и крави #3 · не позна · 01:01',
      '🐄⬜⬜⬜',
      '🐂🐄⬜⬜',
      `Можеш ли по-добре? · ${URL}/?s=share`,
    ])
  })

  it('leaves the time out when it is unknown and the top out before a sample exists', () => {
    const text = shareText({
      kind: 'daily',
      dailyNumber: 9,
      len: 4,
      rows: [{ bulls: 4, cows: 0 }],
      won: true,
      publicUrl: URL,
    })
    expect(text.split('\n')[0]).toBe('Бикове и крави #9 · 1 опит')
    expect(text.split('\n').at(-1)).toBe(`Можеш ли по-добре? · ${URL}/?s=share`)
  })

  it('names a free game by its digit count instead of a number', () => {
    const text = shareText({
      kind: 'free',
      len: 3,
      rows: [
        { bulls: 1, cows: 2 },
        { bulls: 3, cows: 0 },
      ],
      won: true,
      secs: 30,
      publicUrl: URL,
    })
    expect(text.split('\n')).toEqual([
      'Бикове и крави · Свободна игра · 3 цифри · 2 опита · 00:30',
      '🐂🐄🐄',
      '🐂🐂🐂',
      `Можеш ли по-добре? · ${URL}/?s=share`,
    ])
    const lost = shareText({ kind: 'free', len: 3, rows: [], won: false, publicUrl: URL })
    expect(lost.split('\n')[0]).toBe('Бикове и крави · Свободна игра · 3 цифри · не позна')
  })

  it('shows a duel with the opponent, the outcome and only my rows, in 5 digits', () => {
    const rows = [
      { bulls: 0, cows: 3 },
      { bulls: 2, cows: 2 },
      { bulls: 5, cows: 0 },
    ]
    const win = shareText({
      kind: 'duel',
      len: 5,
      rows,
      opponent: 'Мира',
      outcome: 'win',
      publicUrl: URL,
    })
    expect(win.split('\n')).toEqual([
      'Бикове и крави · Дуел с Мира · победа · 3 опита',
      '🐄🐄🐄⬜⬜',
      '🐂🐂🐄🐄⬜',
      '🐂🐂🐂🐂🐂',
      `Можеш ли по-добре? · ${URL}/?s=share`,
    ])
    const lose = shareText({
      kind: 'duel',
      len: 5,
      rows,
      opponent: 'Мира',
      outcome: 'lose',
      publicUrl: URL,
    })
    expect(lose.split('\n')[0]).toBe('Бикове и крави · Дуел с Мира · загуба · 3 опита')
    const draw = shareText({
      kind: 'duel',
      len: 5,
      rows,
      opponent: 'Мира',
      outcome: 'draw',
      publicUrl: URL,
    })
    expect(draw.split('\n')[0]).toBe('Бикове и крави · Дуел с Мира · равно · 3 опита')
  })
})

describe('shareRow', () => {
  it('sorts bulls, then cows, then blanks, never a position', () => {
    expect(shareRow({ bulls: 1, cows: 2 }, 4)).toBe('🐂🐄🐄⬜')
    expect(shareRow({ bulls: 0, cows: 0 }, 3)).toBe('⬜⬜⬜')
    expect(shareRow({ bulls: 5, cows: 0 }, 5)).toBe('🐂🐂🐂🐂🐂')
    // The same verdict in any positions gives the same row.
    expect(shareRow({ bulls: 2, cows: 1 }, 4)).toBe(shareRow({ bulls: 2, cows: 1 }, 4))
  })

  it('never exceeds the length on a bad verdict', () => {
    expect(shareRow({ bulls: 3, cows: 3 }, 4)).toBe('🐂🐂🐂🐄')
    expect(shareRow({ bulls: 9, cows: 0 }, 3)).toBe('🐂🐂🐂')
  })
})

describe('shareDuration', () => {
  it('formats minutes and seconds, with hours only from an hour on', () => {
    expect(shareDuration(0)).toBe('00:00')
    expect(shareDuration(96)).toBe('01:36')
    expect(shareDuration(3599)).toBe('59:59')
    expect(shareDuration(3661)).toBe('1:01:01')
  })
})
