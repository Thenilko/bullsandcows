import { useState } from 'react'
import { useSession } from '../auth/session'
import { sfx } from '../../lib/sfx'
import { useUpdateSettings } from './useUpdateSettings'

/** Sound on/off: the profile setting for members, a local flag for guests. */
export function useSoundToggle(): { muted: boolean; toggle(): void } {
  const [localMuted, setLocalMuted] = useState(() => sfx.isMuted())
  const me = useSession((s) => s.me)
  const update = useUpdateSettings()
  const muted = me ? !me.profile.sound : localMuted
  function toggle() {
    if (me) {
      update.mutate({ sound: muted })
      return
    }
    sfx.setMuted(!muted)
    setLocalMuted(!muted)
  }
  return { muted, toggle }
}
