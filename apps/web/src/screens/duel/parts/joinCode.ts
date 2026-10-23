import { INVITE_ALPHABET, isInviteCode } from '@bc/game-core'

const LINK_CODE = /\/d\/([A-Za-z0-9]{5})(?:[/?#]|$)/

/**
 * The invite code a friend typed or pasted: the code itself (any case, spaces and dashes
 * ignored) or the whole invite link (`…/d/ABCDE`). Null when it is not a valid code.
 */
export function parseInviteCode(raw: string): string | null {
  const link = LINK_CODE.exec(raw.trim())
  const candidate = (link ? link[1] : raw).toUpperCase().replace(/[\s-]/g, '')
  return isInviteCode(candidate) ? candidate : null
}

/** Keeps only characters a code can hold while typing, upper-cased, at most five. */
export function sanitizeTyping(raw: string): string {
  const link = LINK_CODE.exec(raw)
  const source = link ? link[1] : raw
  return [...source.toUpperCase()].filter((ch) => INVITE_ALPHABET.includes(ch)).slice(0, 5).join('')
}
