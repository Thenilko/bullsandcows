export type Len = 3 | 4 | 5

const cache = new Map<string, readonly string[]>()

/** Number of distinct-digit codes: P(digits, len). */
export function totalCodes(len: Len, zero: boolean): number {
  const digits = zero ? 10 : 9
  let total = 1
  for (let i = 0; i < len; i++) total *= digits - i
  return total
}

/** All distinct-digit codes in lexicographic order; cached and frozen per (len, zero). */
export function codes(len: Len, zero: boolean): readonly string[] {
  const key = `${len}${zero ? 'z' : 'n'}`
  const hit = cache.get(key)
  if (hit) return hit
  const out: string[] = []
  const first = zero ? 0 : 1
  const build = (prefix: string, used: number): void => {
    if (prefix.length === len) {
      out.push(prefix)
      return
    }
    for (let d = first; d < 10; d++) {
      if (used & (1 << d)) continue
      build(prefix + d, used | (1 << d))
    }
  }
  build('', 0)
  const frozen = Object.freeze(out)
  cache.set(key, frozen)
  return frozen
}

export function isValidCode(s: string, len: Len, zero: boolean): boolean {
  if (s.length !== len) return false
  const pattern = zero ? /^[0-9]+$/ : /^[1-9]+$/
  return pattern.test(s) && new Set(s).size === len
}
