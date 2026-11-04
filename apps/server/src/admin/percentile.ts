/** Linear-interpolated percentile of sorted values (as Postgres `percentile_cont`); 0 for none. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const at = (sorted.length - 1) * p
  const lo = Math.floor(at)
  const hi = Math.ceil(at)
  const a = sorted[lo] ?? 0
  const b = sorted[hi] ?? a
  return a + (b - a) * (at - lo)
}
