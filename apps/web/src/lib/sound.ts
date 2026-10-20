import { sfx } from './sfx'

/** App-wide sound instance; mute state follows `me.profile.sound`. */
export { sfx }

export function syncMuted(soundEnabled: boolean | undefined): void {
  sfx.setMuted(soundEnabled === false)
}
