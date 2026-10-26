import { DEFAULT_RATING } from '@bc/game-core'
import { AppError } from '../../../http/errors'
import type { Clock } from '../../../ports/clock'
import type { NewProfile, Profile, ProfilePatch, ProfilesRepo } from '../../../ports/repo'
import { copy, defined, type MemoryStore } from './store'

const lower = (username: string): string => username.toLowerCase()

export function memoryProfiles(store: MemoryStore, clock: Clock): ProfilesRepo {
  const find = (id: string): Profile => {
    const found = store.profiles.get(id)
    if (!found) throw new AppError('ERR_NOT_FOUND', 404)
    return found
  }

  const assertFree = (username: string, ownerId: string): void => {
    const key = lower(username)
    for (const p of store.profiles.values()) {
      if (p.usernameLower === key && p.id !== ownerId) throw new AppError('ERR_USERNAME_TAKEN', 409)
    }
  }

  const save = (profile: Profile): Profile => {
    store.profiles.set(profile.id, copy(profile))
    return copy(profile)
  }

  return {
    get: async (id) => {
      const found = store.profiles.get(id)
      return found ? copy(found) : null
    },
    getByUsername: async (username) => {
      const key = lower(username)
      const found = [...store.profiles.values()].find((p) => p.usernameLower === key)
      return found ? copy(found) : null
    },
    create: async (input: NewProfile) => {
      assertFree(input.username, input.id)
      if (store.profiles.has(input.id)) throw new AppError('ERR_INPUT', 409)
      return save({
        id: input.id,
        username: input.username,
        usernameLower: lower(input.username),
        email: input.email,
        isGuest: input.isGuest,
        lang: input.lang ?? 'bg',
        sound: input.sound ?? true,
        vibrate: input.vibrate ?? true,
        defaultLen: input.defaultLen ?? 4,
        avatarSpecies: input.avatarSpecies ?? 'bull',
        xp: 0,
        rating: DEFAULT_RATING,
        currentStreak: 0,
        bestStreak: 0,
        streakDate: null,
        progressVersion: 0,
        createdAt: clock.now(),
      })
    },
    update: async (id, patch: ProfilePatch) => {
      const current = find(id)
      if (patch.username !== undefined) assertFree(patch.username, id)
      const username = patch.username ?? current.username
      return save({ ...current, ...defined(patch), username, usernameLower: lower(username) })
    },
    addXp: async (id, xp) => {
      const current = store.profiles.get(id)
      return current ? save({ ...current, xp: current.xp + xp }) : null
    },
    setRating: async (id, rating) => {
      save({ ...find(id), rating: { ...rating } })
    },
    setStreak: async (id, streak) => {
      save({ ...find(id), ...streak })
    },
    setProgressVersion: async (id, version) => {
      save({ ...find(id), progressVersion: version })
    },
  }
}
