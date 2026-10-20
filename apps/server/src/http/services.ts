import type { Context } from 'hono'
import { AuthService } from '../auth/service'
import { StatsService } from '../stats/service'
import type { AppEnv } from './types'

export function statsService(c: Context<AppEnv>): StatsService {
  const { repo, clock } = c.get('deps')
  return new StatsService({ repo, clock })
}

export function authService(c: Context<AppEnv>): AuthService {
  const { repo, auth, env } = c.get('deps')
  return new AuthService({ repo, auth, stats: statsService(c), appOrigin: env.APP_ORIGIN })
}
