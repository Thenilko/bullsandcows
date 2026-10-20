import { createMiddleware } from 'hono/factory'

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
}

/** Applied to every /api response, including errors and 404s. */
export const securityHeaders = () =>
  createMiddleware(async (c, next) => {
    await next()
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(name, value)
  })
