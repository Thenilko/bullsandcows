import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const binding = {}
const base = {
  ASSETS: binding,
  QUEUE: binding,
  DUEL: binding,
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value',
  DAILY_SALT: 'a-long-enough-daily-salt',
  APP_ORIGIN: 'http://127.0.0.1:5173',
}

describe('parseEnv', () => {
  it('accepts the dev combination of fake auth and memory repo', () => {
    const parsed = parseEnv({ ...base, AUTH_MODE: 'fake', REPO_MODE: 'memory', ENVIRONMENT: 'dev' })
    expect(parsed.AUTH_MODE).toBe('fake')
    expect(parsed.REPO_MODE).toBe('memory')
    expect(parsed.HYPERDRIVE).toBeUndefined()
  })

  it('rejects fake auth in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        AUTH_MODE: 'fake',
        REPO_MODE: 'postgres',
        HYPERDRIVE: binding,
        ENVIRONMENT: 'production',
      }),
    ).toThrow(/AUTH_MODE/)
  })

  it('rejects the memory repo in production', () => {
    expect(() =>
      parseEnv({ ...base, AUTH_MODE: 'supabase', REPO_MODE: 'memory', ENVIRONMENT: 'production' }),
    ).toThrow(/REPO_MODE/)
  })

  it('requires Hyperdrive for the postgres repo', () => {
    expect(() =>
      parseEnv({
        ...base,
        AUTH_MODE: 'supabase',
        REPO_MODE: 'postgres',
        ENVIRONMENT: 'production',
      }),
    ).toThrow(/HYPERDRIVE/)
  })

  it('accepts the production combination', () => {
    const parsed = parseEnv({
      ...base,
      AUTH_MODE: 'supabase',
      REPO_MODE: 'postgres',
      HYPERDRIVE: binding,
      ENVIRONMENT: 'production',
    })
    expect(parsed.ENVIRONMENT).toBe('production')
  })

  it('names missing or invalid keys without echoing secret values', () => {
    let message = ''
    try {
      parseEnv({
        ...base,
        SUPABASE_URL: 'not a url',
        DAILY_SALT: undefined,
        AUTH_MODE: 'fake',
        REPO_MODE: 'memory',
        ENVIRONMENT: 'dev',
      })
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toMatch(/SUPABASE_URL/)
    expect(message).toMatch(/DAILY_SALT/)
    expect(message).not.toContain('service-role-secret-value')
    expect(message).not.toContain('not a url')
  })

  it('accepts the bindings of the test worker', () => {
    expect(parseEnv(env).ENVIRONMENT).toBe('test')
  })
})
