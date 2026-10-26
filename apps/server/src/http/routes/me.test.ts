import { env as workerEnv } from 'cloudflare:workers'
import { BADGE_KEYS, BadgeStateDto, MeDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
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
    await repo.profiles.addXp('m1', 3700)
    const res = await req(app, 'fake:m1:Mira', 'GET', '/api/me')
    expect(res.status).toBe(200)
    const me = MeDto.parse((await json(res)).data)
    expect(me).toMatchObject({
      level: 5,
      xpIntoLevel: 200,
      xpForNextLevel: 1500,
      rankKey: 'shepherd',
      rating: 1500,
    })
    expect(JSON.stringify(me)).not.toContain('m@x.bg')
  })

  it('requires a user', async () => {
    const { app } = setup()
    expect((await app.request('/api/me')).status).toBe(401)
    expect((await app.request('/api/me/badges')).status).toBe(401)
    expect((await app.request('/api/me/settings', { method: 'PATCH' })).status).toBe(401)
  })

  it('lists the 29 badges with tier, progress and next; hidden ones carry no text', async () => {
    const { app, repo } = setup()
    await repo.profiles.create({ id: 'm3', username: 'Ivo', email: null, isGuest: false })
    await repo.badges.save('m3', [{ key: 'bolt', tier: 2, progress: 7, earnedAt: clock.now() }])
    const res = await req(app, 'fake:m3:Ivo', 'GET', '/api/me/badges')
    expect(res.status).toBe(200)
    const badges = z.array(BadgeStateDto).parse((await json(res)).data)
    expect(badges).toHaveLength(BADGE_KEYS.length)
    expect(badges.map((b) => b.key)).toEqual([...BADGE_KEYS])
    expect(badges.find((b) => b.key === 'bolt')).toEqual({
      key: 'bolt',
      tier: 2,
      progress: 7,
      next: 25,
      earnedAt: clock.now(),
    })
    const hidden = badges.find((b) => b.key === 'zeroHero')
    expect(hidden).toEqual({ key: 'zeroHero', tier: 0, progress: 0, next: 1, earnedAt: null })
    expect(JSON.stringify(badges)).not.toMatch(/name|desc/)
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
