import type { FarmMemberRow, FarmRow, FarmsRepo, NudgeRow } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

const nudgeKey = (from: string, to: string, day: string) => `${from}|${to}|${day}`

const byJoin = (a: FarmMemberRow, b: FarmMemberRow) =>
  a.joinedAt - b.joinedAt || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)

/**
 * The memory twin of the Postgres farms. Every method changes the maps without awaiting in between, so in one
 * isolate a write is as atomic as the database transaction it mirrors.
 */
export function memoryFarms(store: MemoryStore): FarmsRepo {
  const membersOf = (farmId: string): FarmMemberRow[] =>
    [...store.farmMembers.values()].filter((m) => m.farmId === farmId).sort(byJoin)
  const codeTaken = (code: string) => [...store.farms.values()].some((f) => f.inviteCode === code)
  const deleteFarm = (farmId: string) => {
    for (const m of membersOf(farmId)) store.farmMembers.delete(m.userId)
    store.farms.delete(farmId)
  }

  return {
    create: async (input, now) => {
      if (store.farmMembers.has(input.ownerId)) return 'already'
      if (codeTaken(input.inviteCode)) return null
      const farm: FarmRow = { ...input, id: crypto.randomUUID(), createdAt: now }
      store.farms.set(farm.id, farm)
      store.farmMembers.set(input.ownerId, {
        farmId: farm.id,
        userId: input.ownerId,
        joinedAt: now,
        invitedBy: null,
      })
      return copy(farm)
    },
    get: async (id) => {
      const farm = store.farms.get(id)
      return farm ? copy(farm) : null
    },
    byCode: async (code) => {
      const farm = [...store.farms.values()].find((f) => f.inviteCode === code)
      return farm ? copy(farm) : null
    },
    membershipOf: async (userId) => {
      const member = store.farmMembers.get(userId)
      const farm = member ? store.farms.get(member.farmId) : undefined
      return member && farm ? { farm: copy(farm), member: copy(member) } : null
    },
    members: async (farmId) => membersOf(farmId).map(copy),
    join: async (farmId, userId, max, now) => {
      const farm = store.farms.get(farmId)
      if (!farm) return 'missing'
      if (store.farmMembers.has(userId)) return 'already'
      if (membersOf(farmId).length >= max) return 'full'
      store.farmMembers.set(userId, { farmId, userId, joinedAt: now, invitedBy: farm.ownerId })
      return 'joined'
    },
    rename: async (farmId, name) => {
      const farm = store.farms.get(farmId)
      if (farm) store.farms.set(farmId, { ...farm, name })
    },
    setCode: async (farmId, code) => {
      const farm = store.farms.get(farmId)
      if (!farm || codeTaken(code)) return false
      store.farms.set(farmId, { ...farm, inviteCode: code })
      return true
    },
    removeMember: async (farmId, userId) => {
      const farm = store.farms.get(farmId)
      const member = store.farmMembers.get(userId)
      if (!farm || !member || member.farmId !== farmId || farm.ownerId === userId) return false
      store.farmMembers.delete(userId)
      return true
    },
    leave: async (userId) => {
      const member = store.farmMembers.get(userId)
      const farm = member ? store.farms.get(member.farmId) : undefined
      if (!member || !farm) return 'none'
      const others = membersOf(farm.id).filter((m) => m.userId !== userId)
      const heir = others[0]
      if (!heir) {
        deleteFarm(farm.id)
        return 'deleted'
      }
      store.farmMembers.delete(userId)
      if (farm.ownerId !== userId) return 'left'
      store.farms.set(farm.id, { ...farm, ownerId: heir.userId })
      return 'handed'
    },
    inviteesOf: async (userId) => [
      ...new Set(
        [...store.farmMembers.values()].filter((m) => m.invitedBy === userId).map((m) => m.userId),
      ),
    ],
    addNudge: async (from, to, day, now) => {
      const key = nudgeKey(from, to, day)
      if (store.nudges.has(key)) return false
      store.nudges.set(key, { fromUser: from, toUser: to, day, createdAt: now, readAt: null })
      return true
    },
    nudgesFrom: async (from, day) =>
      [...store.nudges.values()].filter((n) => n.fromUser === from && n.day === day).map(copy),
    unreadNudgesTo: async (to, day) =>
      [...store.nudges.values()]
        .filter((n) => n.toUser === to && n.day === day && n.readAt === null)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(copy),
    markNudgesRead: async (to, day, now) => {
      for (const [key, n] of store.nudges) {
        if (n.toUser === to && n.day === day && n.readAt === null) {
          store.nudges.set(key, { ...n, readAt: now } satisfies NudgeRow)
        }
      }
    },
  }
}
