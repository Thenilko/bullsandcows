import type { Len } from './codes'

/** How a probe is scored over the pool: the largest answer bucket, or the expected pool size after it. */
export type ProbeScore = 'worst' | 'expected'

interface Encoded {
  readonly digits: Uint8Array
  readonly masks: Uint16Array
  readonly n: number
  readonly len: number
}

/** Popcount of a 10-bit digit mask: the digits two codes share. */
const POP = new Uint8Array(1024)
for (let i = 1; i < POP.length; i++) POP[i] = POP[i >> 1] + (i & 1)

function encode(list: readonly string[], len: Len): Encoded {
  const n = list.length
  const digits = new Uint8Array(n * len)
  const masks = new Uint16Array(n)
  for (let i = 0; i < n; i++) {
    let mask = 0
    for (let j = 0; j < len; j++) {
      const d = list[i].charCodeAt(j) - 48
      digits[i * len + j] = d
      mask |= 1 << d
    }
    masks[i] = mask
  }
  return { digits, masks, n, len }
}

/** Fills `buckets` (index `bulls * (len + 1) + cows`) with how the pool answers probe `p`. */
function bucketize(probe: Encoded, p: number, pool: Encoded, buckets: Uint32Array): void {
  buckets.fill(0)
  const { len } = pool
  const pBase = p * len
  const pMask = probe.masks[p]
  for (let i = 0; i < pool.n; i++) {
    const base = i * len
    let bulls = 0
    for (let j = 0; j < len; j++) if (pool.digits[base + j] === probe.digits[pBase + j]) bulls++
    const cows = POP[pMask & pool.masks[i]] - bulls
    buckets[bulls * (len + 1) + cows]++
  }
}

function scoreBuckets(buckets: Uint32Array, kind: ProbeScore): number {
  let score = 0
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i]
    score = kind === 'worst' ? Math.max(score, b) : score + b * b
  }
  return score
}

/**
 * The probe whose answer splits the pool best (lowest score). Ties go to a probe that is itself a
 * candidate (it can end the game at once), then to the earlier one. `probes` may hold codes that
 * are not candidates: an inconsistent guess sometimes narrows the pool more than any consistent one.
 */
export function bestProbe(
  pool: readonly string[],
  probes: readonly string[],
  len: Len,
  kind: ProbeScore,
): string {
  if (probes.length === 0) throw new Error('bestProbe: no probes')
  const inPool = new Set(pool)
  const encPool = encode(pool, len)
  const encProbes = encode(probes, len)
  const buckets = new Uint32Array((len + 1) * (len + 1))
  let best = 0
  let bestScore = Infinity
  let bestInPool = false
  for (let p = 0; p < probes.length; p++) {
    bucketize(encProbes, p, encPool, buckets)
    const score = scoreBuckets(buckets, kind)
    const consistent = inPool.has(probes[p])
    if (score < bestScore || (score === bestScore && consistent && !bestInPool)) {
      best = p
      bestScore = score
      bestInPool = consistent
    }
  }
  return probes[best]
}
