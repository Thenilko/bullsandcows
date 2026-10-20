export function buzz(pattern: number | number[], enabled: boolean): void {
  if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // vibration is optional
    }
  }
}
