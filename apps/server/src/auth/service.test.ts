import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeAuth } from '../adapters/auth/fake'
import { createMemoryRepo } from '../adapters/repo/memory'
import { AppError } from '../http/errors'
import type { AuthPort } from '../ports/auth'
import type { Repo } from '../ports/repo'
import { DistributionCache, StatsService } from '../stats/service'
import { AuthService } from './service'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }
const ORIGIN = 'https://pasishte.example'
const GUEST_NAME = /^guest-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/

let repo: Repo
let auth: AuthPort
let service: AuthService

const build = (r: Repo = repo, a: AuthPort = auth) =>
  new AuthService({
    repo: r,
    auth: a,
    stats: new StatsService({ repo: r, clock, cache: new DistributionCache() }),
    appOrigin: ORIGIN,
  })

beforeEach(() => {
  repo = createMemoryRepo(clock)
  auth = createFakeAuth(clock)
  service = build()
})

const mira = { username: 'Mira', email: 'mira@example.com', password: 'secret1' }

describe('register', () => {
  it('signs up and creates a member profile', async () => {
    const { session, me } = await service.register({ ...mira, lang: 'en' })
    expect(session.user.isGuest).toBe(false)
    expect(me.profile).toMatchObject({ id: session.user.id, username: 'Mira', lang: 'en' })
    expect(me.profile.isGuest).toBe(false)
    expect((await repo.profiles.get(session.user.id))?.email).toBe('mira@example.com')
  })

  it('refuses a username taken in another case before touching auth', async () => {
    await service.register(mira)
    const signUp = vi.spyOn(auth, 'signUp')
    await expect(
      service.register({ username: 'mIRA', email: 'other@example.com', password: 'secret2' }),
    ).rejects.toMatchObject({ code: 'ERR_USERNAME_TAKEN', status: 409 })
    expect(signUp).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  beforeEach(async () => {
    await service.register(mira)
  })

  it('finds the email behind a username and signs in with it', async () => {
    const signIn = vi.spyOn(auth, 'signIn')
    const { session, me } = await service.login({ identifier: 'MIRA', password: 'secret1' })
    expect(signIn).toHaveBeenCalledWith('mira@example.com', 'secret1')
    expect(me.profile.username).toBe('Mira')
    expect(session.user.isGuest).toBe(false)
  })

  it('signs in by email in any case', async () => {
    const signIn = vi.spyOn(auth, 'signIn')
    await service.login({ identifier: 'Mira@Example.com', password: 'secret1' })
    expect(signIn).toHaveBeenCalledWith('mira@example.com', 'secret1')
  })

  it('answers ERR_CREDENTIALS alike for an unknown name and a wrong password', async () => {
    for (const body of [
      { identifier: 'nobody', password: 'secret1' },
      { identifier: 'Mira', password: 'wrong!!' },
      { identifier: 'nobody@example.com', password: 'secret1' },
    ]) {
      await expect(service.login(body)).rejects.toMatchObject({
        code: 'ERR_CREDENTIALS',
        status: 401,
      })
    }
  })

  it('fills a missing email so that the name works for the next login', async () => {
    const outside = await auth.signUp('late@example.com', 'secret1')
    const stats = new StatsService({ repo, clock, cache: new DistributionCache() })
    const created = await stats.me(outside.user)
    expect((await repo.profiles.get(outside.user.id))?.email).toBeNull()
    await service.login({ identifier: 'late@example.com', password: 'secret1' })
    expect((await repo.profiles.get(outside.user.id))?.email).toBe('late@example.com')
    const byName = await service.login({
      identifier: created.profile.username,
      password: 'secret1',
    })
    expect(byName.me.profile.id).toBe(outside.user.id)
  })

  it('creates the profile of an account made outside the app', async () => {
    await auth.signUp('outside@example.com', 'secret1')
    const { me } = await service.login({ identifier: 'outside@example.com', password: 'secret1' })
    expect(me.profile.username).toMatch(/^player-/)
    expect(me.profile.isGuest).toBe(false)
  })
})

describe('guest', () => {
  it('signs in anonymously with a guest-XXXX name', async () => {
    const { session, me } = await service.guest()
    expect(session.user.isGuest).toBe(true)
    expect(me.profile.isGuest).toBe(true)
    expect(me.profile.username).toMatch(GUEST_NAME)
  })

  it('retries a colliding generated name', async () => {
    const create = repo.profiles.create
    let failures = 2
    const flaky: Repo = {
      ...repo,
      profiles: {
        ...repo.profiles,
        create: async (p) => {
          if (failures-- > 0) throw new AppError('ERR_USERNAME_TAKEN', 409)
          return create(p)
        },
      },
    }
    expect((await build(flaky).guest()).me.profile.username).toMatch(GUEST_NAME)
    failures = 99
    await expect(build(flaky).guest()).rejects.toMatchObject({ code: 'ERR_USERNAME_TAKEN' })
  })
})

describe('upgrade', () => {
  it('turns a guest into a member and returns a fresh member session', async () => {
    const { session } = await service.guest()
    await repo.profiles.addXp(session.user.id, 400)
    const upgraded = await service.upgrade(session.user, mira)
    expect(upgraded.session.user).toEqual({ id: session.user.id, isGuest: false })
    expect(upgraded.session.accessToken).not.toBe(session.accessToken)
    expect(upgraded.me.profile).toMatchObject({ username: 'Mira', isGuest: false })
    expect(upgraded.me.xp).toBe(400)
    expect((await repo.profiles.get(session.user.id))?.email).toBe('mira@example.com')
  })

  it('refuses a second upgrade with the old guest token', async () => {
    const { session } = await service.guest()
    await service.upgrade(session.user, mira)
    const upgrade = vi.spyOn(auth, 'upgrade')
    const takeover = { username: 'Thief', email: 'thief@example.com', password: 'stolen1' }
    await expect(service.upgrade(session.user, takeover)).rejects.toMatchObject({
      code: 'ERR_INPUT',
      status: 400,
    })
    expect(upgrade).not.toHaveBeenCalled()
    expect((await repo.profiles.get(session.user.id))?.email).toBe('mira@example.com')
  })

  it('is only for guests', async () => {
    const { session } = await service.register(mira)
    await expect(service.upgrade(session.user, mira)).rejects.toMatchObject({
      code: 'ERR_INPUT',
      status: 400,
    })
  })

  it('refuses a taken username', async () => {
    await service.register(mira)
    const { session } = await service.guest()
    const upgrade = vi.spyOn(auth, 'upgrade')
    await expect(
      service.upgrade(session.user, { ...mira, username: 'MIRA', email: 'g@example.com' }),
    ).rejects.toMatchObject({ code: 'ERR_USERNAME_TAKEN' })
    expect(upgrade).not.toHaveBeenCalled()
  })
})

describe('reset', () => {
  it('requests a reset link to the app and always reports sent', async () => {
    const requestReset = vi.spyOn(auth, 'requestReset')
    expect(await service.reset({ email: 'nobody@example.com' })).toEqual({ sent: true })
    expect(requestReset).toHaveBeenCalledWith('nobody@example.com', `${ORIGIN}/reset`)
  })

  it('hides client errors and throttling (both could reveal an account), not outages', async () => {
    const failing = (code: 'ERR_INPUT' | 'ERR_RATE_LIMIT' | 'ERR_INTERNAL'): AuthPort => ({
      ...auth,
      requestReset: async () => {
        throw new AppError(code, code === 'ERR_INTERNAL' ? 502 : 400)
      },
    })
    for (const code of ['ERR_INPUT', 'ERR_RATE_LIMIT'] as const) {
      expect(await build(repo, failing(code)).reset({ email: 'a@b.cd' })).toEqual({ sent: true })
    }
    await expect(
      build(repo, failing('ERR_INTERNAL')).reset({ email: 'a@b.cd' }),
    ).rejects.toMatchObject({ code: 'ERR_INTERNAL' })
  })
})
