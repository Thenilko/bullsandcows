import { describe, expect, it } from 'vitest'
import { assertProdAuthEnv } from './prodEnv'

const SUPABASE = {
  VITE_AUTH_MODE: 'supabase',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon',
}

describe('assertProdAuthEnv', () => {
  it('accepts a production build with the Supabase URL and anon key', () => {
    expect(() => assertProdAuthEnv(SUPABASE, 'production')).not.toThrow()
  })

  it('accepts an explicit fake-auth production build (E2E and CI)', () => {
    expect(() => assertProdAuthEnv({ VITE_AUTH_MODE: 'fake' }, 'production')).not.toThrow()
  })

  it('fails a production build without the URL or the key, naming what is missing', () => {
    expect(() => assertProdAuthEnv({ ...SUPABASE, VITE_SUPABASE_URL: '' }, 'production')).toThrow(
      /VITE_SUPABASE_URL/,
    )
    expect(() => assertProdAuthEnv({ ...SUPABASE, VITE_SUPABASE_ANON_KEY: undefined }, 'production')).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    )
  })

  it('fails a production build that does not say which auth mode it is', () => {
    expect(() => assertProdAuthEnv({}, 'production')).toThrow(/VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/)
  })

  it('does not check other modes', () => {
    expect(() => assertProdAuthEnv({}, 'development')).not.toThrow()
  })
})
