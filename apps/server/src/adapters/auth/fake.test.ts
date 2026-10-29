import { describe, expect, it } from 'vitest'
import { AppError } from '../../http/errors'
import { createFakeAuth, FAKE_ADMIN_EMAIL } from './fake'

const clock = { now: () => 1_700_000_000_000 }

describe('fake auth', () => {
  it('verifies a member token', async () => {
    const auth = createFakeAuth(clock)
    expect(await auth.verify('fake:u1:Mira')).toEqual({ id: 'u1', isGuest: false })
  })

  it('verifies a guest token', async () => {
    const auth = createFakeAuth(clock)
    expect(await auth.verify('fake:u2:g:guest')).toEqual({ id: 'u2', isGuest: true })
  })

  it('rejects anything else', async () => {
    const auth = createFakeAuth(clock)
    for (const token of [
      'nonsense',
      'fake:',
      'fake:u1',
      'fake::Mira',
      'fake:u1:Mira:root',
      'fake:u1:Mira:admin:guest',
      'real:u1:Mira',
    ]) {
      expect(await auth.verify(token), token).toBeNull()
    }
  })

  it('makes the dev admin account an admin, and nobody else', async () => {
    const auth = createFakeAuth(clock)
    const admin = await auth.signUp(FAKE_ADMIN_EMAIL, 'secret-pass')
    expect(admin.user).toEqual({ id: admin.user.id, isGuest: false, isAdmin: true })
    expect(await auth.verify(admin.accessToken)).toEqual(admin.user)
    expect((await auth.signIn(FAKE_ADMIN_EMAIL, 'secret-pass')).user.isAdmin).toBe(true)
    expect((await auth.signUp('mira@example.com', 'secret-pass')).user.isAdmin).toBeUndefined()
  })

  it('signs up and signs in with the same credentials', async () => {
    const auth = createFakeAuth(clock)
    const up = await auth.signUp('mira@example.com', 'secret-pass')
    expect(up.user.isGuest).toBe(false)
    expect(await auth.verify(up.accessToken)).toEqual(up.user)
    const back = await auth.signIn('mira@example.com', 'secret-pass')
    expect(back.user.id).toBe(up.user.id)
    expect(back.expiresAt).toBe(1_700_000_000 + 3600)
  })

  it('rejects a wrong password or unknown email', async () => {
    const auth = createFakeAuth(clock)
    await auth.signUp('mira@example.com', 'secret-pass')
    await expect(auth.signIn('mira@example.com', 'nope')).rejects.toMatchObject({
      code: 'ERR_CREDENTIALS',
      status: 401,
    })
    await expect(auth.signIn('who@example.com', 'secret-pass')).rejects.toBeInstanceOf(AppError)
  })

  it('creates guests with a verifiable guest token', async () => {
    const auth = createFakeAuth(clock)
    const guest = await auth.signInGuest()
    expect(guest.user.isGuest).toBe(true)
    expect(guest.accessToken).toMatch(/^fake:[0-9a-f-]{36}:guest-[A-Z2-9]{4}:guest$/)
    expect(await auth.verify(guest.accessToken)).toEqual(guest.user)
  })

  it('lets an upgraded guest sign in with email and password', async () => {
    const auth = createFakeAuth(clock)
    const guest = await auth.signInGuest()
    await auth.upgrade(guest.user.id, 'g@example.com', 'secret-pass')
    const session = await auth.signIn('g@example.com', 'secret-pass')
    expect(session.user).toEqual({ id: guest.user.id, isGuest: false })
    await expect(
      auth.requestReset('g@example.com', 'http://127.0.0.1:5173/reset'),
    ).resolves.toBeUndefined()
  })
})
