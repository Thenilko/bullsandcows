/**
 * The code being typed, slot by slot. `HOLE` marks an empty slot before a filled one (a digit placed straight
 * into a later slot); trailing empty slots are not stored, so a code typed left to right is a plain string.
 */
export const HOLE = '_'

const trimHoles = (cur: string): string => cur.replace(/_+$/, '')

/** How many slots hold a digit. */
export const filledCount = (cur: string): number => [...cur].filter((c) => c !== HOLE).length

/** Every slot holds a digit: the code can be sent. */
export const isComplete = (cur: string, len: number): boolean =>
  cur.length === len && !cur.includes(HOLE)

/** The slot the next digit goes to: the chosen one, else the first empty one; null when all are full. */
export function targetSlot(cur: string, len: number, selected: number | null): number | null {
  if (selected !== null && selected >= 0 && selected < len) return selected
  const hole = cur.indexOf(HOLE)
  if (hole >= 0) return hole
  return cur.length < len ? cur.length : null
}

/**
 * Puts `d` into the target slot (replacing what was there). A digit already in another slot is refused, as the
 * code has no repeats; returns the code unchanged then.
 */
export function placeDigit(cur: string, len: number, d: string, selected: number | null): string {
  const at = targetSlot(cur, len, selected)
  if (at === null) return cur
  if ([...cur].some((c, i) => c === d && i !== at)) return cur
  const chars = [...cur.padEnd(at + 1, HOLE)]
  chars[at] = d
  return trimHoles(chars.join(''))
}

/** Empties the chosen slot if it holds a digit, else the last filled one. */
export function eraseDigit(cur: string, selected: number | null): string {
  const chosen =
    selected !== null && cur[selected] !== undefined && cur[selected] !== HOLE ? selected : -1
  const last = cur.replace(/_+$/, '').length - 1
  const at = chosen >= 0 ? chosen : last
  if (at < 0) return cur
  const chars = [...cur]
  chars[at] = HOLE
  return trimHoles(chars.join(''))
}
