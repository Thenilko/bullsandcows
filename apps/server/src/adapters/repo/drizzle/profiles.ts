import { eq, sql } from 'drizzle-orm'
import { AppError } from '../../../http/errors'
import type { ProfilePatch, ProfilesRepo } from '../../../ports/repo'
import type { Db } from './client'
import { isUniqueViolation, required } from './errors'
import { toProfile } from './mappers'
import { profiles } from './schema'

const USERNAME_INDEX = 'profiles_username_lower_idx'
const PRIMARY_KEY = 'profiles_pkey'

function patchColumns(patch: ProfilePatch): Partial<typeof profiles.$inferInsert> {
  return patch.username === undefined
    ? { ...patch }
    : { ...patch, usernameLower: patch.username.toLowerCase() }
}

async function guardUsername<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (isUniqueViolation(err, USERNAME_INDEX)) throw new AppError('ERR_USERNAME_TAKEN', 409)
    if (isUniqueViolation(err, PRIMARY_KEY)) throw new AppError('ERR_INPUT', 409)
    throw err
  }
}

export function drizzleProfiles(db: Db): ProfilesRepo {
  return {
    get: async (id) => {
      const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
      return row ? toProfile(row) : null
    },
    getByUsername: async (username) => {
      const key = username.toLowerCase()
      const [row] = await db.select().from(profiles).where(eq(profiles.usernameLower, key)).limit(1)
      return row ? toProfile(row) : null
    },
    create: (input) =>
      guardUsername(async () => {
        const values = { ...input, usernameLower: input.username.toLowerCase() }
        const [row] = await db.insert(profiles).values(values).returning()
        return toProfile(required(row))
      }),
    update: (id, patch) =>
      guardUsername(async () => {
        const columns = patchColumns(patch)
        if (!Object.values(columns).some((v) => v !== undefined)) {
          const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)
          return toProfile(required(row))
        }
        const [row] = await db.update(profiles).set(columns).where(eq(profiles.id, id)).returning()
        return toProfile(required(row))
      }),
    addXp: async (id, xp) => {
      const [row] = await db
        .update(profiles)
        .set({ xp: sql`${profiles.xp} + ${xp}` })
        .where(eq(profiles.id, id))
        .returning()
      return row ? toProfile(row) : null
    },
    setRating: async (id, r) => {
      const rows = await db
        .update(profiles)
        .set({ rating: r.rating, ratingDev: r.rd, volatility: r.vol })
        .where(eq(profiles.id, id))
        .returning({ id: profiles.id })
      required(rows[0])
    },
  }
}
