import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, staticHeadersFile } from './headers'

const directives = (csp: string) => new Map(csp.split('; ').map((d) => [d.split(' ')[0], d] as const))

describe('static security headers', () => {
  it('allows the Supabase origin (and nothing else remote) for connections', () => {
    const csp = directives(contentSecurityPolicy('https://example.supabase.co/some/path'))
    expect(csp.get('connect-src')).toBe("connect-src 'self' https://example.supabase.co wss:")
    expect(csp.get('script-src')).toBe("script-src 'self'")
    expect(csp.get('frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(csp.get('default-src')).toBe("default-src 'self'")
    expect(csp.get('object-src')).toBe("object-src 'none'")
  })

  it('omits the remote origin when the build has none (fake auth)', () => {
    const csp = directives(contentSecurityPolicy(undefined))
    expect(csp.get('connect-src')).toBe("connect-src 'self' wss:")
  })

  it('writes a Cloudflare _headers file for every path', () => {
    const file = staticHeadersFile('https://example.supabase.co')
    const lines = file.trimEnd().split('\n')
    expect(lines[0]).toBe('/*')
    expect(lines.slice(1).every((l) => l.startsWith('  '))).toBe(true)
    expect(file).toContain('  Content-Security-Policy: default-src \'self\';')
    expect(file).toContain('  X-Content-Type-Options: nosniff')
    expect(file).toContain('  Referrer-Policy: strict-origin-when-cross-origin')
    expect(file).toContain('  Permissions-Policy: camera=(), microphone=(), geolocation=()')
    expect(file).toContain('  X-Frame-Options: DENY')
  })
})
