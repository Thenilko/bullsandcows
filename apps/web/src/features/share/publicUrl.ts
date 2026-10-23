/** `VITE_PUBLIC_URL` (the address in the shared text), or where the app runs; never a trailing slash. */
export function publicUrl(): string {
  const env: unknown = import.meta.env.VITE_PUBLIC_URL
  const base = typeof env === 'string' && env.trim() !== '' ? env.trim() : window.location.origin
  return base.replace(/\/+$/, '')
}
