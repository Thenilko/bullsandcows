import { INVITE_ALPHABET } from '@bc/game-core'
import { AppError } from '../../http/errors'
import type { AuthPort, AuthUser, Session } from '../../ports/auth'
import type { Clock } from '../../ports/clock'

const PREFIX = 'fake'
const GUEST_SUFFIX = 'guest'
const ADMIN_SUFFIX = 'admin'
/** In dev and tests this account is the admin (production reads `app_metadata.role`, see supabase.ts). */
export const FAKE_ADMIN_EMAIL = 'admin@pasishte.test'
const SESSION_SECONDS = 3600
const GUEST_NAME_CHARS = 4

interface Account {
  readonly id: string
  readonly username: string
  readonly password: string
  readonly isAdmin: boolean
}

const suffixOf = (user: AuthUser): string[] =>
  user.isGuest ? [GUEST_SUFFIX] : user.isAdmin ? [ADMIN_SUFFIX] : []

const tokenFor = (user: AuthUser, username: string): string =>
  [PREFIX, user.id, username, ...suffixOf(user)].join(':')

function randomGuestName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GUEST_NAME_CHARS))
  return `guest-${Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')}`
}

const usernameOf = (email: string): string => email.split('@')[0]?.replaceAll(':', '') || 'player'

/** Parses `fake:<id>:<username>[:guest|:admin]`; anything else is not a valid token. */
function parseToken(token: string): AuthUser | null {
  const parts = token.split(':')
  const [prefix, id, username] = parts
  if (prefix !== PREFIX || !id || !username) return null
  if (parts.length === 3) return { id, isGuest: false }
  if (parts.length === 4 && parts[3] === GUEST_SUFFIX) return { id, isGuest: true }
  if (parts.length === 4 && parts[3] === ADMIN_SUFFIX) return { id, isGuest: false, isAdmin: true }
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

  const register = (email: string, account: Omit<Account, 'isAdmin'>): Account => {
    const stored = { ...account, isAdmin: email.toLowerCase() === FAKE_ADMIN_EMAIL }
    accounts = new Map([...accounts, [email.toLowerCase(), stored]])
    return stored
  }

  const userOf = (account: Account): AuthUser =>
    account.isAdmin ? { id: account.id, isGuest: false, isAdmin: true } : { id: account.id, isGuest: false }

  return {
    verify: async (token) => parseToken(token),
    signUp: async (email, password) => {
      if (accounts.has(email.toLowerCase())) throw new AppError('ERR_INPUT', 400)
      const account = register(email, { id: crypto.randomUUID(), username: usernameOf(email), password })
      return session(userOf(account), account.username)
    },
    signIn: async (email, password) => {
      const account = accounts.get(email.toLowerCase())
      if (!account || account.password !== password) throw new AppError('ERR_CREDENTIALS', 401)
      return session(userOf(account), account.username)
    },
    signInGuest: async () => session({ id: crypto.randomUUID(), isGuest: true }, randomGuestName()),
    upgrade: async (userId, email, password) => {
      register(email, { id: userId, username: usernameOf(email), password })
    },
    requestReset: async () => undefined,
    deleteUser: async (userId) => {
      accounts = new Map([...accounts].filter(([, account]) => account.id !== userId))
    },
  }
}
