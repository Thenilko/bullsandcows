import { describe, expect, it, vi } from 'vitest'
import { createFakeAuth } from '../adapters/auth/fake'
import { createMemoryRepo } from '../adapters/repo/memory'
import { GUEST_RETENTION_MS, purgeInactiveGuests } from './guestCleanup'

const YEAR = GUEST_RETENTION_MS

function setup() {
  let now = 1_000
  const clock = { now: () => now }
  const repo = { ...createMemoryRepo(clock), close: async () => undefined }
  const auth = createFakeAuth(clock)
  const at = (t: number) => {
    now = t
  }
  const guest = (id: string) =>
    repo.profiles.create({ id, username: `guest-${id}`, email: null, isGuest: true })
  const play = (userId: string) =>
    repo.games.create({
      userId,
      kind: 'free',
      len: 4,
      zero: false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })
  return { repo, auth, at, guest, play }
}

describe('purgeInactiveGuests', () => {
  it('deletes guests idle for 12 months with their games, and keeps the rest', async () => {
    const { repo, auth, at, guest, play } = setup()
    await guest('idle')
    const idleGame = await play('idle')
    await guest('active')
    await repo.profiles.create({
      id: 'member',
      username: 'Mira',
      email: 'm@example.com',
      isGuest: false,
    })
    at(YEAR - 10)
    await play('active')
    at(YEAR + 5_000)
    await guest('young')

    const result = await purgeInactiveGuests(repo, auth, YEAR + 5_000)

    expect(result).toEqual({ deleted: 1, authFailures: 0 })
    expect(await repo.profiles.get('idle')).toBeNull()
    expect(await repo.games.get(idleGame.id)).toBeNull()
    for (const id of ['active', 'member', 'young'])
      expect(await repo.profiles.get(id)).not.toBeNull()
  })

  it('removes the auth users and counts the ones that fail', async () => {
    const { repo, auth, guest } = setup()
    await guest('a')
    await guest('b')
    const deleteUser = vi.spyOn(auth, 'deleteUser').mockRejectedValueOnce(new Error('down'))

    const result = await purgeInactiveGuests(repo, auth, 1_000 + YEAR + 1)

    expect(deleteUser.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'b'])
    expect(result).toEqual({ deleted: 2, authFailures: 1 })
  })
})
