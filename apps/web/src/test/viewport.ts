/**
 * Evaluates the `(min-width: Npx)` / `(min-height: Npx)` conditions of a query against a fixed viewport; any
 * other query (reduced motion) is false.
 */
function matches(query: string, width: number, height: number): boolean {
  const minW = /min-width:\s*(\d+)px/.exec(query)
  const minH = /min-height:\s*(\d+)px/.exec(query)
  if (!minW && !minH) return false
  return (!minW || width >= Number(minW[1])) && (!minH || height >= Number(minH[1]))
}

/** Installs a `matchMedia` that answers for one viewport: 1440×900 is the immersive desktop, 1280×768 the split one. */
export function mockViewport(width: number, height: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches(query, width, height),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

export function resetViewport(): void {
  Reflect.deleteProperty(window, 'matchMedia')
}

export const IMMERSIVE = [1440, 900] as const
export const SPLIT = [1280, 768] as const
