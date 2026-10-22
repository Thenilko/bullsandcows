import { beforeEach, describe, expect, it } from 'vitest'
import { useBadgeToasts } from './toastStore'

beforeEach(() => {
  useBadgeToasts.setState({ queue: [], shown: 0 })
})

describe('useBadgeToasts', () => {
  it('queues tiers in arrival order and shows them one after another', () => {
    const s = useBadgeToasts.getState()
    s.push([{ key: 'noWaste', tier: 1 }, { key: 'sherlock', tier: 1 }])
    s.push([{ key: 'teller', tier: 1 }])
    expect(useBadgeToasts.getState().queue.map((b) => b.key)).toEqual(['noWaste', 'sherlock', 'teller'])
    expect(useBadgeToasts.getState().shown).toBe(1)
    s.next()
    expect(useBadgeToasts.getState().queue.map((b) => b.key)).toEqual(['sherlock', 'teller'])
    expect(useBadgeToasts.getState().shown).toBe(2)
    s.next()
    s.next()
    expect(useBadgeToasts.getState().queue).toEqual([])
    expect(useBadgeToasts.getState().shown).toBe(3)
  })

  it('ignores empty or missing lists and clears', () => {
    const s = useBadgeToasts.getState()
    s.push(undefined)
    s.push([])
    expect(useBadgeToasts.getState().shown).toBe(0)
    s.push([{ key: 'bolt', tier: 1 }])
    s.clear()
    expect(useBadgeToasts.getState().queue).toEqual([])
  })
})
