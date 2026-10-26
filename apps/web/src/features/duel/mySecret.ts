const key = (roomId: string): string => `bc.mySecret.${roomId}`

/** The server never returns my classic secret, so it is kept for display after a reload. */
export function saveMySecret(roomId: string, code: string): void {
  try {
    sessionStorage.setItem(key(roomId), code)
  } catch {
    // display only
  }
}

export function readMySecret(roomId: string): string {
  try {
    return sessionStorage.getItem(key(roomId)) ?? ''
  } catch {
    return ''
  }
}

export function clearMySecret(roomId: string): void {
  try {
    sessionStorage.removeItem(key(roomId))
  } catch {
    // nothing to clear
  }
}
