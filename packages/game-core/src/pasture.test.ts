import { describe, expect, it } from 'vitest'
import {
  BARN_COLOR_KEYS,
  BARN_COLORS,
  DEFAULT_BARN_COLOR,
  isBarnColor,
  isPastureKey,
  isPastureUnlocked,
  newPastureUnlocks,
  nextLevelUnlock,
  PASTURE_ITEMS,
  PASTURE_KEYS,
  pastureItem,
  pastureProgress,
  unlockedPastureKeys,
  type PastureFacts,
} from './pasture'

const facts = (level: number, badges: PastureFacts['badges'] = {}): PastureFacts => ({ level, badges })

describe('PASTURE_ITEMS', () => {
  it('lists the nine rewards of the spec in catalog order', () => {
    expect(PASTURE_ITEMS.map((i) => i.key)).toEqual([...PASTURE_KEYS])
    expect(PASTURE_KEYS).toEqual(['dog', 'sunflowers', 'beehive', 'rooster', 'windmill', 'pond', 'barnColor', 'shed', 'goldenVane'])
  })

  it('uses the requirements of the spec', () => {
    const reqs = Object.fromEntries(PASTURE_ITEMS.map((i) => [i.key, i.requirement]))
    expect(reqs).toEqual({
      dog: { kind: 'level', level: 5 },
      sunflowers: { kind: 'level', level: 10 },
      beehive: { kind: 'badge', badge: 'early', tier: 1 },
      rooster: { kind: 'badge', badge: 'streak', tier: 2 },
      windmill: { kind: 'level', level: 15 },
      pond: { kind: 'level', level: 20 },
      barnColor: { kind: 'level', level: 25 },
      shed: { kind: 'level', level: 30 },
      goldenVane: { kind: 'level', level: 35 },
    })
  })

  it('has the barn colours of the spec, red first and default', () => {
    expect(BARN_COLOR_KEYS).toEqual(['red', 'blue', 'green', 'yellow', 'purple'])
    expect(DEFAULT_BARN_COLOR).toBe('red')
    expect(BARN_COLORS).toMatchObject({ blue: '#3B76B8', green: '#5E9E46', yellow: '#E2B44A', purple: '#8E5BA8' })
  })

  it('only the barn colour is not a toggle', () => {
    expect(PASTURE_ITEMS.filter((i) => !i.toggle).map((i) => i.key)).toEqual(['barnColor'])
  })

  it('guards keys and colours', () => {
    expect(isPastureKey('dog')).toBe(true)
    expect(isPastureKey('cat')).toBe(false)
    expect(isBarnColor('blue')).toBe(true)
    expect(isBarnColor('#3B76B8')).toBe(false)
    expect(pastureItem('pond').requirement).toEqual({ kind: 'level', level: 20 })
  })
})

describe('isPastureUnlocked', () => {
  it('unlocks a level reward at exactly its level', () => {
    expect(isPastureUnlocked(pastureItem('dog'), facts(4))).toBe(false)
    expect(isPastureUnlocked(pastureItem('dog'), facts(5))).toBe(true)
    expect(isPastureUnlocked(pastureItem('goldenVane'), facts(34))).toBe(false)
    expect(isPastureUnlocked(pastureItem('goldenVane'), facts(35))).toBe(true)
  })

  it('unlocks the beehive with „Ранобудник“ at bronze', () => {
    expect(isPastureUnlocked(pastureItem('beehive'), facts(1))).toBe(false)
    expect(isPastureUnlocked(pastureItem('beehive'), facts(1, { early: { tier: 1, progress: 1 } }))).toBe(true)
  })

  it('unlocks the rooster only with a 30-day streak (the silver tier), whatever the level', () => {
    expect(isPastureUnlocked(pastureItem('rooster'), facts(50, { streak: { tier: 1, progress: 29 } }))).toBe(false)
    expect(isPastureUnlocked(pastureItem('rooster'), facts(1, { streak: { tier: 2, progress: 30 } }))).toBe(true)
  })
})

describe('pastureProgress', () => {
  it('counts levels and badge progress towards the target, capped at it', () => {
    expect(pastureProgress(pastureItem('windmill'), facts(12))).toEqual({ current: 12, target: 15 })
    expect(pastureProgress(pastureItem('windmill'), facts(40))).toEqual({ current: 15, target: 15 })
    expect(pastureProgress(pastureItem('rooster'), facts(3, { streak: { tier: 1, progress: 9 } }))).toEqual({ current: 9, target: 30 })
    expect(pastureProgress(pastureItem('beehive'), facts(3))).toEqual({ current: 0, target: 1 })
  })
})

describe('unlockedPastureKeys / newPastureUnlocks', () => {
  it('lists what the facts unlock, in catalog order', () => {
    expect(unlockedPastureKeys(facts(1))).toEqual([])
    expect(unlockedPastureKeys(facts(12, { early: { tier: 1, progress: 2 } }))).toEqual(['dog', 'sunflowers', 'beehive'])
    expect(unlockedPastureKeys(facts(38, { early: { tier: 3, progress: 40 }, streak: { tier: 3, progress: 120 } }))).toEqual([
      ...PASTURE_KEYS,
    ])
  })

  it('returns only what is unlocked now and was not before', () => {
    const before = unlockedPastureKeys(facts(4))
    const after = unlockedPastureKeys(facts(10, { early: { tier: 1, progress: 1 } }))
    expect(newPastureUnlocks(before, after)).toEqual(['dog', 'sunflowers', 'beehive'])
    expect(newPastureUnlocks(after, after)).toEqual([])
  })
})

describe('nextLevelUnlock', () => {
  it('names the next reward that comes with a level', () => {
    expect(nextLevelUnlock(1)?.key).toBe('dog')
    expect(nextLevelUnlock(15)?.key).toBe('pond')
    expect(nextLevelUnlock(35)).toBeNull()
  })
})
