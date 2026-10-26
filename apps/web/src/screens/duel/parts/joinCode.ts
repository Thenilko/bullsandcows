import { isInviteCode } from '@bc/game-core'

/** The invite link of a duel (`/d/…`) or of a family farm (`/ferma/…`). */
export type CodeLink = 'd' | 'ferma'
const linkCode = (prefix: CodeLink) => new RegExp(`/${prefix}/([A-Za-z0-9]{5})(?:[/?#]|$)`)
const CODE_LENGTH = 5

/** Cyrillic letters that look like the Latin ones a code may hold (a Bulgarian keyboard types these). */
const HOMOGLYPHS: Readonly<Record<string, string>> = {
  А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', К: 'K', М: 'M', Р: 'P', Т: 'T', Х: 'X', У: 'Y',
}

const normalize = (raw: string): string =>
  [...raw.toUpperCase().replace(/[\s-]/g, '')].map((ch) => HOMOGLYPHS[ch] ?? ch).join('')

/**
 * The invite code a friend typed or pasted: the code itself (any case, spaces and dashes
 * ignored, Cyrillic look-alikes accepted) or the whole invite link (`…/d/ABCDE`). Null when
 * it is not a valid code.
 */
export function parseInviteCode(raw: string, prefix: CodeLink = 'd'): string | null {
  const link = linkCode(prefix).exec(raw.trim())
  const candidate = normalize(link ? link[1] : raw)
  return isInviteCode(candidate) ? candidate : null
}

/**
 * What the field shows while typing: upper-cased, Cyrillic look-alikes swapped, at most five
 * characters. Other characters stay visible, so a wrong key is seen and explained on submit
 * rather than silently dropped.
 */
export function sanitizeTyping(raw: string, prefix: CodeLink = 'd'): string {
  const link = linkCode(prefix).exec(raw)
  return normalize(link ? link[1] : raw).slice(0, CODE_LENGTH)
}
