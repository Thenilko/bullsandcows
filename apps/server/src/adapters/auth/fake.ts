import { INVITE_ALPHABET } from '@bc/game-core'
import { AppError } from '../../http/errors'
import type { AuthPort, AuthUser, Session } from '../../ports/auth'
import type { Clock } from '../../ports/clock'

const PREFIX = 'fake'
const GUEST_SUFFIX = 'guest'
const SESSION_SECONDS = 3600
const GUEST_NAME_CHARS = 4

interface Account {
  readonly id: string
  readonly username: string
  readonly password: string
}

const tokenFor = (user: AuthUser, username: string): string =>
  [PREFIX, user.id, username, ...(user.isGuest ? [GUEST_SUFFIX] : [])].join(':')

function randomGuestName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GUEST_NAME_CHARS))
  return `guest-${Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')}`
}

const usernameOf = (email: string): string => email.split('@')[0]?.replaceAll(':', '') || 'player'

/** Parses `fake:<id>:<username>[:guest]`; anything else is not a valid token. */
function parseToken(token: string): AuthUser | null {
  const parts = token.split(':')
  const [prefix, id, username] = parts
  if (prefix !== PREFIX || !id || !username) return null
  if (parts.length === 3) return { id, isGuest: false }
  if (parts.length === 4 && parts[3] === GUEST_SUFFIX) return { id, isGuest: true }
  return null
}

/**
 * Development auth: tokens are readable strings, accounts live in memory. Never used in
 * production (`parseEnv` rejects AUTH_MODE "fake" there).
 */
export function createFakeAuth(clock: Clock): AuthPort {
  let accounts: ReadonlyMap<string, Account> = new Map()

  const session = (user: AuthUser, username: string): Session => ({
    accessToken: tokenFor(user, username),
    refreshToken: `${PREFIX}-refresh:${user.id}`,
    expiresAt: Math.floor(clock.now() / 1000) + SESSION_SECONDS,
    user,
  })

  const register = (email: string, account: Account): void => {
    accounts = new Map([...accounts, [email.toLowerCase(), account]])
  }

  return {
    verify: async (token) => parseToken(token),
    signUp: async (email, password) => {
      if (accounts.has(email.toLowerCase())) throw new AppError('ERR_INPUT', 400)
      const account = { id: crypto.randomUUID(), username: usernameOf(email), password }
      register(email, account)
      return session({ id: account.id, isGuest: false }, account.username)
    },
    signIn: async (email, password) => {
      const account = accounts.get(email.toLowerCase())
      if (!account || account.password !== password) throw new AppError('ERR_CREDENTIALS', 401)
      return session({ id: account.id, isGuest: false }, account.username)
    },
    signInGuest: async () => session({ id: crypto.randomUUID(), isGuest: true }, randomGuestName()),
    upgrade: async (userId, email, password) => {
      register(email, { id: userId, username: usernameOf(email), password })
    },
    requestReset: async () => undefined,
  }
}
