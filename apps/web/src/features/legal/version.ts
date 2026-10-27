declare const __APP_VERSION__: string | undefined
declare const __APP_COMMIT__: string | undefined

/** Set by Vite `define` at build time (root package.json version and the short commit); `dev` otherwise. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
export const APP_COMMIT: string = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : ''

export function versionLabel(): string {
  return APP_COMMIT ? `v${APP_VERSION} · ${APP_COMMIT}` : `v${APP_VERSION}`
}
