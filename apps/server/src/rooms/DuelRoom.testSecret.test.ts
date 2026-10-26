import { runInDurableObject } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoomOpts } from '../duel/roomClient'
import { COUNTDOWN_MS, type Secrets } from '../duel/types'
import type { DuelRoom } from './DuelRoom'
import {
  RACE,
  alarmAt,
  cleanup,
  connect,
  got,
  last,
  member,
  rooms,
  send,
  startRace,
  storage,
  stubOf,
  track,
  until,
  useClock,
  FAR_FUTURE,
  type Setup,
} from './duelRoom.testkit'

afterEach(cleanup)

const SECRET = '1234'

/** Like the kit's `setup`, with seams pinned before `/create`: rng → 0.5, test secrets on/off. */
async function setupWith(opts: RoomOpts, allowTestSecret: boolean): Promise<Setup> {
  const room = rooms.fresh()
  const stub = stubOf(room)
  const clock = { t: FAR_FUTURE }
  await useClock(stub, clock)
  await runInDurableObject(stub, (instance: DuelRoom) => {
    vi.spyOn(instance, 'rng').mockImplementation(() => 0.5)
    vi.spyOn(instance, 'acceptsTestSecret').mockImplementation(() => allowTestSecret)
  })
  const a = await member('anna')
  const b = await member('boris')
  const { token: ta } = await room.create({ opts, host: a.info })
  const { token: tb } = await room.join({ info: b.info })
  return track({ room, stub, clock, a, b, ta, tb })
}

describe('DuelRoom test secret (dev/test E2E)', () => {
  it('uses the test secret as the race secret, so guessing it solves', async () => {
    const s = await setupWith({ ...RACE, opponentKind: 'human', testSecret: SECRET }, true)
    const info = await s.room.info()
    expect(JSON.stringify(info)).not.toContain('testSecret')
    const { ca, secret } = await startRace(s)
    expect(secret).toBe(SECRET)
    expect(last(ca, 'state')?.state.secrets).toBeFalsy()
    await send(ca, { t: 'guess', code: SECRET })
    await got(ca, 'ended')
    expect(last(ca, 'ended')?.outcome).toBe('win')
    expect(JSON.stringify(last(ca, 'state')?.state)).not.toContain('testSecret')
  })

  it('ignores the test secret where the environment does not allow it', async () => {
    const s = await setupWith({ ...RACE, opponentKind: 'human', testSecret: SECRET }, false)
    const { secret } = await startRace(s)
    expect(secret).not.toBe(SECRET)
  })

  it('gives the bot the test secret in a classic bot room', async () => {
    const room = rooms.fresh()
    const stub = stubOf(room)
    const clock = { t: FAR_FUTURE }
    await useClock(stub, clock)
    const human = await member('human')
    const opts: RoomOpts = { format: 'classic', len: 4, zero: false, opponentKind: 'bot', botLevel: 1, testSecret: SECRET }
    const { token } = await room.create({ opts, host: human.info })
    const c = await connect(room.id, token, human)
    track({ stub })
    await send(c, { t: 'ready' })
    await until(() => last(c, 'state')?.state.phase === 'secrets', 2000, 'the secrets phase')
    await send(c, { t: 'secret', code: '5678' })
    await got(c, 'countdown')
    const secrets = await storage<Secrets>(stub, 'secrets')
    expect(secrets?.b).toBe(SECRET)
    await alarmAt({ stub, clock }, clock.t + COUNTDOWN_MS)
    await got(c, 'started')
  })

  it('rejects a test secret that is not a valid code for the settings', async () => {
    const room = rooms.fresh()
    const host = await member('host')
    await expect(room.create({ opts: { ...RACE, testSecret: '1123' }, host: host.info })).rejects.toThrow()
  })
})
