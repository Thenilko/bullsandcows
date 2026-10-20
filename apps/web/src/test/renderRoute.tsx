import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { renderWithI18n } from './render'

export interface RouteOptions {
  /** Route pattern, e.g. `/result/:gameId`. */
  path: string
  /** Concrete location, e.g. `/result/g1`. */
  at: string
}

/** Renders a screen under a router and a fresh query cache (no retries). */
export function renderRoute(ui: ReactElement, { path, at }: RouteOptions): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
