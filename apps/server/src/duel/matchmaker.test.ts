import { describe, expect, it } from 'vitest'
import { dequeue, enqueue, tick, windowFor, type QueueEntry, type QueueState } from './matchmaker'

const entry = (over: Partial<QueueEntry> = {}): QueueEntry => ({
  userId: 'u1',
  username: 'one',
  level: 1,
  rating: 1500,
  len: 4,
  zero: false,
  format: 'race',
  joinedAt: 0,
  ...over,
})
const empty: QueueState = { entries: [] }

describe('windowFor', () => {
  it.each([
    [0, 75],
    [4999, 75],
    [5000, 150],
    [60_000, 525],
    [600_000, 525],
  ])('windowFor(%i) = %i', (ms, expected) => {
    expect(windowFor(ms)).toBe(expected)
  })
})

describe('enqueue / dequeue', () => {
  it('does not mutate and replaces the same user', () => {
    const a = enqueue(empty, entry())
    const b = enqueue(a, entry({ joinedAt: 10 }))
    expect(empty.entries).toHaveLength(0)
    expect(a.entries).toHaveLength(1)
    expect(b.entries).toHaveLength(1)
    expect(b.entries[0]?.joinedAt).toBe(10)
  })
  it('removes a user', () => {
    const q = enqueue(enqueue(empty, entry()), entry({ userId: 'u2' }))
    expect(dequeue(q, 'u1').entries.map((e) => e.userId)).toEqual(['u2'])
    expect(q.entries).toHaveLength(2)
  })
})

describe('tick', () => {
  const two = (b: Partial<QueueEntry> = {}) =>
    enqueue(enqueue(empty, entry()), entry({ userId: 'u2', rating: 1600, ...b }))

  it('does not pair a 100 point gap at 0 s but does at 5 s', () => {
    expect(tick(two(), 0).pairs).toHaveLength(0)
    const r = tick(two(), 5000)
    expect(r.pairs).toHaveLength(1)
    expect(r.queue.entries).toHaveLength(0)
  })
  it('uses the smaller window of the two', () => {
    const q = two({ joinedAt: 5000 })
    expect(tick(q, 5000).pairs).toHaveLength(0)
  })
  it('never pairs different settings', () => {
    for (const diff of [{ zero: true }, { len: 5 as const }, { format: 'classic' as const }]) {
      expect(tick(two(diff), 600_000).pairs).toHaveLength(0)
    }
  })
  it('pairs three into one pair, longest waiting first', () => {
    const q = [
      entry({ userId: 'late', joinedAt: 2000 }),
      entry({ userId: 'first', joinedAt: 0 }),
      entry({ userId: 'mid', joinedAt: 1000 }),
    ].reduce(enqueue, empty)
    const r = tick(q, 3000)
    expect(r.pairs.map((p) => p.map((e) => e.userId))).toEqual([['first', 'mid']])
    expect(r.queue.entries.map((e) => e.userId)).toEqual(['late'])
  })
  it('does not mutate the input', () => {
    const q = two()
    tick(q, 10_000)
    expect(q.entries).toHaveLength(2)
  })
})
