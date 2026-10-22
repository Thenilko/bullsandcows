import { displayRating, levelFromXp, rankKeyForLevel, xpIntoLevel } from '@bc/game-core'
import type { BucketDto, MeDto, ProfileDto, RecentGameDto } from '@bc/protocol'
import type { Profile, PublicGameRow } from '../ports/repo'

export const RECENT_GAMES = 10
/** Guests have no progression: they are always „Теленце“. */
export const GUEST_RANK: MeDto['rankKey'] = 'calf'
const BUCKET_FIRST = 3
const BUCKET_LAST = 10

type Finished = PublicGameRow & { readonly finishedAt: number }

export const isFinished = (g: PublicGameRow): g is Finished => g.finishedAt !== null
export const isSolo = (g: PublicGameRow) => g.kind === 'daily' || g.kind === 'free'

export const toProfileDto = (p: Profile): ProfileDto => ({
  id: p.id,
  username: p.username,
  isGuest: p.isGuest,
  lang: p.lang,
  sound: p.sound,
  vibrate: p.vibrate,
  defaultLen: p.defaultLen,
})

/** Title as in the prototype: RANK_KEYS[min(5, level)], so level 1 is "herdsman". */
export function levelInfo(
  profile: Profile,
): Pick<MeDto, 'xp' | 'level' | 'xpIntoLevel' | 'rankKey' | 'rating'> {
  const level = levelFromXp(profile.xp)
  return {
    xp: profile.xp,
    level,
    xpIntoLevel: xpIntoLevel(profile.xp),
    rankKey: profile.isGuest ? GUEST_RANK : rankKeyForLevel(level),
    rating: displayRating(profile.rating),
  }
}

/** As in the prototype: wins with exactly 3..9 attempts, and 10 or more in the last bucket. */
export function bucketsOf(wins: readonly PublicGameRow[]): BucketDto[] {
  const keys = Array.from({ length: BUCKET_LAST - BUCKET_FIRST + 1 }, (_, i) => BUCKET_FIRST + i)
  return keys.map((k) => ({
    attempts: k,
    count: wins.filter((g) => (k === BUCKET_LAST ? g.attempts >= k : g.attempts === k)).length,
  }))
}

export function summaryOf(counted: readonly PublicGameRow[], streak: number): MeDto['stats'] {
  const wins = counted.filter((g) => g.won === true)
  return {
    played: counted.length,
    winRate: counted.length ? Math.round((wins.length / counted.length) * 100) : 0,
    streak,
    best: wins.length ? Math.min(...wins.map((g) => g.attempts)) : null,
  }
}

export const toRecent = (g: Finished): RecentGameDto => ({
  id: g.id,
  kind: g.kind,
  len: g.len,
  zero: g.zero,
  won: g.won === true,
  attempts: g.attempts,
  score: g.score,
  finishedAt: g.finishedAt,
  practice: g.practice,
})
