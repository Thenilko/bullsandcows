import type { Len } from './codes'

/** Percent-style weights per attempt count (last bucket = that many or more). */
export const FALLBACK_HISTOGRAM: Readonly<Record<Len, readonly number[]>> = {
  3: [1.5, 5, 13, 23, 25, 17, 9, 4, 2.5],
  4: [0.2, 0.8, 3, 8, 15, 20, 19, 14, 9, 5, 3, 3],
  5: [0.1, 0.3, 1, 3, 7, 12, 16, 17, 15, 11, 8, 9.6],
}

export const MIN_SAMPLE = 30

export interface TopOf {
  readonly top: number
  readonly beat: number
  readonly idx: number
  readonly avg: number
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

export function topOf(attempts: number, histogram: readonly number[]): TopOf {
  const idx = Math.min(Math.max(attempts, 1), histogram.length) - 1
  const tot = sum(histogram)
  const below = sum(histogram.slice(0, idx))
  const here = histogram[idx]
  return {
    top: Math.max(1, Math.round(((below + here / 2) / tot) * 100)),
    beat: Math.round(((tot - below - here) / tot) * 100),
    idx,
    avg: histogram.reduce((acc, d, i) => acc + d * (i + 1), 0) / tot,
  }
}

export function histogramFromAttempts(attempts: readonly number[], len: Len): readonly number[] {
  const buckets = FALLBACK_HISTOGRAM[len].length
  const counts = Array<number>(buckets).fill(0)
  for (const a of attempts) counts[Math.min(a, buckets) - 1] += 1
  return counts
}

export function pickHistogram(
  sampleAttempts: readonly number[],
  len: Len,
): { histogram: readonly number[]; fallback: boolean; sample: number } {
  const sample = sampleAttempts.length
  if (sample < MIN_SAMPLE) return { histogram: FALLBACK_HISTOGRAM[len], fallback: true, sample }
  return { histogram: histogramFromAttempts(sampleAttempts, len), fallback: false, sample }
}
