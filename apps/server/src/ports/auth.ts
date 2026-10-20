export interface AuthUser {
  readonly id: string
  readonly isGuest: boolean
}

export interface Session {
  readonly accessToken: string
  readonly refreshToken: string
  /** Unix time in seconds, as Supabase reports it. */
  readonly expiresAt: number
  readonly user: AuthUser
}

export interface AuthPort {
  /** Returns the user behind an access token, or null when it is not valid. */
  verify(token: string): Promise<AuthUser | null>
  signUp(email: string, password: string): Promise<Session>
  signIn(email: string, password: string): Promise<Session>
  signInGuest(): Promise<Session>
  upgrade(userId: string, email: string, password: string): Promise<void>
  requestReset(email: string, redirectTo: string): Promise<void>
}
