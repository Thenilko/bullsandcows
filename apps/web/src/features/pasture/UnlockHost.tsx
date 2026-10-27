import type { PastureKey } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../auth/session'
import { api } from '../auth/client'
import { useBadgeToasts } from '../badges/toastStore'
import { asPastureDto, togglePatch } from './pastureModel'
import { PASTURE_KEY, useUpdatePasture } from './usePasture'
import { useUnlocks } from './unlockStore'
import { UnlockModal } from './UnlockModal'

export interface UnlockHostProps {
  /** „Избери цвят“ of the barn colour leads to „Твоето пасище“ (the host lives outside the router). */
  onOpenPasture(): void
}

/**
 * Shows the queued new rewards one after another (`useUnlocks`), once the „Нова значка!“ toasts are through.
 * A new reward is in the pasture already (shown by default): „Сложи го“ keeps it there, „По-късно“ hides it
 * until the player switches it on in „Твоето пасище“.
 */
export function UnlockHost({ onOpenPasture }: UnlockHostProps) {
  const qc = useQueryClient()
  const item = useUnlocks((s) => s.queue[0] ?? null)
  const toastsPending = useBadgeToasts((s) => s.queue.length > 0)
  const level = useSession((s) => s.me?.level ?? 1)
  const update = useUpdatePasture()
  if (!item || toastsPending) return null

  async function setShown(key: PastureKey, show: boolean) {
    const view = await qc.fetchQuery({ queryKey: PASTURE_KEY, queryFn: async () => asPastureDto(await api.get<unknown>('/api/me/pasture')) })
    const shown = view.items.find((i) => i.key === key)?.shown ?? false
    if (shown !== show) update.mutate(togglePatch(view, key, show))
  }

  function done(show: boolean) {
    const key = item
    useUnlocks.getState().next()
    if (!key) return
    if (key === 'barnColor') {
      if (show) onOpenPasture()
      return
    }
    void setShown(key, show).catch(() => undefined)
  }

  return <UnlockModal key={item} item={item} level={level} onPut={() => done(true)} onLater={() => done(false)} />
}
