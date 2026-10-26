/**
 * Security headers for the static assets (the SPA shell). Cloudflare applies `_headers` to
 * asset responses; `/api` and `/ws` set their own in the Worker.
 */
const originOf = (url: string | undefined): string | null => {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/** `supabaseUrl` (the build's VITE_SUPABASE_URL) is the only remote origin the client talks to. */
export function contentSecurityPolicy(supabaseUrl: string | undefined): string {
  const remote = originOf(supabaseUrl)
  return [
    "default-src 'self'",
    "script-src 'self'",
    // React `style={}` props are inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    ['connect-src', "'self'", ...(remote ? [remote] : []), 'wss:'].join(' '),
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export function staticHeadersFile(supabaseUrl: string | undefined): string {
  const headers = [
    ['Content-Security-Policy', contentSecurityPolicy(supabaseUrl)],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
    ['X-Frame-Options', 'DENY'],
  ]
  return ['/*', ...headers.map(([name, value]) => `  ${name}: ${value}`)].join('\n') + '\n'
}
