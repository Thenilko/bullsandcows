import { env as workerEnv } from 'cloudflare:workers'
import { FarmDto, FarmJoinedDto, MyFarmDto, MyNudgeDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import type { Repo } from '../../ports/repo'
import { createApp } from '../app'

// Monday 26 Oct 2026, 11:00 in Sofia.
const NOW = Date.parse('2026-10-26T09:00:00Z')
const TODAY = '2026-10-26'

function setup() {
  let now = NOW
  const clock = { now: () => now }
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo, tick: (ms: number) => (now += ms) }
}

type App = ReturnType<typeof setup>['app']

let seq = 0
/** Unique users per test: the rate limiter store is shared by the isolate. */
async function user(repo: Repo, name: string, guest = false) {
  seq += 1
  const id = `farm-${seq}-${crypto.randomUUID().slice(0, 8)}`
  await repo.profiles.create({ id, username: `${name}${seq}`, email: null, isGuest: guest })
  return { id, token: `fake:${id}:${name}${seq}${guest ? ':guest' : ''}` }
}

const call = (app: App, token: string | null, method: string, path: string, body?: unknown) =>
  app.request(`/api/farms${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }
const code = async (res: Response) => (await json(res)).error?.code as string | undefined

async function createFarm(app: App, token: string, name = 'Фермата на Петрови') {
  const res = await call(app, token, 'POST', '', { name })
  expect(res.status).toBe(201)
  return FarmJoinedDto.parse((await json(res)).data)
}

async function myFarm(app: App, token: string) {
  return MyFarmDto.parse((await json(await call(app, token, 'GET', '/me'))).data).farm
}

async function playDaily(repo: Repo, userId: string, attempts: number, won = true, score = 100) {
  const g = await repo.games.create({
    userId,
    kind: 'daily',
    len: 4,
    zero: false,
    secret: '1234',
    dailyDate: TODAY,
    practice: false,
  })
  await repo.games.update(g.id, {
    startedAt: NOW - 72_000,
    finishedAt: NOW,
    won,
    attempts,
    score,
  })
}

describe('farms: guests and auth', () => {
  it('refuses anonymous callers and guests on every route', async () => {
    const { app, repo } = setup()
    const guest = await user(repo, 'guest', true)
    expect((await call(app, null, 'GET', '/me')).status).toBe(401)
    for (const [method, path, body] of [
      ['GET', '/me'],
      ['POST', '', { name: 'Ферма' }],
      ['POST', '/join', { code: 'ABCDE' }],
    ] as const) {
      const res = await call(app, guest.token, method, path, body)
      expect(res.status).toBe(403)
      expect(await code(res)).toBe('ERR_GUEST')
    }
  })
})

describe('POST /api/farms', () => {
  it('creates a farm with the owner as the only member and a five-letter code', async () => {
    const { app, repo } = setup()
    const mira = await user(repo, 'Mira')
    const { farm, newBadges } = await createFarm(app, mira.token, '  Фермата   на Петрови ')
    expect(farm.name).toBe('Фермата на Петрови')
    expect(farm.code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/)
    expect(farm.role).toBe('owner')
    expect(farm.maxMembers).toBe(12)
    expect(farm.members.map((m) => [m.userId, m.role, m.you])).toEqual([[mira.id, 'owner', true]])
    expect(newBadges).toContainEqual({ key: 'family', tier: 1 })
  })

  it('validates the name (1–40 characters)', async () => {
    const { app, repo } = setup()
    const mira = await user(repo, 'Mira')
    for (const name of ['', '   ', 'x'.repeat(41)]) {
      expect((await call(app, mira.token, 'POST', '', { name })).status).toBe(400)
    }
    expect((await call(app, mira.token, 'POST', '', { name: 'x'.repeat(40) })).status).toBe(201)
  })

  it('allows one farm per player', async () => {
    const { app, repo } = setup()
    const mira = await user(repo, 'Mira')
    await createFarm(app, mira.token)
    const res = await call(app, mira.token, 'POST', '', { name: 'Втора' })
    expect(res.status).toBe(409)
    expect(await code(res)).toBe('ERR_ALREADY_IN_FARM')
  })
})

describe('POST /api/farms/join', () => {
  it('joins by code in any case and counts the invite for the owner', async () => {
    const { app, repo } = setup()
    const owner = await user(repo, 'Tati')
    const kid = await user(repo, 'Bobi')
    const { farm } = await createFarm(app, owner.token)
    const res = await call(app, kid.token, 'POST', '/join', { code: farm.code.toLowerCase() })
    expect(res.status).toBe(200)
    const joined = FarmJoinedDto.parse((await json(res)).data)
    expect(joined.farm.role).toBe('member')
    expect(joined.farm.members.map((m) => m.userId)).toEqual([owner.id, kid.id])
    expect(joined.newBadges).toContainEqual({ key: 'family', tier: 1 })
    const ownerBadges = await repo.badges.listOf(owner.id)
    expect(ownerBadges.find((b) => b.key === 'invite')).toMatchObject({ tier: 1, progress: 1 })
  })

  it('answers ERR_FARM_CODE, ERR_ALREADY_IN_FARM and ERR_FARM_FULL', async () => {
    const { app, repo } = setup()
    const owner = await user(repo, 'Owner')
    const { farm } = await createFarm(app, owner.token)
    const stranger = await user(repo, 'Str')
    expect(await code(await call(app, stranger.token, 'POST', '/join', { code: 'ZZZZZ' }))).toBe(
      'ERR_FARM_CODE',
    )
    expect((await call(app, stranger.token, 'POST', '/join', { code: 'AB' })).status).toBe(400)
    expect(await code(await call(app, owner.token, 'POST', '/join', { code: farm.code }))).toBe(
      'ERR_ALREADY_IN_FARM',
    )
    for (let i = 0; i < 11; i++) {
      const m = await user(repo, `m${i}`)
      expect((await call(app, m.token, 'POST', '/join', { code: farm.code })).status).toBe(200)
    }
    const res = await call(app, stranger.token, 'POST', '/join', { code: farm.code })
    expect(res.status).toBe(409)
    expect(await code(res)).toBe('ERR_FARM_FULL')
    expect((await myFarm(app, owner.token))?.members).toHaveLength(12)
  })

  it('never lets concurrent joins pass the limit or put a player in two farms', async () => {
    const { app, repo } = setup()
    const a = await user(repo, 'A')
    const b = await user(repo, 'B')
    const fa = (await createFarm(app, a.token)).farm
    const fb = (await createFarm(app, b.token)).farm
    for (let i = 0; i < 10; i++) {
      const m = await user(repo, `f${i}`)
      await call(app, m.token, 'POST', '/join', { code: fa.code })
    }
    const racers = await Promise.all([user(repo, 'r1'), user(repo, 'r2'), user(repo, 'r3')])
    const results = await Promise.all(
      racers.map((r) => call(app, r.token, 'POST', '/join', { code: fa.code })),
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    const both = await user(repo, 'both')
    const twice = await Promise.all([
      call(app, both.token, 'POST', '/join', { code: fb.code }),
      call(app, both.token, 'POST', '/join', { code: fb.code }),
    ])
    expect(twice.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await repo.farms.members(fa.id)).toHaveLength(12)
  })
})

describe('GET /api/farms/me', () => {
  it('is null outside a farm', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'Solo')
    expect(await myFarm(app, u.token)).toBeNull()
  })

  it('shows today’s number per member and the week points', async () => {
    const { app, repo } = setup()
    const owner = await user(repo, 'Tati')
    const kid = await user(repo, 'Mira')
    const { farm } = await createFarm(app, owner.token)
    await call(app, kid.token, 'POST', '/join', { code: farm.code })
    await playDaily(repo, owner.id, 4, true, 2140)
    const view = FarmDto.parse(await myFarm(app, kid.token))
    expect(view.dailyNumber).toBe(5)
    const [tati, mira] = view.members
    expect(tati).toMatchObject({ role: 'owner', today: { attempts: 4, secs: 72, won: true } })
    expect(tati?.weekPoints).toBe(2140)
    expect(mira).toMatchObject({ you: true, today: null, weekPoints: 0, nudged: false })
  })
})

describe('owner-only settings', () => {
  async function farmOfTwo() {
    const s = setup()
    const owner = await user(s.repo, 'Owner')
    const member = await user(s.repo, 'Member')
    const { farm } = await createFarm(s.app, owner.token)
    await call(s.app, member.token, 'POST', '/join', { code: farm.code })
    return { ...s, owner, member, farm }
  }

  it('lets the owner rename, change the code and remove a member', async () => {
    const { app, owner, member, farm } = await farmOfTwo()
    const renamed = await json(await call(app, owner.token, 'PATCH', '/me', { name: 'Нова' }))
    expect(renamed.data.name).toBe('Нова')
    const rotated = FarmDto.parse(
      (await json(await call(app, owner.token, 'POST', '/me/code'))).data,
    )
    expect(rotated.code).not.toBe(farm.code)
    const removed = await call(app, owner.token, 'DELETE', `/me/members/${member.id}`)
    expect(FarmDto.parse((await json(removed)).data).members).toHaveLength(1)
    expect(await myFarm(app, member.token)).toBeNull()
  })

  it('refuses the same to a member', async () => {
    const { app, owner, member } = await farmOfTwo()
    for (const [method, path, body] of [
      ['PATCH', '/me', { name: 'X' }],
      ['POST', '/me/code', undefined],
      ['DELETE', `/me/members/${owner.id}`, undefined],
    ] as const) {
      const res = await call(app, member.token, method, path, body)
      expect(res.status).toBe(403)
      expect(await code(res)).toBe('ERR_FORBIDDEN')
    }
  })

  it('makes the old code stop working', async () => {
    const { app, repo, owner, farm } = await farmOfTwo()
    await call(app, owner.token, 'POST', '/me/code')
    const late = await user(repo, 'Late')
    expect(await code(await call(app, late.token, 'POST', '/join', { code: farm.code }))).toBe(
      'ERR_FARM_CODE',
    )
  })
})

describe('POST /api/farms/me/leave', () => {
  it('hands the farm to the oldest member when the owner leaves, deletes it with the last one', async () => {
    const { app, repo, tick } = setup()
    const owner = await user(repo, 'Owner')
    const first = await user(repo, 'First')
    const second = await user(repo, 'Second')
    const { farm } = await createFarm(app, owner.token)
    tick(1000)
    await call(app, first.token, 'POST', '/join', { code: farm.code })
    tick(1000)
    await call(app, second.token, 'POST', '/join', { code: farm.code })
    expect((await call(app, owner.token, 'POST', '/me/leave')).status).toBe(200)
    expect((await myFarm(app, first.token))?.role).toBe('owner')
    expect((await myFarm(app, second.token))?.role).toBe('member')
    await call(app, second.token, 'POST', '/me/leave')
    await call(app, first.token, 'POST', '/me/leave')
    expect(await repo.farms.get(farm.id)).toBeNull()
    expect((await call(app, first.token, 'POST', '/me/leave')).status).toBe(404)
  })
})

describe('nudges', () => {
  async function family() {
    const s = setup()
    const tati = await user(s.repo, 'Tati')
    const mira = await user(s.repo, 'Mira')
    const { farm } = await createFarm(s.app, tati.token)
    await call(s.app, mira.token, 'POST', '/join', { code: farm.code })
    return { ...s, tati, mira }
  }

  it('sends one nudge a day, shows it as a banner until it is dismissed', async () => {
    const { app, tati, mira } = await family()
    expect((await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id })).status).toBe(200)
    const again = await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id })
    expect(again.status).toBe(429)
    expect((await myFarm(app, tati.token))?.members.find((m) => m.userId === mira.id)?.nudged).toBe(
      true,
    )
    const banner = MyNudgeDto.parse(
      (await json(await call(app, mira.token, 'GET', '/me/nudge'))).data,
    )
    expect(banner.nudge).toMatchObject({ fromUserId: tati.id, played: 0, members: 2 })
    await call(app, mira.token, 'POST', '/me/nudge/read')
    const after = MyNudgeDto.parse(
      (await json(await call(app, mira.token, 'GET', '/me/nudge'))).data,
    )
    expect(after.nudge).toBeNull()
  })

  it('allows a new nudge the next Sofia day', async () => {
    const { app, tati, mira, tick } = await family()
    await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id })
    tick(86_400_000)
    expect((await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id })).status).toBe(200)
  })

  it('refuses a nudge to someone who played, to yourself and outside the farm', async () => {
    const { app, repo, tati, mira } = await family()
    await playDaily(repo, mira.id, 5)
    expect(await code(await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id }))).toBe(
      'ERR_FINISHED',
    )
    expect((await call(app, tati.token, 'POST', '/me/nudge', { userId: tati.id })).status).toBe(400)
    const other = await user(repo, 'Other')
    await createFarm(app, other.token)
    expect((await call(app, tati.token, 'POST', '/me/nudge', { userId: other.id })).status).toBe(
      404,
    )
  })

  it('hides the banner once today’s number is played', async () => {
    const { app, repo, tati, mira } = await family()
    await call(app, tati.token, 'POST', '/me/nudge', { userId: mira.id })
    await playDaily(repo, mira.id, 6)
    const banner = MyNudgeDto.parse(
      (await json(await call(app, mira.token, 'GET', '/me/nudge'))).data,
    )
    expect(banner.nudge).toBeNull()
  })
})
