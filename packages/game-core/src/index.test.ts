import { describe, expect, it } from 'vitest'
import * as api from './index'

describe('public API', () => {
  it('exports everything from tasks 2-8', () => {
    expect(Object.keys(api)).toEqual(
      expect.arrayContaining([
        'codes', 'totalCodes', 'isValidCode',
        'bullsCows',
        'filterCandidates', 'isConsistent',
        'progress', 'IDLE_PROGRESS',
        'topOf', 'histogramFromAttempts', 'pickHistogram', 'FALLBACK_HISTOGRAM', 'MIN_SAMPLE',
        'LEN_FACTOR', 'scoreSolo', 'starsFromTop', 'rankKeyForStars', 'rankKeyForLevel',
        'XP_PER_LEVEL', 'levelFromXp', 'xpIntoLevel', 'DUEL_XP', 'BOT_WIN_XP', 'duelXp',
        'sofiaDate', 'dailyIndex', 'dailySecret',
        'INVITE_ALPHABET', 'inviteCode', 'isInviteCode',
        'botGuess', 'botThinkMs', 'BOT_THINK_BASE', 'BOT_LEVEL1_RANDOM_CHANCE', 'BOT_MINIMAX',
        'DEFAULT_RATING', 'updateRating', 'displayRating',
        'SUSPICIOUS', 'isSuspicious',
      ]),
    )
  })
  it('does not leak test utilities', () => {
    expect(Object.keys(api)).not.toContain('mulberry32')
  })
})
