import { env as workerEnv } from 'cloudflare:workers'
import { codes } from '@bc/game-core'
import { GameViewDto, GuessResultDto, MeDto, WeeklyBoardDto, WeeklyDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import type { Repo } from '../../ports/repo'
import { finalizeDueWeeks } from '../../weekly/finalize'
import { createApp } from '../app'

// Monday 26 Oct 2026, 11:00 in Sofia: week 44, „Бърза четворка“ (4 digits, no zero, 10 attempts, 3 min).
const NOW = Date.parse('2026-10-26T09:00:00Z')
const WEEK = '2026-W44'
const DAY_MS = 86_400_000
// Monday 2 Nov 2026 00:00 Sofia (winter time).
const WEEK_END = Date.parse('2026-11-01T22:00:00Z')

function setup() {
  let now = NOW
  const clock = { now: () => now }
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo, clock, tick: (ms: number) => (now += ms), set: (ms: number) => (now = ms) }
}

type App = ReturnType<typeof setup>['app']

let seq = 0
async function user(repo: Repo, name: string, guest = false) {
  seq += 1
  const id = `wk-${seq}-${crypto.randomUUID().slice(0, 8)}`
  await repo.profiles.create({ id, username: `${name}${seq}`, email: null, isGuest: guest })
  return { id, token: `fake:${id}:${name}${seq}${guest ? ':guest' : ''}` }
}

const call = (app: App, token: string | null, method: string, path: string, body?: unknown) =>
  app.request(path, {
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

async function overview(app: App, token: string) {
  const res = await call(app, token, 'GET', '/api/weekly')
  expect(res.status).toBe(200)
  return WeeklyDto.parse((await json(res)).data)
}

async function start(app: App, token: string) {
  const res = await call(app, token, 'POST', '/api/weekly/start')
  expect(res.status).toBe(201)
  return GameViewDto.parse((await json(res)).data)
}

async function begin(app: App, token: string, gameId: string) {
  expect((await call(app, token, 'POST', `/api/games/${gameId}/start`)).status).toBe(200)
}

async function guess(app: App, token: string, gameId: string, g: string) {
  return call(app, token, 'POST', `/api/games/${gameId}/guesses`, { guess: g })
}

async function secretOf(repo: Repo): Promise<string> {
  const week = await repo.weekly.week(WEEK)
  expect(week).not.toBeNull()
  return week?.secret ?? ''
}

const wrongs = (secret: string) => codes(4, false).filter((c) => c !== secret)

/** Every key and string value of a JSON document, depth first. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...strings(v)])
  }
  return []
}

/** The response neither names a `secret` nor carries the secret as any string value. */
async function expectNoSecret(res: Response, secret: string) {
  const body = (await res.clone().json()) as unknown
  const all = strings(body)
  expect(all).not.toContain('secret')
  expect(all).not.toContain(secret)
}

/** Plays a game to the win with `wrong` misses first; returns the game id. */
async function winWith(app: App, repo: Repo, token: string, misses: number) {
  const game = await start(app, token)
  await begin(app, token, game.id)
  const secret = await secretOf(repo)
  for (const w of wrongs(secret).slice(0, misses)) await guess(app, token, game.id, w)
  const res = GuessResultDto.parse((await json(await guess(app, token, game.id, secret))).data)
  expect(res.solved).toBe(true)
  return game.id
}

describe('weekly: access', () => {
  it('refuses anonymous callers and guests', async () => {
    const { app, repo } = setup()
    const guest = await user(repo, 'guest', true)
    expect((await call(app, null, 'GET', '/api/weekly')).status).toBe(401)
    for (const [method, path] of [
      ['GET', '/api/weekly'],
      ['POST', '/api/weekly/start'],
      ['GET', `/api/weekly/${WEEK}/board`],
    ] as const) {
      const res = await call(app, guest.token, method, path)
      expect(res.status).toBe(403)
      expect(await code(res)).toBe('ERR_GUEST')
    }
  })
})

describe('weekly: the week and the rule', () => {
  it('shows week 44 with its rule, the end in Sofia and nothing played yet', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'mira')
    const w = await overview(app, u.token)
    expect(w).toMatchObject({
      weekId: WEEK,
      week: 44,
      monday: '2026-10-26',
      sunday: '2026-11-01',
      endsAt: WEEK_END,
      rule: { key: 'quickFour', len: 4, zero: false, maxAttempts: 10, timeLimitSecs: 180 },
      xp: 300,
      best: null,
      place: null,
      top: [],
      participants: 0,
      playedToday: false,
      today: null,
      award: null,
    })
  })
})

describe('weekly: the secret', () => {
  it('is in no weekly response before the end of the game, and only then', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'mira')
    const other = await user(repo, 'yana')
    await winWith(app, repo, other.token, 2)
    const startRes = await call(app, u.token, 'POST', '/api/weekly/start')
    const secret = await secretOf(repo)
    await expectNoSecret(startRes, secret)
    const game = GameViewDto.parse((await json(startRes)).data)
    expect(game.kind).toBe('weekly')
    expect(game.weekly).toMatchObject({ weekId: WEEK, week: 44, rule: { key: 'quickFour' } })
    // Every secret-free read and write of the game before its end.
    await expectNoSecret(await call(app, u.token, 'POST', `/api/games/${game.id}/start`), secret)
    await expectNoSecret(await guess(app, u.token, game.id, wrongs(secret)[0] ?? ''), secret)
    await expectNoSecret(await call(app, u.token, 'GET', `/api/games/${game.id}`), secret)
    await expectNoSecret(await call(app, u.token, 'POST', '/api/weekly/start'), secret)
    await expectNoSecret(await call(app, u.token, 'GET', '/api/weekly'), secret)
    await expectNoSecret(
      await call(app, u.token, 'GET', `/api/weekly/${WEEK}/board?limit=50`),
      secret,
    )
    // After giving up the game shows it, as any finished solo game does.
    const gaveUp = await json(await call(app, u.token, 'POST', `/api/games/${game.id}/give-up`))
    expect(gaveUp.data.secret).toBe(secret)
  })

  it('is the same for every player of the week', async () => {
    const { app, repo } = setup()
    const a = await user(repo, 'a')
    const b = await user(repo, 'b')
    const ga = await start(app, a.token)
    const gb = await start(app, b.token)
    const sa = (await repo.games.getWithSecret(ga.id))?.secret
    const sb = (await repo.games.getWithSecret(gb.id))?.secret
    expect(sa).toBe(await secretOf(repo))
    expect(sb).toBe(sa)
  })
})

describe('weekly: one game a day', () => {
  it('resumes the unfinished game, refuses a second one the same day and allows one the next day', async () => {
    const { app, repo, tick } = setup()
    const u = await user(repo, 'mira')
    const first = await start(app, u.token)
    expect((await start(app, u.token)).id).toBe(first.id)
    expect((await overview(app, u.token)).today).toEqual({ gameId: first.id, finished: false })
    await call(app, u.token, 'POST', `/api/games/${first.id}/give-up`)
    const again = await call(app, u.token, 'POST', '/api/weekly/start')
    expect(again.status).toBe(409)
    expect(await code(again)).toBe('ERR_WEEKLY_PLAYED')
    const w = await overview(app, u.token)
    expect(w.playedToday).toBe(true)
    expect(w.best).toEqual({ won: false, attempts: 0, secs: null })
    expect(w.place).toBeNull()
    tick(DAY_MS)
    const next = await start(app, u.token)
    expect(next.id).not.toBe(first.id)
  })

  it('is enforced by the repo: a second play on the same day is not written', async () => {
    const { repo } = setup()
    const u = await user(repo, 'mira')
    await repo.weekly.ensureWeek(
      { weekId: WEEK, ruleKey: 'quickFour', secret: '1234', endsAt: WEEK_END },
      NOW,
    )
    const game = (id: string) => ({
      id,
      userId: u.id,
      kind: 'weekly' as const,
      len: 4 as const,
      zero: false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })
    const a = crypto.randomUUID()
    const b = crypto.randomUUID()
    expect(
      await repo.weekly.startPlay(game(a), {
        userId: u.id,
        weekId: WEEK,
        day: '2026-10-26',
        gameId: a,
      }),
    ).not.toBeNull()
    expect(
      await repo.weekly.startPlay(game(b), {
        userId: u.id,
        weekId: WEEK,
        day: '2026-10-26',
        gameId: b,
      }),
    ).toBeNull()
    expect(await repo.games.get(b)).toBeNull()
  })

  it('closes a game left open on an earlier day as lost', async () => {
    const { app, repo, tick } = setup()
    const u = await user(repo, 'mira')
    const first = await start(app, u.token)
    tick(DAY_MS)
    await start(app, u.token)
    const old = GameViewDto.parse(
      (await json(await call(app, u.token, 'GET', `/api/games/${first.id}`))).data,
    )
    expect(old.finishedAt).not.toBeNull()
    expect(old.won).toBe(false)
  })
})

describe('weekly: the limits', () => {
  it('loses the game on the last allowed miss and reveals the secret then', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'mira')
    const game = await start(app, u.token)
    await begin(app, u.token, game.id)
    const secret = await secretOf(repo)
    const misses = wrongs(secret).slice(0, 10)
    for (const w of misses.slice(0, 9)) {
      const r = GuessResultDto.parse((await json(await guess(app, u.token, game.id, w))).data)
      expect(r.over).toBeUndefined()
      expect(r.secret).toBeUndefined()
    }
    const last = GuessResultDto.parse(
      (await json(await guess(app, u.token, game.id, misses[9] ?? ''))).data,
    )
    expect(last).toMatchObject({ solved: false, over: true, secret })
    const after = await guess(app, u.token, game.id, misses[0] ?? '')
    expect(after.status).toBe(409)
    expect((await overview(app, u.token)).best).toMatchObject({ won: false, attempts: 10 })
  })

  it('enforces the 3 minutes of „Бърза четворка“ on the server', async () => {
    const { app, repo, tick } = setup()
    const u = await user(repo, 'mira')
    const game = await start(app, u.token)
    await begin(app, u.token, game.id)
    tick(181_000)
    const late = await guess(app, u.token, game.id, wrongs(await secretOf(repo))[0] ?? '')
    expect(late.status).toBe(409)
    expect(await code(late)).toBe('ERR_FINISHED')
    const view = GameViewDto.parse(
      (await json(await call(app, u.token, 'GET', `/api/games/${game.id}`))).data,
    )
    expect(view).toMatchObject({ won: false, finishedAt: NOW + 180_000 })
    expect((await overview(app, u.token)).best).toEqual({ won: false, attempts: 0, secs: 180 })
  })

  it('expires the game on a read once the time is up', async () => {
    const { app, repo, tick } = setup()
    const u = await user(repo, 'mira')
    const game = await start(app, u.token)
    await begin(app, u.token, game.id)
    tick(200_000)
    const view = GameViewDto.parse(
      (await json(await call(app, u.token, 'GET', `/api/games/${game.id}`))).data,
    )
    expect(view.finishedAt).toBe(NOW + 180_000)
    expect(view.secret).toBe(await secretOf(repo))
  })
})

describe('weekly: ranking and the board', () => {
  it('ranks by the best game: a win, then fewer attempts, then less time', async () => {
    const { app, repo, tick } = setup()
    const a = await user(repo, 'a')
    const b = await user(repo, 'b')
    const c = await user(repo, 'c')
    await winWith(app, repo, a.token, 4)
    tick(10_000)
    await winWith(app, repo, b.token, 2)
    const lost = await start(app, c.token)
    await call(app, c.token, 'POST', `/api/games/${lost.id}/give-up`)
    const w = await overview(app, a.token)
    expect(w.participants).toBe(3)
    expect(w.top.map((r) => [r.rank, r.attempts, r.you])).toEqual([
      [1, 3, false],
      [2, 5, true],
    ])
    expect(w.place).toBe(2)
    expect(w.best).toMatchObject({ won: true, attempts: 5 })
    const board = WeeklyBoardDto.parse(
      (await json(await call(app, c.token, 'GET', `/api/weekly/${WEEK}/board?limit=1`))).data,
    )
    expect(board.rows).toHaveLength(1)
    expect(board.me).toBeNull()
    expect(board.finalized).toBe(false)
  })

  it('pays no XP for the weekly game itself', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'mira')
    await winWith(app, repo, u.token, 5)
    const badgeXp = (await repo.badges.listOf(u.id)).reduce((sum, b) => sum + b.tier * 50, 0)
    expect((await repo.profiles.get(u.id))?.xp).toBe(badgeXp)
  })

  it('validates the week and the limit', async () => {
    const { app, repo } = setup()
    const u = await user(repo, 'mira')
    for (const path of [
      '/api/weekly/2026-W99/board',
      '/api/weekly/2027-W53/board',
      '/api/weekly/abc/board',
      `/api/weekly/${WEEK}/board?limit=0`,
      `/api/weekly/${WEEK}/board?limit=101`,
      `/api/weekly/${WEEK}/board?limit=abc`,
    ]) {
      const res = await call(app, u.token, 'GET', path)
      expect(res.status, path).toBe(400)
      expect(await code(res)).toBe('ERR_INPUT')
    }
    expect((await call(app, u.token, 'GET', `/api/weekly/${WEEK}/board?limit=50`)).status).toBe(200)
  })
})

describe('weekly: finalisation', () => {
  it('pays 300 XP once, frames the top 10, keeps the result for П8 and is idempotent', async () => {
    const { app, repo, set } = setup()
    const a = await user(repo, 'a')
    const b = await user(repo, 'b')
    await winWith(app, repo, a.token, 1)
    const lost = await start(app, b.token)
    await call(app, b.token, 'POST', `/api/games/${lost.id}/give-up`)
    const xpBefore = (await repo.profiles.get(a.id))?.xp ?? 0
    const lostXpBefore = (await repo.profiles.get(b.id))?.xp ?? 0

    // Sunday 23:59:59 Sofia: not due yet.
    set(WEEK_END - 1_000)
    expect(await finalizeDueWeeks(repo, WEEK_END - 1_000)).toEqual([])
    set(WEEK_END + 60_000)
    // The lazy run on GET /api/weekly finalises; the cron run afterwards finds nothing.
    const w = await overview(app, a.token)
    expect(await finalizeDueWeeks(repo, WEEK_END + 120_000)).toEqual([])
    expect(w.weekId).toBe('2026-W45')
    expect(w.rule.key).toBe('fourZero')
    expect(w.award).toMatchObject({
      weekId: WEEK,
      week: 44,
      place: 1,
      participants: 2,
      won: true,
      xp: 300,
      goldFrame: true,
      weeksWon: 1,
    })
    const profile = await repo.profiles.get(a.id)
    // +300 and the „Седмичник“ tier (+50).
    expect(profile?.xp).toBe(xpBefore + 300 + 50)
    // The frame lasts until the end of week 45: Monday 9 Nov 00:00 Sofia.
    expect(profile?.goldFrameUntil).toBe(Date.parse('2026-11-08T22:00:00Z'))
    expect((await repo.profiles.get(b.id))?.xp).toBe(lostXpBefore)
    expect((await overview(app, b.token)).award).toMatchObject({
      place: null,
      won: false,
      xp: 0,
      goldFrame: false,
    })
    expect((await repo.badges.listOf(a.id)).find((x) => x.key === 'weekly')).toMatchObject({
      tier: 1,
      progress: 1,
    })

    const me = MeDto.parse((await json(await call(app, a.token, 'GET', '/api/me'))).data)
    expect(me.goldFrame).toBe(true)

    // Seen once: the modal does not come back.
    expect((await call(app, a.token, 'POST', '/api/weekly/award/seen')).status).toBe(200)
    expect((await overview(app, a.token)).award).toBeNull()
    expect((await repo.profiles.get(a.id))?.xp).toBe(xpBefore + 350)
    const board = WeeklyBoardDto.parse(
      (await json(await call(app, a.token, 'GET', `/api/weekly/${WEEK}/board`))).data,
    )
    expect(board.finalized).toBe(true)
  })

  it('finalises a week even when two runs race (the repo decides once)', async () => {
    const { app, repo, set } = setup()
    const a = await user(repo, 'a')
    await winWith(app, repo, a.token, 0)
    const before = (await repo.profiles.get(a.id))?.xp ?? 0
    set(WEEK_END)
    const [x, y] = await Promise.all([
      finalizeDueWeeks(repo, WEEK_END),
      finalizeDueWeeks(repo, WEEK_END),
    ])
    expect([...(x ?? []), ...(y ?? [])]).toEqual([WEEK])
    expect(((await repo.profiles.get(a.id))?.xp ?? 0) - before).toBe(350)
  })
})
