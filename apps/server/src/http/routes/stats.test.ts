import { env as workerEnv } from 'cloudflare:workers'
import { FALLBACK_HISTOGRAM, sofiaDate } from '@bc/game-core'
import { DistributionDto, LeaderboardDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import { createApp } from '../app'

const NOW = Date.parse('2026-10-20T09:00:00Z')
const clock = { now: () => NOW }

function setup() {
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo }
}

const get = (app: ReturnType<typeof setup>['app'], token: string | null, path: string) =>
  app.request(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

describe('distribution route', () => {
  it('returns the histogram for guests too, validating the query', async () => {
    const { app } = setup()
    const res = await get(
      app,
      'fake:g1:g:guest',
      '/api/stats/distribution?len=3&zero=true&kind=free',
    )
    expect(res.status).toBe(200)
    expect(DistributionDto.parse((await json(res)).data)).toEqual({
      histogram: [...FALLBACK_HISTOGRAM[3]],
      sample: 0,
      fallback: true,
    })
    for (const q of [
      'len=6&zero=false&kind=free',
      'len=4&zero=1&kind=free',
      'len=4&zero=false&kind=bot',
      '',
    ]) {
      const bad = await get(app, 'fake:u1:U', `/api/stats/distribution?${q}`)
      expect(bad.status, q).toBe(400)
      expect(await json(bad)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    }
    expect(
      (await get(app, null, '/api/stats/distribution?len=4&zero=false&kind=free')).status,
    ).toBe(401)
  })
})

describe('leaderboard route', () => {
  it('ranks members and marks me', async () => {
    const { app, repo } = setup()
    for (const [id, name, score] of [
      ['lb1', 'Ana', 900],
      ['lb2', 'Bobi', 800],
    ] as const) {
      await repo.profiles.create({ id, username: name, email: null, isGuest: false })
      const game = await repo.games.create({
        userId: id,
        kind: 'daily',
        len: 4,
        zero: false,
        secret: '1234',
        dailyDate: sofiaDate(new Date(NOW)),
        practice: false,
      })
      await repo.games.update(game.id, { finishedAt: NOW, won: true, attempts: 5, score })
    }
    const res = await get(app, 'fake:lb2:Bobi', '/api/leaderboard?period=today&len=4&zero=false')
    expect(res.status).toBe(200)
    const board = LeaderboardDto.parse((await json(res)).data)
    expect(board.rows.map((r) => [r.rank, r.username, r.you])).toEqual([
      [1, 'Ana', false],
      [2, 'Bobi', true],
    ])
    expect(board.me).toMatchObject({ rank: 2, score: 800 })
    expect(JSON.stringify(board)).not.toContain('lb1')
  })

  it('refuses guests with ERR_GUEST and bad periods with ERR_INPUT', async () => {
    const { app } = setup()
    const guest = await get(app, 'fake:g9:g:guest', '/api/leaderboard?period=week&len=4&zero=false')
    expect(guest.status).toBe(403)
    expect(await json(guest)).toEqual({ ok: false, error: { code: 'ERR_GUEST' } })
    const bad = await get(app, 'fake:u9:U', '/api/leaderboard?period=year&len=4&zero=false')
    expect(bad.status).toBe(400)
  })
})
