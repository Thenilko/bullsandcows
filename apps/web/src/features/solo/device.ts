/** Survives logging out and new guest accounts on this browser (not a private window, not another browser). */
export const DEVICE_KEY = 'bc.device'

/** This browser's random id, created on first use; undefined when storage is blocked. */
export function deviceId(): string | undefined {
  try {
    const known = window.localStorage.getItem(DEVICE_KEY)
    if (known) return known
    const fresh = crypto.randomUUID()
    window.localStorage.setItem(DEVICE_KEY, fresh)
    return fresh
  } catch {
    return undefined
  }
}
