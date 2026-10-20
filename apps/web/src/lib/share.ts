export type ShareOutcome = 'shared' | 'copied' | 'failed'

/** Native share sheet when available, otherwise the clipboard. Never throws. */
export async function shareText(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text })
      return 'shared'
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
