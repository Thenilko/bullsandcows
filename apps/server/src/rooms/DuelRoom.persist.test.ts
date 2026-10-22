import { displayRating, inviteCode } from '@bc/game-core'
import { runInDurableObject } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NewDuel, RepoHandle } from '../ports/repo'
import type { DuelRoom } from './DuelRoom'
import {
  type Setup,
  alarmAt,
  cleanup,
  connect,
  gameXp,
  got,
  last,
  repo,
  rooms,
  send,
  setup,
  startRace,
  track,
  until,
} from './duelRoom.testkit'
import { PERSIST_MAX_ATTEMPTS, PERSIST_RETRY_MAX_MS, PERSIST_RETRY_MS } from './state'

afterEach(cleanup)

const CLASSIC_FRIEND = { format: 'classic', len: 4, zero: false, opponentKind: 'human' } as const

/** The shared memory repo with `applyRewards` failing `failures` times (Infinity: always). */
function flakyRepo(failures: number): { handle: RepoHandle; calls: () => number } {
  let calls = 0
  const handle: RepoHandle = {
    ...repo,
    duels: {
      ...repo.duels,
      applyRewards: async (id, rewards) => {
        calls += 1
        if (calls <= failures) throw new Error('db down')
        return repo.duels.applyRewards(id, rewards)
      },
    },
    close: async () => undefined,
  }
  return { handle, calls: () => calls }
}

async function useRepo(s: Pick<Setup, 'stub'>, handle: RepoHandle): Promise<() => number> {
  let opened = 0
  await runInDurableObject(s.stub, (instance: DuelRoom) => {
    vi.spyOn(instance, 'repo').mockImplementation(() => {
      opened += 1
      return handle
    })
  })
  return () => opened
}

const pendingKeys = (s: Pick<Setup, 'stub'>) =>
  runInDurableObject(s.stub, async (_i: DuelRoom, state) => [
    ...(await state.storage.list({ prefix: 'pending:' })).keys(),
  ])

const alarmOf = (s: Pick<Setup, 'stub'>) =>
  runInDurableObject(s.stub, (_i: DuelRoom, state) => state.storage.getAlarm())

describe('DuelRoom result retry', () => {
  it('writes one set of rows and credits xp and rating once after a failed write', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const s = track(await setup())
    const flaky = flakyRepo(1)
    await useRepo(s, flaky.handle)
    const { ca, secret } = await startRace(s)
    await send(ca, { t: 'guess', code: secret })
    await got(ca, 'ended')
    await until(() => flaky.calls() === 1, undefined, 'the first write')
    const ended = last(ca, 'ended')!
    expect(await pendingKeys(s)).toHaveLength(1)
    expect((await repo.profiles.get(s.a.info.id))?.xp).toBe(0)
    await alarmAt(s, s.clock.t + PERSIST_RETRY_MS)
    expect(flaky.calls()).toBe(2)
    expect(await pendingKeys(s)).toEqual([])
    const pa = await repo.profiles.get(s.a.info.id)
    expect(await gameXp(s.a.info.id)).toBe(120)
    expect(await gameXp(s.b.info.id)).toBe(40)
    expect(displayRating(pa!.rating)).toBe(ended.rating?.to)
    // The first write failed, so the `ended` went out without the badges it would have carried.
    expect(ended.newBadges).toBeUndefined()
    expect(await repo.games.history(s.a.info.id, 5)).toHaveLength(1)
    expect(await repo.games.history(s.b.info.id, 5)).toHaveLength(1)
    expect(logged).toHaveBeenCalledTimes(1)
  })

  it('gives up after the attempt cap and the room stays usable', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const s = track(await setup({ format: 'race', len: 4, zero: false, opponentKind: 'human' }))
    const flaky = flakyRepo(Infinity)
    await useRepo(s, flaky.handle)
    const { ca, cb } = await startRace(s)
    await send(ca, { t: 'giveUp' })
    await until(() => flaky.calls() === 1, undefined, 'the first write')
    for (let i = 0; i < PERSIST_MAX_ATTEMPTS + 2; i += 1) {
      await alarmAt(s, s.clock.t + PERSIST_RETRY_MAX_MS)
    }
    expect(flaky.calls()).toBe(PERSIST_MAX_ATTEMPTS)
    expect(await pendingKeys(s)).toEqual([])
    expect(await alarmOf(s)).toBeNull()
    expect(logged).toHaveBeenCalledTimes(2)
    expect((await repo.profiles.get(s.a.info.id))?.xp).toBe(0)
    await send(cb, { t: 'rematch' })
    await send(ca, { t: 'rematch' })
    await until(() => last(ca, 'state')?.state.phase === 'lobby', undefined, 'the new lobby')
  })
})

describe('DuelRoom invite code', () => {
  it('writes the invite code of the room to the duel row', async () => {
    const code = inviteCode(Math.random)
    const s = track(await setup({ ...CLASSIC_FRIEND }, rooms.invite(code), code))
    const created: NewDuel[] = []
    await useRepo(s, {
      ...repo,
      duels: {
        ...repo.duels,
        create: async (d) => {
          created.push(d)
          return repo.duels.create(d)
        },
      },
    })
    const ca = await connect(s.room.id, s.ta, s.a)
    const cb = await connect(s.room.id, s.tb, s.b)
    await send(ca, { t: 'ready' })
    await send(cb, { t: 'ready' })
    await send(ca, { t: 'giveUp' })
    await until(() => created.length === 1, undefined, 'the duel row')
    expect(created.map((d) => d.inviteCode)).toEqual([code])
  })
})

describe('DuelRoom rematch and the database', () => {
  it('opens the repo only to accept a rematch, not to offer one', async () => {
    const s = track(await setup({ format: 'race', len: 4, zero: false, opponentKind: 'human' }))
    const { ca, cb } = await startRace(s)
    await send(ca, { t: 'giveUp' })
    await got(ca, 'ended')
    await until(async () => (await pendingKeys(s)).length === 0, undefined, 'the result')
    const opened = await useRepo(s, repo)
    await send(cb, { t: 'rematch' })
    await send(cb, { t: 'rematch' })
    expect(opened()).toBe(0)
    await send(ca, { t: 'rematch' })
    await until(() => last(ca, 'state')?.state.phase === 'lobby', undefined, 'the new lobby')
    expect(opened()).toBe(1)
  })
})
