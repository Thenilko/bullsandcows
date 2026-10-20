/** Tiny deterministic PRNG (mulberry32) for tests only; not exported from index.ts. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Returns an rng that replays the given values, then repeats the last one. */
export function sequenceRng(values: readonly number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}
