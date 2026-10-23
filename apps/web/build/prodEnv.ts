/** The build-time variables the client reads to pick its auth mode. */
export interface AuthBuildEnv {
  readonly VITE_AUTH_MODE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

/**
 * A production build must be a Supabase build with its URL and anon key, or say
 * `VITE_AUTH_MODE=fake` (E2E and CI). Without this a missing variable silently ships a
 * client that never refreshes tokens.
 */
export function assertProdAuthEnv(env: AuthBuildEnv, mode: string): void {
  if (mode !== 'production' || env.VITE_AUTH_MODE === 'fake') return
  const missing = REQUIRED.filter((name) => !env[name])
  if (missing.length === 0) return
  throw new Error(
    `Production build without Supabase auth: set ${missing.join(' and ')} ` +
      '(see docs/DEPLOY.md), or VITE_AUTH_MODE=fake for a hermetic test build.',
  )
}
