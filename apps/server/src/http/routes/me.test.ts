import { env as workerEnv } from 'cloudflare:workers'
import { MeDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import { createApp } from '../app'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }

function setup() {
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo }
}

const req = (
  app: ReturnType<typeof setup>['app'],
  token: string,
  method: string,
  path: string,
  body?: unknown,
) =>
  app.request(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

describe('me routes', () => {
  it('returns the profile with level, stats and badges', async () => {
    const { app, repo } = setup()
    await repo.profiles.create({ id: 'm1', username: 'Mira', email: 'm@x.bg', isGuest: false })
    await repo.profiles.addXp('m1', 1700)
    const res = await req(app, 'fake:m1:Mira', 'GET', '/api/me')
    expect(res.status).toBe(200)
    const me = MeDto.parse((await json(res)).data)
    expect(me).toMatchObject({ level: 2, xpIntoLevel: 200, rankKey: 'herdsman', rating: 1500 })
    expect(JSON.stringify(me)).not.toContain('m@x.bg')
  })

  it('requires a user', async () => {
    const { app } = setup()
    expect((await app.request('/api/me')).status).toBe(401)
    expect((await app.request('/api/me/settings', { method: 'PATCH' })).status).toBe(401)
  })

  it('patches settings for members and guests, refusing anything else', async () => {
    const { app } = setup()
    for (const token of ['fake:m2:Rada', 'fake:g2:g:guest']) {
      const res = await req(app, token, 'PATCH', '/api/me/settings', { sound: false, lang: 'en' })
      expect(res.status).toBe(200)
      expect(MeDto.parse((await json(res)).data).profile).toMatchObject({
        sound: false,
        lang: 'en',
      })
    }
    for (const body of [{ xp: 9999 }, { username: 'Boss' }, { defaultLen: 6 }, { rating: 3000 }]) {
      const res = await req(app, 'fake:m2:Rada', 'PATCH', '/api/me/settings', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    }
    const after = MeDto.parse((await json(await req(app, 'fake:m2:Rada', 'GET', '/api/me'))).data)
    expect(after.xp).toBe(0)
  })
})
