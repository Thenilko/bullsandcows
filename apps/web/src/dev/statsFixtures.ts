import type { BadgeKey, BadgeStateDto, DistributionDto, GameViewDto, LeaderboardDto, MeDto } from '@bc/protocol'
import { BADGES, FALLBACK_HISTOGRAM, nextThreshold, tierFor } from '@bc/game-core'

const START = 1_700_000_000_000

function guess(g: string, bulls: number, cows: number, left: number, consistent = true) {
  return { guess: g, bulls, cows, consistent, left }
}

/** A finished 4-digit daily game: six guesses, one of them wasted, 96 s. */
export const wonGame: GameViewDto = {
  id: 'g1',
  kind: 'daily',
  len: 4,
  zero: false,
  practice: false,
  total: 3024,
  startedAt: START,
  finishedAt: START + 96_000,
  won: true,
  score: 1060,
  attempts: 6,
  guesses: [
    guess('1234', 0, 2, 300),
    guess('5603', 1, 0, 60),
    guess('2814', 0, 2, 20),
    guess('7777', 0, 0, 20, false),
    guess('5247', 2, 2, 2),
    guess('5274', 4, 0, 1),
  ],
  secret: '5274',
  dailyNumber: 127,
}

export const lostGame: GameViewDto = {
  ...wonGame,
  id: 'g2',
  won: false,
  score: 0,
  attempts: 3,
  guesses: wonGame.guesses.slice(0, 3),
}

export const fallbackDistribution: DistributionDto = {
  histogram: [...FALLBACK_HISTOGRAM[4]],
  sample: 0,
  fallback: true,
}

export const meFixture: MeDto = {
  profile: {
    id: 'u1',
    username: 'Мира',
    isGuest: false,
    lang: 'bg',
    sound: true,
    vibrate: true,
    defaultLen: 4,
    avatarSpecies: 'bull',
  },
  xp: 650,
  level: 2,
  xpIntoLevel: 150,
  xpForNextLevel: 750,
  rankKey: 'herdsman',
  rating: 1240,
  currentGameId: null,
  stats: { played: 6, winRate: 83, streak: 3, best: 4 },
  buckets: [
    { attempts: 3, count: 0 },
    { attempts: 4, count: 1 },
    { attempts: 5, count: 1 },
    { attempts: 6, count: 2 },
    { attempts: 7, count: 1 },
    { attempts: 8, count: 0 },
    { attempts: 9, count: 0 },
    { attempts: 10, count: 0 },
  ],
  badges: {
    noWaste: true,
    underMinute: false,
    streak: false,
    five: false,
  },
  recent: [],
}

/** Progress per badge as on the Р2 artboard; everything else is at zero. */
const BADGE_PROGRESS: Readonly<Partial<Record<BadgeKey, number>>> = {
  noWaste: 14, sherlock: 3, allCows: 1, five: 4, underMinute: 12, bolt: 1, streak: 9, early: 6,
  duelist: 23, unbeaten: 6, comeback: 1, rematch: 3, bot1: 1, bot2: 1, formats: 4, notes: 31, teller: 8,
}

/** All 29 badges as `GET /api/me/badges` returns them, with the artboard's tiers. */
export const badgesFixture: BadgeStateDto[] = BADGES.map((def) => {
  const progress = BADGE_PROGRESS[def.key] ?? 0
  const tier = tierFor(def, progress)
  return { key: def.key, tier, progress, next: nextThreshold(def, tier), earnedAt: tier > 0 ? START : null }
})

export const boardFixture: LeaderboardDto = {
  rows: [
    { rank: 1, username: 'Ани', attempts: 4, score: 1015, you: false, level: 22, rankKey: 'steward', avatarSpecies: 'cow' },
    { rank: 2, username: 'Боби', attempts: 5, score: 925, you: false, level: 11, rankKey: 'pastor', avatarSpecies: 'bull' },
    { rank: 3, username: 'Цвети', attempts: 5, score: 880, you: false, level: 7, rankKey: 'shepherd', avatarSpecies: 'cow' },
    { rank: 4, username: 'Ники', attempts: 6, score: 800, you: false, level: 3, rankKey: 'herdsman', avatarSpecies: 'bull' },
    { rank: 5, username: 'Мира', attempts: 6, score: 770, you: true, level: 2, rankKey: 'herdsman', avatarSpecies: 'bull' },
  ],
  me: { rank: 5, score: 770, top: 40 },
}
