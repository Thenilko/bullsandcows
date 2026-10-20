import type { Env } from '../../env'
import type { AuthPort } from '../../ports/auth'
import { systemClock } from '../../ports/clock'
import { createFakeAuth } from './fake'
import { createSupabaseAuth } from './supabase'

let fake: AuthPort | null = null

/** Fake auth keeps its accounts per isolate, like the memory repo. */
export function makeAuth(env: Env): AuthPort {
  if (env.AUTH_MODE === 'fake') {
    fake ??= createFakeAuth(systemClock)
    return fake
  }
  return createSupabaseAuth({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
