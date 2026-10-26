import type { ShareChannel } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../lib/sound'
import { useBadgeToasts } from '../badges/toastStore'
import { invalidatePasture } from '../pasture/usePasture'
import { useUnlocks } from '../pasture/unlockStore'
import { invalidateBadges } from '../stats/useBadges'
import { postShare } from './api'
import type { ShareLabels } from './shareLabels'
import type { ShareModel } from './shareModel'
import { renderSharePng } from './sharePng'

export type ShareNoticeKind = 'copied' | 'saved' | 'failed'

export interface ShareNotice {
  readonly kind: ShareNoticeKind
  /** Changes with every notice, so the same message animates again. */
  readonly tick: number
}

export interface ShareActions {
  readonly notice: ShareNotice | null
  /** Native share with the picture, or with the text, or the clipboard (spec A §5). */
  share(): Promise<void>
  copy(): Promise<void>
  save(): Promise<void>
}

/** How long the „Копирано!“ / „Запазено!“ toast stays. */
export const NOTICE_MS = 2800
const REVOKE_MS = 10_000

const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'

function useNotice(): [ShareNotice | null, (kind: ShareNoticeKind) => void] {
  const [notice, setNotice] = useState<ShareNotice | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const show = useCallback((kind: ShareNoticeKind) => {
    setNotice((n) => ({ kind, tick: (n?.tick ?? 0) + 1 }))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }, [])
  return [notice, show]
}

/** Starts a browser download of the blob under `fileName`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS)
}

/** The actions of the share sheet; every successful one reports the channel (the server dedupes per game). */
export function useShare(model: ShareModel, labels: ShareLabels): ShareActions {
  const qc = useQueryClient()
  const [notice, show] = useNotice()
  const png = useRef<Promise<Blob> | null>(null)

  const picture = useCallback((): Promise<Blob> => {
    png.current ??= renderSharePng(model, labels).catch((e: unknown) => {
      png.current = null
      throw e
    })
    return png.current
  }, [model, labels])

  const record = useCallback(
    (channel: ShareChannel) => {
      const gameId = model.gameId
      if (gameId === null) return
      // Reporting never gets in the way of the action: any failure (even a thrown one) is dropped.
      void Promise.resolve()
        .then(() => postShare({ gameId, channel }))
        .then((r) => {
          if (!r.counted) return
          invalidateBadges(qc)
          invalidatePasture(qc)
          useBadgeToasts.getState().push(r.newBadges)
          useUnlocks.getState().push(r.newUnlocks)
        })
        .catch(() => undefined)
    },
    [model.gameId, qc],
  )

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(model.text)
      show('copied')
      record('copy')
    } catch {
      show('failed')
    }
  }, [model.text, show, record])

  const share = useCallback(async () => {
    sfx.play('tap')
    if (typeof navigator.share !== 'function') return copy()
    const blob = await picture().catch(() => null)
    const file = blob ? new File([blob], model.fileName, { type: 'image/png' }) : null
    const withFile = file !== null && navigator.canShare?.({ files: [file] }) === true
    try {
      await navigator.share(withFile && file ? { files: [file], text: model.text } : { text: model.text })
      record('native')
    } catch (e) {
      if (!isAbort(e)) await copy()
    }
  }, [copy, picture, model.fileName, model.text, record])

  const save = useCallback(async () => {
    sfx.play('tap')
    try {
      downloadBlob(await picture(), model.fileName)
      show('saved')
      record('image')
    } catch {
      show('failed')
    }
  }, [picture, model.fileName, show, record])

  return { notice, share, copy, save }
}
