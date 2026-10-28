import { describe, expect, it } from 'vitest'
import worker from './index'

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
} as unknown as ExecutionContext

/** An asset binding in single-page-application mode: a miss comes back as the shell with 200. */
function envWith(served: Response): CloudflareBindings {
  return { ASSETS: { fetch: async () => served } } as unknown as CloudflareBindings
}

describe('/assets', () => {
  it('answers 404 when the binding falls back to the SPA shell for a chunk that is gone', async () => {
    const env = envWith(
      new Response('<!doctype html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
    const res = await worker.fetch(
      new Request('https://pasishte.test/assets/DuelSetup-old.js'),
      env,
      ctx,
    )
    expect(res.status).toBe(404)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('passes a real asset through untouched', async () => {
    const env = envWith(
      new Response('console.log(1)', {
        status: 200,
        headers: { 'content-type': 'text/javascript' },
      }),
    )
    const res = await worker.fetch(
      new Request('https://pasishte.test/assets/index-new.js'),
      env,
      ctx,
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('console.log(1)')
  })

  it('leaves the shell fallback alone for page paths', async () => {
    const env = envWith(
      new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    const res = await worker.fetch(new Request('https://pasishte.test/duel/new'), env, ctx)
    expect(res.status).toBe(200)
  })
})
