import { describe, expect, it } from 'vitest'
import { pastureFixture, pastureFullFixture, pastureView } from '../../dev/pastureFixtures'
import { applyPasturePatch, asPastureDto, hiddenKeys, isAllUnlocked, toggleItems, togglePatch, toScenePasture, unlockedCount } from './pastureModel'

describe('pastureModel', () => {
  it('turns the view into what the scene draws', () => {
    expect(toScenePasture(pastureFixture)).toEqual({ shown: ['dog', 'sunflowers', 'beehive'], barnColor: 'red' })
    const hidden = pastureView({ level: 12, badges: {} }, 'red', ['dog'])
    expect(toScenePasture(hidden).shown).toEqual(['sunflowers'])
  })

  it('counts and lists the switchable rewards (not the barn colour)', () => {
    expect(unlockedCount(pastureFixture)).toBe(3)
    expect(isAllUnlocked(pastureFixture)).toBe(false)
    expect(isAllUnlocked(pastureFullFixture)).toBe(true)
    expect(toggleItems(pastureFixture).map((i) => i.key)).not.toContain('barnColor')
    expect(toggleItems(pastureFixture)).toHaveLength(8)
  })

  it('builds the hidden list for a switch and applies it without touching the input', () => {
    const hide = togglePatch(pastureFixture, 'dog', false)
    expect(hide).toEqual({ hiddenItems: ['dog'] })
    const after = applyPasturePatch(pastureFixture, hide)
    expect(hiddenKeys(after)).toEqual(['dog'])
    expect(hiddenKeys(pastureFixture)).toEqual([])
    expect(togglePatch(after, 'dog', true)).toEqual({ hiddenItems: [] })
    expect(applyPasturePatch(pastureFullFixture, { barnColor: 'green' }).barnColor).toBe('green')
    const locked = applyPasturePatch(pastureFixture, { hiddenItems: ['windmill'] })
    expect(locked.items.find((i) => i.key === 'windmill')?.shown).toBe(false)
  })
})

describe('asPastureDto', () => {
  it('passes a view and rejects anything else', () => {
    expect(asPastureDto(pastureFixture)).toBe(pastureFixture)
    for (const bad of [null, {}, { profile: {} }, { ...pastureFixture, barnColor: 'pink' }, { ...pastureFixture, items: [{ key: 'cat' }] }]) {
      expect(() => asPastureDto(bad)).toThrow()
    }
  })
})
