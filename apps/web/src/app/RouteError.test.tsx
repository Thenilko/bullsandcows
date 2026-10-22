import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../test/render'
import { isStaleChunkError, RouteError } from './RouteError'

function show(error: unknown) {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteError />,
        children: [
          {
            path: '/',
            loader: () => {
              throw error
            },
            element: <p>never</p>,
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  return renderWithI18n(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  it('explains a chunk of an older deploy and offers a reload', async () => {
    show(new TypeError('Failed to fetch dynamically imported module: https://x/assets/DuelSetup-abc.js'))
    expect(await screen.findByRole('heading', { name: 'Нещо се обърка' })).toBeInTheDocument()
    expect(screen.getByText(/Играта е обновена/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Презареди' })).toBeInTheDocument()
  })

  it('shows the generic text for any other error', async () => {
    show(new Error('boom'))
    expect(await screen.findByText(/Страницата не можа да се покаже/)).toBeInTheDocument()
  })
})

describe('isStaleChunkError', () => {
  it('recognises the browsers’ dynamic import failures only', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: x'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('boom'))).toBe(false)
    expect(isStaleChunkError('Failed to fetch')).toBe(false)
  })
})
