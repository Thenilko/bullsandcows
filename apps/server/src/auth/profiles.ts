import { INVITE_ALPHABET } from '@bc/game-core'
import { AppError } from '../http/errors'
import type { AuthUser } from '../ports/auth'
import type { NewProfile, Profile, Repo } from '../ports/repo'

const NAME_SUFFIX_CHARS = 4
const NAME_ATTEMPTS = 5

export type NamePrefix = 'guest' | 'player'

/** `<prefix>-XXXX` from the invite alphabet (32 symbols: a byte modulo 32 has no bias). */
export function generatedName(prefix: NamePrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NAME_SUFFIX_CHARS))
  const suffix = Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
  return `${prefix}-${suffix}`
}

const isTaken = (err: unknown) => err instanceof AppError && err.code === 'ERR_USERNAME_TAKEN'

/** Creates a profile with a generated name, retrying on a name collision. */
export async function createWithGeneratedName(
  repo: Repo,
  profile: Omit<NewProfile, 'username'>,
  prefix: NamePrefix,
): Promise<Profile> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await repo.profiles.create({ ...profile, username: generatedName(prefix) })
    } catch (err) {
      if (!isTaken(err) || attempt >= NAME_ATTEMPTS) throw err
    }
  }
}

/**
 * The profile of an authenticated user, created on first use when the account was made
 * outside this app (or a previous request failed after signing up).
 */
export async function ensureProfile(
  repo: Repo,
  user: AuthUser,
  email: string | null = null,
): Promise<Profile> {
  const existing = await repo.profiles.get(user.id)
  // A profile created on read has no email yet; without it the name cannot be used to log in.
  if (existing && email !== null && existing.email === null) {
    return repo.profiles.update(user.id, { email })
  }
  if (existing) return existing
  try {
    return await createWithGeneratedName(
      repo,
      { id: user.id, email, isGuest: user.isGuest },
      user.isGuest ? 'guest' : 'player',
    )
  } catch (err) {
    // A concurrent request created it first.
    const raced = await repo.profiles.get(user.id)
    if (raced) return raced
    throw err
  }
}
