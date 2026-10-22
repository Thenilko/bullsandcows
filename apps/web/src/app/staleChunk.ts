/**
 * After a deploy a page that is still open holds links to chunks (`/assets/*-<hash>.js`) the
 * server no longer has, so the next lazy route fails to load. Vite reports that as
 * `vite:preloadError`; the cure is one fresh load of the page, which brings the new chunk list.
 */
const KEY = 'ps-stale-reload'
/** Reloads at most once per this window, so a broken chunk can never loop the page. */
export const RELOAD_WINDOW_MS = 60_000

export function shouldReload(now: number, last: string | null): boolean {
  const at = last === null ? Number.NaN : Number(last)
  return !(Number.isFinite(at) && now - at < RELOAD_WINDOW_MS)
}

export function installStaleChunkReload(win: Window = window): void {
  win.addEventListener('vite:preloadError', (event) => {
    let last: string | null = null
    try {
      last = win.sessionStorage.getItem(KEY)
    } catch {
      last = null
    }
    if (!shouldReload(Date.now(), last)) return
    try {
      win.sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // Private mode or blocked storage: still reload once; the error page catches a second failure.
    }
    event.preventDefault()
    win.location.reload()
  })
}
