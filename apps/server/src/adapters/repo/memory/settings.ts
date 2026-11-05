import type { SettingsRepo } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

export function memorySettings(store: MemoryStore): SettingsRepo {
  return {
    get: async (key) => (store.settings.has(key) ? copy(store.settings.get(key)) : null),
    put: async (key, value) => {
      store.settings.set(key, copy(value))
    },
    remove: async (key) => {
      store.settings.delete(key)
    },
  }
}
