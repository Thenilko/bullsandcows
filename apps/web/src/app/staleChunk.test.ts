import { describe, expect, it, vi } from 'vitest'
import { RELOAD_WINDOW_MS, installStaleChunkReload, shouldReload } from './staleChunk'

describe('shouldReload', () => {
  it('reloads when there was no recent reload, not within the window', () => {
    expect(shouldReload(1_000_000, null)).toBe(true)
    expect(shouldReload(1_000_000, 'garbage')).toBe(true)
    expect(shouldReload(1_000_000, String(1_000_000 - RELOAD_WINDOW_MS + 1))).toBe(false)
    expect(shouldReload(1_000_000, String(1_000_000 - RELOAD_WINDOW_MS))).toBe(true)
  })
})

function fakeWindow(stored: string | null) {
  const listeners: Record<string, (e: Event) => void> = {}
  const store = new Map<string, string>()
  if (stored !== null) store.set('ps-stale-reload', stored)
  const reload = vi.fn()
  const win = {
    addEventListener: (type: string, fn: (e: Event) => void) => {
      listeners[type] = fn
    },
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
    location: { reload },
  } as unknown as Window
  return { win, listeners, reload, store }
}

describe('installStaleChunkReload', () => {
  it('reloads once on vite:preloadError and remembers it', () => {
    const { win, listeners, reload, store } = fakeWindow(null)
    installStaleChunkReload(win)
    const event = new Event('vite:preloadError', { cancelable: true })
    listeners['vite:preloadError']!(event)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    expect(store.get('ps-stale-reload')).toMatch(/^\d+$/)
  })

  it('lets the error through when it just reloaded', () => {
    const { win, listeners, reload } = fakeWindow(String(Date.now()))
    installStaleChunkReload(win)
    const event = new Event('vite:preloadError', { cancelable: true })
    listeners['vite:preloadError']!(event)
    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })
})
