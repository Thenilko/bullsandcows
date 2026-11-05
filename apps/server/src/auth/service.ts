import type { Lang } from '@bc/i18n'
import type {
  AuthResponseDto,
  GuestProfileResponseDto,
  LoginBody,
  NewBadgeDto,
  ResetBody,
  UpgradeBody,
} from '@bc/protocol'
import { AppError } from '../http/errors'
import type { AuthPort, AuthUser, Session } from '../ports/auth'
import { systemClock, type Clock } from '../ports/clock'
import type { Repo } from '../ports/repo'
import type { StatsService } from '../stats/service'
import { grantPioneer, pioneerSpots } from './pioneer'
import { createWithGeneratedName, ensureProfile } from './profiles'

export interface AuthDeps {
  readonly repo: Repo
  readonly auth: AuthPort
  readonly stats: StatsService
  /** Where the password reset link lands (`<origin>/reset`). */
  readonly appOrigin: string
  readonly clock?: Clock
}

export interface RegisterInput {
  readonly username: string
  readonly email: string
  readonly password: string
  readonly lang?: Lang
}

const credentials = () => new AppError('ERR_CREDENTIALS', 401)

/**
 * Errors that could tell whether an address has an account: 4xx on some setups, and 429
 * (Supabase throttles resends per existing user only). Our IP limiter guards the route.
 */
const mayRevealAccount = (err: unknown) =>
  err instanceof AppError &&
  (err.code === 'ERR_INPUT' || err.code === 'ERR_CREDENTIALS' || err.code === 'ERR_RATE_LIMIT')

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const { repo, auth } = this.deps
    await this.assertNameFree(input.username)
    const email = input.email.toLowerCase()
    const session = await auth.signUp(email, input.password)
    await repo.profiles.create({
      id: session.user.id,
      username: input.username,
      email,
      isGuest: false,
      lang: input.lang ?? 'bg',
      sound: true,
      vibrate: true,
      defaultLen: 4,
    })
    const newBadges = await this.pioneer(session.user.id)
    return this.respond(session, newBadges)
  }

  /** `identifier` is an email (contains "@") or a username; failures never say which part. */
  async login({ identifier, password }: LoginBody): Promise<AuthResponseDto> {
    const email = await this.emailOf(identifier.trim())
    if (!email) throw credentials()
    const session = await this.deps.auth.signIn(email, password)
    await ensureProfile(this.deps.repo, session.user, email)
    return this.respond(session)
  }

  async guest(): Promise<AuthResponseDto> {
    const session = await this.deps.auth.signInGuest()
    const { id } = session.user
    await createWithGeneratedName(this.deps.repo, { id, email: null, isGuest: true }, 'guest')
    return this.respond(session)
  }

  /**
   * The client signed in anonymously with Supabase itself (so Supabase's per-IP limits see the
   * player's IP, not the Worker's): only the `guest-XXXX` profile is ensured here.
   */
  async ensureGuest(user: AuthUser): Promise<GuestProfileResponseDto> {
    if (!user.isGuest) throw new AppError('ERR_INPUT', 400)
    await ensureProfile(this.deps.repo, user)
    return { session: null, me: await this.deps.stats.me(user) }
  }

  /** Guest → member, keeping the id (and so the games and XP); returns a member session. */
  async upgrade(user: AuthUser, input: UpgradeBody): Promise<AuthResponseDto> {
    const { repo, auth } = this.deps
    // The token's `is_anonymous` outlives an upgrade (until it expires): the database decides.
    const profile = user.isGuest ? await ensureProfile(repo, user) : null
    if (!profile?.isGuest) throw new AppError('ERR_INPUT', 400)
    await this.assertNameFree(input.username, user.id)
    const email = input.email.toLowerCase()
    await auth.upgrade(user.id, email, input.password)
    await repo.profiles.update(user.id, { username: input.username, email, isGuest: false })
    const newBadges = await this.pioneer(user.id)
    // The guest's token still says `is_anonymous`; sign in again for one that does not.
    return this.respond(await auth.signIn(email, input.password), newBadges)
  }

  /** `GET /api/auth/pioneer`: spots left for „Пионер“. */
  pioneerSpots() {
    return pioneerSpots(this.deps.repo)
  }

  /** The profile is a member now; a failing grant must not undo (or fail) the sign-up itself. */
  private async pioneer(userId: string) {
    try {
      return await grantPioneer(this.deps.repo, userId, (this.deps.clock ?? systemClock).now())
    } catch (err) {
      console.error(`pioneer grant failed: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }

  /** Always "sent", whether or not the address has an account. */
  async reset({ email }: ResetBody): Promise<{ sent: true }> {
    const redirectTo = new URL('/reset', this.deps.appOrigin).toString()
    try {
      await this.deps.auth.requestReset(email.toLowerCase(), redirectTo)
    } catch (err) {
      if (!mayRevealAccount(err)) throw err
    }
    return { sent: true }
  }

  private async assertNameFree(username: string, ownerId?: string): Promise<void> {
    const existing = await this.deps.repo.profiles.getByUsername(username)
    if (existing && existing.id !== ownerId) throw new AppError('ERR_USERNAME_TAKEN', 409)
  }

  private async emailOf(identifier: string): Promise<string | null> {
    if (identifier.includes('@')) return identifier.toLowerCase()
    return (await this.deps.repo.profiles.getByUsername(identifier))?.email ?? null
  }

  private async respond(
    session: Session,
    newBadges: readonly NewBadgeDto[] = [],
  ): Promise<AuthResponseDto> {
    const me = await this.deps.stats.me(session.user)
    return newBadges.length > 0 ? { session, me, newBadges: [...newBadges] } : { session, me }
  }
}
