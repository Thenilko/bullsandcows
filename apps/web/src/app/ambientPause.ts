/** Input-free time after which the pasture's ambient loops freeze (clouds, fog, sun rays, tails…). */
export const AMBIENT_IDLE_MS = 20_000

const INPUT_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

/**
 * A puzzle is mostly thinking time, and any looping animation makes the phone draw a new frame on every
 * refresh (60–120 per second) for as long as the screen is on. After `AMBIENT_IDLE_MS` without input this
 * sets `data-ambient="paused"` on <html>, which pauses the ambient loops in place (pasishte.css); the next
 * touch, click or key lets them run again. One-shot motion (the herd, toasts, status indicators) is untouched.
 */
export function startAmbientPause(root: HTMLElement = document.documentElement): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const pause = () => {
    root.dataset.ambient = 'paused'
  }
  const wake = () => {
    if (root.dataset.ambient) delete root.dataset.ambient
    if (timer) clearTimeout(timer)
    timer = setTimeout(pause, AMBIENT_IDLE_MS)
  }

  for (const type of INPUT_EVENTS) window.addEventListener(type, wake, { passive: true, capture: true })
  wake()

  return () => {
    for (const type of INPUT_EVENTS) window.removeEventListener(type, wake, { capture: true })
    if (timer) clearTimeout(timer)
    delete root.dataset.ambient
  }
}
