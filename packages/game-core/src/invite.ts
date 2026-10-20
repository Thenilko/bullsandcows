export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_LENGTH = 5

export function inviteCode(rng: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < INVITE_LENGTH; i++) {
    out += INVITE_ALPHABET[Math.floor(rng() * INVITE_ALPHABET.length)]
  }
  return out
}

export function isInviteCode(s: string): boolean {
  if (s.length !== INVITE_LENGTH) return false
  for (const ch of s) if (!INVITE_ALPHABET.includes(ch)) return false
  return true
}
