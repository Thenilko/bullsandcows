import { env as workerEnv } from 'cloudflare:workers'
import { xpForLevel } from '@bc/game-core'
import { PastureDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import { createApp } from '../app'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }

async function setup(level = 1) {
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  await repo.profiles.create({ id: 'm1', username: 'Mira', email: null, isGuest: false })
  if (level > 1) await repo.profiles.addXp('m1', xpForLevel(level))
  return { app, repo }
}

const send = (
  app: Awaited<ReturnType<typeof setup>>['app'],
  method: string,
  body?: unknown,
  token = 'fake:m1:Mira',
) =>
  app.request('/api/me/pasture', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }
const view = async (res: Response) => PastureDto.parse((await json(res)).data)
const byKey = (v: PastureDto) => Object.fromEntries(v.items.map((i) => [i.key, i]))

describe('GET /api/me/pasture', () => {
  it('requires a user', async () => {
    const { app } = await setup()
    expect((await app.request('/api/me/pasture')).status).toBe(401)
    expect((await app.request('/api/me/pasture', { method: 'PATCH' })).status).toBe(401)
  })

  it('derives what is unlocked from the level and the badges, with progress for the rest', async () => {
    const { app, repo } = await setup(12)
    await repo.badges.save('m1', [
      { key: 'early', tier: 1, progress: 1, earnedAt: 1 },
      { key: 'streak', tier: 1, progress: 9, earnedAt: 1 },
    ])
    const res = await send(app, 'GET')
    expect(res.status).toBe(200)
    const v = await view(res)
    expect(v.level).toBe(12)
    expect(v.barnColor).toBe('red')
    expect(v.items.map((i) => i.key)).toEqual([
      'dog',
      'sunflowers',
      'beehive',
      'rooster',
      'windmill',
      'pond',
      'barnColor',
      'shed',
      'goldenVane',
    ])
    const items = byKey(v)
    expect(items.dog).toEqual({ key: 'dog', unlocked: true, shown: true })
    expect(items.beehive).toEqual({ key: 'beehive', unlocked: true, shown: true })
    expect(items.rooster).toEqual({
      key: 'rooster',
      unlocked: false,
      shown: false,
      progress: { current: 9, target: 30 },
    })
    expect(items.windmill?.progress).toEqual({ current: 12, target: 15 })
  })

  it('gives a fresh guest the defaults', async () => {
    const { app, repo } = await setup()
    await repo.profiles.create({ id: 'g1', username: 'guest-1', email: null, isGuest: true })
    const v = await view(await send(app, 'GET', undefined, 'fake:g1:guest-1:guest'))
    expect(v.items.every((i) => !i.unlocked)).toBe(true)
  })
})

describe('PATCH /api/me/pasture', () => {
  it('hides and shows rewards and keeps the choice', async () => {
    const { app } = await setup(12)
    const hidden = await view(await send(app, 'PATCH', { hiddenItems: ['dog', 'dog'] }))
    expect(byKey(hidden).dog).toMatchObject({ unlocked: true, shown: false })
    expect(byKey(await view(await send(app, 'GET'))).dog?.shown).toBe(false)
    const shown = await view(await send(app, 'PATCH', { hiddenItems: [] }))
    expect(byKey(shown).dog?.shown).toBe(true)
  })

  it('accepts a barn colour only once it is unlocked (level 25)', async () => {
    const locked = await setup(24)
    const res = await send(locked.app, 'PATCH', { barnColor: 'blue' })
    expect(res.status).toBe(400)
    expect((await json(res)).error.code).toBe('ERR_INPUT')
    expect((await send(locked.app, 'PATCH', { barnColor: 'red' })).status).toBe(200)

    const open = await setup(25)
    expect((await view(await send(open.app, 'PATCH', { barnColor: 'blue' }))).barnColor).toBe(
      'blue',
    )
    expect((await view(await send(open.app, 'GET'))).barnColor).toBe('blue')
  })

  it('rejects unknown keys, colours and fields', async () => {
    const { app } = await setup(30)
    for (const body of [
      { hiddenItems: ['cat'] },
      { barnColor: '#ff0000' },
      { unlocked: ['shed'] },
      { hiddenItems: 'dog' },
    ]) {
      expect((await send(app, 'PATCH', body)).status).toBe(400)
    }
  })
})
