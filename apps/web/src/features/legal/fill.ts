import { EMAIL_PLACEHOLDER, SITE } from './site'
import { versionLabel } from './version'

/** Replaces `{OPERATOR}`-style placeholders with the values from site.ts. */
export function fill(text: string): string {
  const values: Record<string, string> = {
    OPERATOR: SITE.OPERATOR,
    EMAIL: SITE.EMAIL || EMAIL_PLACEHOLDER,
    CREATOR: SITE.CREATOR,
    VERSION: versionLabel(),
  }
  return text.replace(/\{([A-Z]+)\}/g, (all, key: string) => values[key] ?? all)
}

export type Piece = { readonly text: string } | { readonly text: string; readonly href: string }

/** Splits `[text](href)` links out of a string, after filling the placeholders. */
export function pieces(text: string): Piece[] {
  const filled = fill(text)
  const out: Piece[] = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  for (const m of filled.matchAll(re)) {
    if (m.index > last) out.push({ text: filled.slice(last, m.index) })
    out.push({ text: m[1] ?? '', href: m[2] ?? '' })
    last = m.index + m[0].length
  }
  if (last < filled.length) out.push({ text: filled.slice(last) })
  return out
}
