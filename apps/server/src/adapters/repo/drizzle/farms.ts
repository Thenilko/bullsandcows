import { and, asc, count, desc, eq, isNull, ne } from 'drizzle-orm'
import type { FarmMemberRow, FarmRow, FarmsRepo, NudgeRow } from '../../../ports/repo'
import type { Db } from './client'
import { isUniqueViolation } from './errors'
import { farmMembers, farms, nudges } from './schema'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const toFarm = (row: typeof farms.$inferSelect): FarmRow => ({
  ...row,
  createdAt: row.createdAt.getTime(),
})

const toMember = (row: typeof farmMembers.$inferSelect): FarmMemberRow => ({
  ...row,
  joinedAt: row.joinedAt.getTime(),
})

const toNudge = (row: typeof nudges.$inferSelect): NudgeRow => ({
  ...row,
  createdAt: row.createdAt.getTime(),
  readAt: row.readAt ? row.readAt.getTime() : null,
})

/** The farm row locked for the rest of the transaction (joins and leaves of one farm queue behind it). */
async function lockFarm(tx: Tx, farmId: string) {
  const [row] = await tx.select().from(farms).where(eq(farms.id, farmId)).for('update')
  return row ?? null
}

async function membersIn(db: Db | Tx, farmId: string) {
  const rows = await db
    .select()
    .from(farmMembers)
    .where(eq(farmMembers.farmId, farmId))
    .orderBy(asc(farmMembers.joinedAt), asc(farmMembers.userId))
  return rows.map(toMember)
}

export function drizzleFarms(db: Db): FarmsRepo {
  return {
    create: async (input, now) => {
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(farms)
            .values({ ...input, createdAt: new Date(now) })
            .returning()
          if (!row) throw new Error('farms: insert returned nothing')
          await tx
            .insert(farmMembers)
            .values({ farmId: row.id, userId: input.ownerId, joinedAt: new Date(now) })
          return toFarm(row)
        })
      } catch (err) {
        if (isUniqueViolation(err, 'farms_invite_code_idx')) return null
        if (isUniqueViolation(err, 'farm_members_user_idx')) return 'already'
        throw err
      }
    },
    get: async (id) => {
      const [row] = await db.select().from(farms).where(eq(farms.id, id)).limit(1)
      return row ? toFarm(row) : null
    },
    byCode: async (code) => {
      const [row] = await db.select().from(farms).where(eq(farms.inviteCode, code)).limit(1)
      return row ? toFarm(row) : null
    },
    membershipOf: async (userId) => {
      const [row] = await db
        .select({ farm: farms, member: farmMembers })
        .from(farmMembers)
        .innerJoin(farms, eq(farms.id, farmMembers.farmId))
        .where(eq(farmMembers.userId, userId))
        .limit(1)
      return row ? { farm: toFarm(row.farm), member: toMember(row.member) } : null
    },
    members: async (farmId) => membersIn(db, farmId),
    join: async (farmId, userId, max, now) => {
      try {
        return await db.transaction(async (tx) => {
          const farm = await lockFarm(tx, farmId)
          if (!farm) return 'missing' as const
          const [n] = await tx
            .select({ n: count() })
            .from(farmMembers)
            .where(eq(farmMembers.farmId, farmId))
          if ((n?.n ?? 0) >= max) return 'full' as const
          // The unique index on user_id turns a concurrent join elsewhere into `already`.
          await tx
            .insert(farmMembers)
            .values({ farmId, userId, joinedAt: new Date(now), invitedBy: farm.ownerId })
          return 'joined' as const
        })
      } catch (err) {
        if (isUniqueViolation(err, 'farm_members_user_idx')) return 'already'
        throw err
      }
    },
    rename: async (farmId, name) => {
      await db.update(farms).set({ name }).where(eq(farms.id, farmId))
    },
    setCode: async (farmId, code) => {
      try {
        await db.update(farms).set({ inviteCode: code }).where(eq(farms.id, farmId))
        return true
      } catch (err) {
        if (isUniqueViolation(err, 'farms_invite_code_idx')) return false
        throw err
      }
    },
    removeMember: async (farmId, userId) =>
      db.transaction(async (tx) => {
        const farm = await lockFarm(tx, farmId)
        if (!farm || farm.ownerId === userId) return false
        const gone = await tx
          .delete(farmMembers)
          .where(and(eq(farmMembers.farmId, farmId), eq(farmMembers.userId, userId)))
          .returning({ userId: farmMembers.userId })
        return gone.length > 0
      }),
    leave: async (userId) =>
      db.transaction(async (tx) => {
        const [mine] = await tx
          .select({ farmId: farmMembers.farmId })
          .from(farmMembers)
          .where(eq(farmMembers.userId, userId))
        if (!mine) return 'none' as const
        const farm = await lockFarm(tx, mine.farmId)
        if (!farm) return 'none' as const
        const heir = (await membersIn(tx, farm.id)).find((m) => m.userId !== userId)
        if (!heir) {
          await tx.delete(farms).where(eq(farms.id, farm.id))
          return 'deleted' as const
        }
        await tx.delete(farmMembers).where(eq(farmMembers.userId, userId))
        if (farm.ownerId !== userId) return 'left' as const
        await tx.update(farms).set({ ownerId: heir.userId }).where(eq(farms.id, farm.id))
        return 'handed' as const
      }),
    inviteesOf: async (userId) => {
      const rows = await db
        .selectDistinct({ userId: farmMembers.userId })
        .from(farmMembers)
        .where(and(eq(farmMembers.invitedBy, userId), ne(farmMembers.userId, userId)))
      return rows.map((r) => r.userId)
    },
    addNudge: async (from, to, day, now) => {
      const rows = await db
        .insert(nudges)
        .values({ fromUser: from, toUser: to, day, createdAt: new Date(now) })
        .onConflictDoNothing()
        .returning({ day: nudges.day })
      return rows.length > 0
    },
    nudgesFrom: async (from, day) => {
      const rows = await db
        .select()
        .from(nudges)
        .where(and(eq(nudges.fromUser, from), eq(nudges.day, day)))
      return rows.map(toNudge)
    },
    unreadNudgesTo: async (to, day) => {
      const rows = await db
        .select()
        .from(nudges)
        .where(and(eq(nudges.toUser, to), eq(nudges.day, day), isNull(nudges.readAt)))
        .orderBy(desc(nudges.createdAt))
      return rows.map(toNudge)
    },
    markNudgesRead: async (to, day, now) => {
      await db
        .update(nudges)
        .set({ readAt: new Date(now) })
        .where(and(eq(nudges.toUser, to), eq(nudges.day, day), isNull(nudges.readAt)))
    },
  }
}
